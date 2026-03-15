import { useEffect, useRef, useState } from 'react';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  sendMedia as sendMediaApi,
  getTemplates as getTemplatesApi,
  sendTemplate as sendTemplateApi,
  markAsRead
} from '../../services/whatsapp.service';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import {
  MessageCircle, Send, Search, Phone, ExternalLink,
  Check, CheckCheck, Paperclip, Image, FileText, Mic,
  Video, X, LayoutTemplate
} from 'lucide-react';

const MEDIA_TYPE_LABELS = {
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  document: 'Documento'
};

function WhatsAppPage() {
  const toast = useToast();
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Media attach state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');
  const [sendingMedia, setSendingMedia] = useState(false);

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatePhone, setTemplatePhone] = useState('');
  const [templateParams, setTemplateParams] = useState({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(data) {
      setConversations(prev => {
        const exists = prev.find(c => c.id === data.conversation.id);
        if (exists) {
          return prev
            .map(c => c.id === data.conversation.id ? data.conversation : c)
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        }
        return [data.conversation, ...prev];
      });

      setActiveConversation(current => {
        if (current && current.id === data.conversation.id) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === data.message.id);
            if (exists) return prev;
            return [...prev, data.message];
          });
        }
        return current;
      });
    }

    function handleMessageStatus(data) {
      setMessages(prev =>
        prev.map(m =>
          m.id === data.messageId || m.whatsappMessageId === data.whatsappMessageId
            ? { ...m, status: data.status }
            : m
        )
      );
    }

    socket.on('whatsapp:new_message', handleNewMessage);
    socket.on('whatsapp:message_status', handleMessageStatus);

    return () => {
      socket.off('whatsapp:new_message', handleNewMessage);
      socket.off('whatsapp:message_status', handleMessageStatus);
    };
  }, [socket]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadConversations() {
    try {
      setLoadingConversations(true);
      const result = await getConversations({ limit: 50, search: searchTerm });
      setConversations(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function handleSelectConversation(conv) {
    setActiveConversation(conv);
    setMessages([]);
    setLoadingMessages(true);

    try {
      const result = await getMessages(conv.id, { limit: 50 });
      setMessages(result.data || []);

      if (conv.unreadCount > 0) {
        await markAsRead(conv.id);
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar mensagens.'));
    } finally {
      setLoadingMessages(false);
      inputRef.current?.focus();
    }
  }

  async function handleSend(e) {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading || !activeConversation) return;

    setInput('');
    setLoading(true);

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      type: 'text',
      content: { text },
      direction: 'outbound',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const result = await sendMessageApi(activeConversation.id, text);
      setMessages(prev =>
        prev.map(m => m.id === optimisticMsg.id ? result : m)
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao enviar mensagem.'));
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // --- Media ---

  function handleAttachClick(type) {
    setMediaType(type);
    setMediaUrl('');
    setMediaCaption('');
    setMediaFilename('');
    setShowAttachMenu(false);
    setShowMediaModal(true);
  }

  async function handleSendMedia(e) {
    e.preventDefault();
    if (!mediaUrl.trim() || !activeConversation || sendingMedia) return;

    setSendingMedia(true);

    const optimisticMsg = {
      id: `temp-media-${Date.now()}`,
      conversationId: activeConversation.id,
      type: mediaType,
      content: {
        text: mediaCaption || `[${MEDIA_TYPE_LABELS[mediaType]}]`,
        mediaUrl: mediaUrl,
        caption: mediaCaption,
        filename: mediaFilename
      },
      direction: 'outbound',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setShowMediaModal(false);

    try {
      const result = await sendMediaApi(
        activeConversation.id,
        mediaType,
        mediaUrl,
        mediaCaption,
        mediaFilename
      );
      setMessages(prev =>
        prev.map(m => m.id === optimisticMsg.id ? result : m)
      );
      toast.success(`${MEDIA_TYPE_LABELS[mediaType]} enviado(a) com sucesso!`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao enviar mídia.'));
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSendingMedia(false);
    }
  }

  // --- Templates ---

  async function handleOpenTemplates() {
    setShowTemplateModal(true);
    setSelectedTemplate(null);
    setTemplatePhone(activeConversation?.phoneNumber || '');
    setTemplateParams({});

    if (templates.length === 0) {
      setLoadingTemplates(true);
      try {
        const result = await getTemplatesApi();
        setTemplates(result.data || []);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao carregar templates.'));
      } finally {
        setLoadingTemplates(false);
      }
    }
  }

  function getTemplateVariables(template) {
    const vars = [];
    for (const comp of (template.components || [])) {
      if (comp.type === 'BODY' && comp.text) {
        const matches = comp.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach(m => {
            const num = m.replace(/[{}]/g, '');
            if (!vars.includes(num)) vars.push(num);
          });
        }
      }
    }
    return vars;
  }

  function buildTemplateComponents() {
    if (!selectedTemplate) return null;
    const vars = getTemplateVariables(selectedTemplate);
    if (vars.length === 0) return null;

    return [{
      type: 'body',
      parameters: vars.map(v => ({
        type: 'text',
        text: templateParams[v] || ''
      }))
    }];
  }

  async function handleSendTemplate(e) {
    e.preventDefault();
    if (!selectedTemplate || !templatePhone.trim() || sendingTemplate) return;

    setSendingTemplate(true);
    try {
      const components = buildTemplateComponents();
      await sendTemplateApi(
        templatePhone,
        selectedTemplate.name,
        selectedTemplate.language || 'pt_BR',
        components
      );
      toast.success('Template enviado com sucesso!');
      setShowTemplateModal(false);
      loadConversations();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao enviar template.'));
    } finally {
      setSendingTemplate(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadConversations();
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderStatusIcon(status) {
    switch (status) {
      case 'sent':
        return <Check size={14} className="wa-status-icon wa-status-sent" />;
      case 'delivered':
        return <CheckCheck size={14} className="wa-status-icon wa-status-delivered" />;
      case 'read':
        return <CheckCheck size={14} className="wa-status-icon wa-status-read" />;
      case 'failed':
        return <span className="wa-status-icon wa-status-failed" title="Falhou">!</span>;
      default:
        return null;
    }
  }

  function renderMediaContent(msg) {
    const { type, content } = msg;
    const url = content?.mediaUrl;
    const caption = content?.caption;

    switch (type) {
      case 'image':
        return (
          <div className="wa-media-content">
            {url ? (
              <img src={url} alt={caption || 'Imagem'} className="wa-media-image" />
            ) : (
              <div className="wa-media-placeholder">
                <Image size={32} />
                <span>Imagem</span>
              </div>
            )}
            {caption && <p className="wa-media-caption">{caption}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="wa-media-content">
            {url ? (
              <video src={url} controls className="wa-media-video" />
            ) : (
              <div className="wa-media-placeholder">
                <Video size={32} />
                <span>Vídeo</span>
              </div>
            )}
            {caption && <p className="wa-media-caption">{caption}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="wa-media-content">
            {url ? (
              <audio src={url} controls className="wa-media-audio" />
            ) : (
              <div className="wa-media-placeholder">
                <Mic size={32} />
                <span>Áudio</span>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="wa-media-content">
            <a
              href={url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-media-document"
            >
              <FileText size={24} />
              <span>{content?.filename || 'Documento'}</span>
            </a>
            {caption && <p className="wa-media-caption">{caption}</p>}
          </div>
        );

      case 'template':
        return (
          <div className="wa-media-content wa-template-msg">
            <LayoutTemplate size={16} />
            <span>{content?.text || '[Template]'}</span>
          </div>
        );

      default:
        return null;
    }
  }

  function renderMessageBubble(msg) {
    const isMedia = ['image', 'video', 'audio', 'document', 'template'].includes(msg.type);

    return (
      <div
        key={msg.id}
        className={`chat-bubble ${
          msg.direction === 'inbound'
            ? 'wa-bubble-inbound'
            : 'wa-bubble-outbound'
        }`}
      >
        <div className="chat-bubble-content">
          {isMedia ? (
            renderMediaContent(msg)
          ) : (
            <div className="chat-bubble-text">
              {msg.content?.text || `[${msg.type}]`}
            </div>
          )}
          <div className="wa-bubble-footer">
            <span className="chat-bubble-time">
              {formatMessageTime(msg.createdAt)}
            </span>
            {msg.direction === 'outbound' && renderStatusIcon(msg.status)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>WhatsApp</h3>
          <button
            className="wa-template-header-btn"
            onClick={handleOpenTemplates}
            title="Enviar Template"
          >
            <LayoutTemplate size={18} />
          </button>
        </div>

        <form className="wa-search-form" onSubmit={handleSearch}>
          <div className="wa-search-input-wrapper">
            <Search size={16} className="wa-search-icon" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="wa-search-input"
            />
          </div>
        </form>

        <div className="chat-sidebar-list">
          {loadingConversations ? (
            <p className="chat-sidebar-empty">Carregando...</p>
          ) : conversations.length === 0 ? (
            <p className="chat-sidebar-empty">Nenhuma conversa ainda</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`chat-sidebar-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="wa-conv-avatar">
                  <MessageCircle size={18} />
                </div>
                <div className="wa-conv-info">
                  <div className="wa-conv-top">
                    <span className="wa-conv-name">
                      {conv.contactName || conv.phoneNumber}
                    </span>
                    <span className="wa-conv-time">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="wa-conv-bottom">
                    <span className="wa-conv-preview">
                      {conv.lastMessagePreview || 'Sem mensagens'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="wa-unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-main">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="wa-chat-header">
              <div className="wa-chat-header-info">
                <h3>{activeConversation.contactName || activeConversation.phoneNumber}</h3>
                <span className="wa-chat-header-phone">
                  <Phone size={12} />
                  {activeConversation.phoneNumber}
                </span>
              </div>
              {activeConversation.lead && (
                <a
                  href={`/leads/${activeConversation.lead.id}`}
                  className="wa-chat-header-link"
                  title="Ver Lead"
                >
                  <ExternalLink size={16} />
                  Lead: {activeConversation.lead.name}
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadingMessages ? (
                <div className="chat-welcome">
                  <p>Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-welcome">
                  <MessageCircle size={48} />
                  <h2>Sem mensagens</h2>
                  <p>Envie a primeira mensagem para iniciar a conversa.</p>
                </div>
              ) : (
                messages.map(renderMessageBubble)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-area" onSubmit={handleSend}>
              <div className="wa-attach-wrapper">
                <button
                  type="button"
                  className="wa-attach-btn"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  title="Anexar mídia"
                >
                  <Paperclip size={18} />
                </button>

                {showAttachMenu && (
                  <div className="wa-attach-menu">
                    <button type="button" onClick={() => handleAttachClick('image')}>
                      <Image size={16} /> Imagem
                    </button>
                    <button type="button" onClick={() => handleAttachClick('video')}>
                      <Video size={16} /> Vídeo
                    </button>
                    <button type="button" onClick={() => handleAttachClick('audio')}>
                      <Mic size={16} /> Áudio
                    </button>
                    <button type="button" onClick={() => handleAttachClick('document')}>
                      <FileText size={16} /> Documento
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
              />
              <button
                type="submit"
                className="chat-send-btn wa-send-btn"
                disabled={!input.trim() || loading}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-messages">
            <div className="chat-welcome">
              <MessageCircle size={48} />
              <h2>WhatsApp Business</h2>
              <p>
                Selecione uma conversa para visualizar as mensagens
                ou aguarde novas mensagens chegarem.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Media Modal */}
      {showMediaModal && (
        <div className="wa-modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Enviar {MEDIA_TYPE_LABELS[mediaType]}</h3>
              <button onClick={() => setShowMediaModal(false)} className="wa-modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendMedia} className="wa-modal-body">
              <div className="wa-modal-field">
                <label>URL da mídia *</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://exemplo.com/arquivo.jpg"
                  required
                />
              </div>

              {mediaType === 'document' && (
                <div className="wa-modal-field">
                  <label>Nome do arquivo</label>
                  <input
                    type="text"
                    value={mediaFilename}
                    onChange={(e) => setMediaFilename(e.target.value)}
                    placeholder="relatorio.pdf"
                  />
                </div>
              )}

              {['image', 'video', 'document'].includes(mediaType) && (
                <div className="wa-modal-field">
                  <label>Legenda</label>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Legenda opcional"
                  />
                </div>
              )}

              <div className="wa-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMediaModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary wa-send-btn"
                  disabled={!mediaUrl.trim() || sendingMedia}
                >
                  {sendingMedia ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="wa-modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="wa-modal wa-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Enviar Template (HSM)</h3>
              <button onClick={() => setShowTemplateModal(false)} className="wa-modal-close">
                <X size={18} />
              </button>
            </div>
            <div className="wa-modal-body">
              {loadingTemplates ? (
                <p className="wa-modal-loading">Carregando templates...</p>
              ) : !selectedTemplate ? (
                <>
                  <div className="wa-modal-field">
                    <label>Telefone do destinatário *</label>
                    <input
                      type="text"
                      value={templatePhone}
                      onChange={(e) => setTemplatePhone(e.target.value)}
                      placeholder="5511999999999"
                    />
                  </div>

                  {templates.length === 0 ? (
                    <p className="wa-modal-empty">
                      Nenhum template aprovado encontrado. Configure templates no Meta Business Manager.
                    </p>
                  ) : (
                    <div className="wa-template-list">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id || tpl.name}
                          className="wa-template-item"
                          onClick={() => setSelectedTemplate(tpl)}
                        >
                          <div className="wa-template-item-header">
                            <strong>{tpl.name}</strong>
                            <span className="wa-template-lang">{tpl.language}</span>
                          </div>
                          <span className="wa-template-category">{tpl.category}</span>
                          {tpl.components?.find(c => c.type === 'BODY')?.text && (
                            <p className="wa-template-preview">
                              {tpl.components.find(c => c.type === 'BODY').text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleSendTemplate}>
                  <div className="wa-template-selected">
                    <div className="wa-template-selected-header">
                      <strong>{selectedTemplate.name}</strong>
                      <button
                        type="button"
                        className="wa-template-back"
                        onClick={() => setSelectedTemplate(null)}
                      >
                        Voltar
                      </button>
                    </div>

                    {selectedTemplate.components?.find(c => c.type === 'BODY')?.text && (
                      <div className="wa-template-body-preview">
                        {selectedTemplate.components.find(c => c.type === 'BODY').text}
                      </div>
                    )}

                    {getTemplateVariables(selectedTemplate).length > 0 && (
                      <div className="wa-template-vars">
                        <label>Preencha as variáveis:</label>
                        {getTemplateVariables(selectedTemplate).map((v) => (
                          <div key={v} className="wa-modal-field">
                            <label>{`{{${v}}}`}</label>
                            <input
                              type="text"
                              value={templateParams[v] || ''}
                              onChange={(e) =>
                                setTemplateParams(prev => ({ ...prev, [v]: e.target.value }))
                              }
                              placeholder={`Valor para {{${v}}}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="wa-modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowTemplateModal(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary wa-send-btn"
                      disabled={!templatePhone.trim() || sendingTemplate}
                    >
                      {sendingTemplate ? 'Enviando...' : 'Enviar Template'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppPage;
