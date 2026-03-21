import { useEffect, useRef, useState } from 'react';
import {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment
} from '../../services/attachment.service';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File
} from 'lucide-react';

const ICON_MAP = {
  'image/': Image,
  'application/pdf': FileText,
  'text/': FileText
};

function getFileIcon(mimetype) {
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (mimetype?.startsWith(key)) return Icon;
  }
  return File;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUpload({ entityType, entityId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (entityId) {
      loadAttachments();
    }
  }, [entityType, entityId]);

  async function loadAttachments() {
    try {
      const data = await getAttachments(entityType, entityId);
      setAttachments(data || []);
    } catch {
      // silent
    }
  }

  async function handleUpload(file) {
    if (!file) return;

    try {
      setUploading(true);
      await uploadAttachment(entityType, entityId, file);
      await loadAttachments();
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleDownload(id) {
    downloadAttachment(id);
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este anexo?')) return;

    try {
      await deleteAttachment(id);
      await loadAttachments();
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao remover anexo.');
    }
  }

  return (
    <div>
      <div
        className={`file-upload-zone ${dragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload size={24} style={{ color: 'var(--text-muted)' }} />
        <p>{uploading ? 'Enviando...' : 'Arraste um arquivo ou clique para selecionar'}</p>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {attachments.length > 0 && (
        <div className="file-list">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimetype);
            return (
              <div key={att.id} className="file-item">
                <div className="file-item-info">
                  <Icon size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <span>{att.originalName}</span>
                  <small>{formatFileSize(att.size)}</small>
                </div>
                <div className="file-item-actions">
                  <button onClick={() => handleDownload(att.id)} title="Download">
                    <Download size={16} />
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(att.id)} title="Remover">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
