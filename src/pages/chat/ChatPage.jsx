import { useEffect, useRef, useState } from 'react';
import {
  sendMessage as sendMessageApi,
  getConversations,
  getConversation,
  deleteConversation
} from '../../services/ai.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import { Bot, Send, Plus, Trash2, MessageSquare } from 'lucide-react';

function ChatPage() {
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadConversations() {
    try {
      setLoadingConversations(true);
      const result = await getConversations({ limit: 50 });
      setConversations(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function handleSelectConversation(id) {
    try {
      setActiveConversationId(id);
      setMessages([]);
      const result = await getConversation(id);
      setMessages(result.messages || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar conversa.'));
    }
  }

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    inputRef.current?.focus();
  }

  async function handleDeleteConversation(e, id) {
    e.stopPropagation();

    if (!confirm('Deseja excluir esta conversa?')) {
      return;
    }

    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }

      toast.success('Conversa excluída.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao excluir conversa.'));
    }
  }

  async function handleSend(e) {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendMessageApi(text, activeConversationId);

      setMessages((prev) => [...prev, result.message]);

      if (!activeConversationId) {
        setActiveConversationId(result.conversationId);
        await loadConversations();
      }
    } catch (err) {
      toast.error(
        getErrorMessage(err, 'Erro ao enviar mensagem. Verifique sua conexão.')
      );

      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Conversas</h3>
          <button
            className="chat-new-btn"
            onClick={handleNewConversation}
            title="Nova Conversa"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="chat-sidebar-list">
          {loadingConversations ? (
            <p className="chat-sidebar-empty">Carregando...</p>
          ) : conversations.length === 0 ? (
            <p className="chat-sidebar-empty">Nenhuma conversa ainda</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`chat-sidebar-item ${activeConversationId === conv.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <MessageSquare size={16} />
                <span className="chat-sidebar-item-title">{conv.title}</span>
                <button
                  className="chat-sidebar-item-delete"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && !loading ? (
            <div className="chat-welcome">
              <Bot size={48} />
              <h2>IA Consultiva</h2>
              <p>
                Pergunte sobre seus leads, negócios, metas ou peça
                recomendações para melhorar seus resultados comerciais.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-bubble chat-bubble-${msg.role}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="chat-bubble-avatar">
                    <Bot size={18} />
                  </div>
                ) : null}
                <div className="chat-bubble-content">
                  <div
                    className="chat-bubble-text"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(msg.content)
                    }}
                  />
                  <span className="chat-bubble-time">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}

          {loading ? (
            <div className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-avatar">
                <Bot size={18} />
              </div>
              <div className="chat-bubble-content">
                <div className="chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
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
            className="chat-send-btn"
            disabled={!input.trim() || loading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function formatMarkdown(text) {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';

  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[234]>)/g, '$1');
  html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');

  return html;
}

export default ChatPage;
