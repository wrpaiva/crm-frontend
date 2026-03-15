import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useSocket } from '../../contexts/SocketContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../../services/notification.service';
import {
  Search,
  Bell,
  ChevronDown,
  CheckCheck,
  ShoppingCart,
  Users,
  CalendarCheck,
  MessageCircle,
  Trophy,
  AlertCircle,
  X
} from 'lucide-react';

const ICON_MAP = {
  deal_stage_changed: ShoppingCart,
  deal_won: Trophy,
  deal_lost: ShoppingCart,
  lead_created: Users,
  lead_converted: Users,
  activity_due: CalendarCheck,
  activity_overdue: AlertCircle,
  activity_assigned: CalendarCheck,
  whatsapp_new_message: MessageCircle,
  conversation_assigned: MessageCircle,
  general: Bell
};

const LINK_MAP = {
  deal: '/deals',
  lead: '/leads',
  activity: '/activities',
  conversation: '/whatsapp'
};

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();
  const dropdownRef = useRef(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load unread count on mount
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    function handleNewNotification(data) {
      setNotifications(prev => [data.notification, ...prev].slice(0, 20));
      setUnreadCount(data.unreadCount);
    }

    function handleCountUpdate(data) {
      setUnreadCount(data.unreadCount);
    }

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  async function loadUnreadCount() {
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.unreadCount);
    } catch (err) {
      // silent
    }
  }

  async function loadNotifications() {
    try {
      setLoading(true);
      const result = await getNotifications({ limit: 20 });
      setNotifications(result.data || []);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function handleToggleDropdown() {
    const next = !showDropdown;
    setShowDropdown(next);
    if (next) {
      loadNotifications();
    }
  }

  async function handleMarkAsRead(e, notification) {
    e.stopPropagation();

    if (notification.read) return;

    try {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // silent
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // silent
    }
  }

  function handleClickNotification(notification) {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id).catch(() => {});
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to entity
    if (notification.entityType && notification.entityId) {
      const basePath = LINK_MAP[notification.entityType];
      if (basePath) {
        const path = notification.entityType === 'conversation' || notification.entityType === 'activity'
          ? basePath
          : `${basePath}/${notification.entityId}`;
        navigate(path);
        setShowDropdown(false);
      }
    }
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }

  function handleLogout() {
    logout();
    toast.info('Sessão encerrada.');
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <header className="header">
      <div className="header-search">
        <Search size={18} className="header-search-icon" />
        <input type="text" placeholder="Buscar aqui..." />
      </div>

      <div className="header-actions">
        <div className="notif-wrapper" ref={dropdownRef}>
          <button
            className="header-notification"
            onClick={handleToggleDropdown}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="header-notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notificações</h4>
                <div className="notif-dropdown-actions">
                  {unreadCount > 0 && (
                    <button
                      className="notif-mark-all"
                      onClick={handleMarkAllAsRead}
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    className="notif-close"
                    onClick={() => setShowDropdown(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="notif-dropdown-list">
                {loading ? (
                  <p className="notif-empty">Carregando...</p>
                ) : notifications.length === 0 ? (
                  <p className="notif-empty">Nenhuma notificação</p>
                ) : (
                  notifications.map((n) => {
                    const Icon = ICON_MAP[n.type] || Bell;
                    return (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? '' : 'unread'}`}
                        onClick={() => handleClickNotification(n)}
                      >
                        <div className="notif-item-icon">
                          <Icon size={16} />
                        </div>
                        <div className="notif-item-content">
                          <span className="notif-item-title">{n.title}</span>
                          <span className="notif-item-message">{n.message}</span>
                          <span className="notif-item-time">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        {!n.read && (
                          <button
                            className="notif-item-read-btn"
                            onClick={(e) => handleMarkAsRead(e, n)}
                            title="Marcar como lida"
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button className="header-user" onClick={handleLogout}>
          <div className="header-avatar">
            {initials}
          </div>
          <ChevronDown size={16} className="header-user-chevron" />
        </button>
      </div>
    </header>
  );
}

export default Header;
