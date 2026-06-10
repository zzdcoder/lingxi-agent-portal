import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  LogOut,
} from 'lucide-react';
import type { Conversation } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onNewChat: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  /** 当前登录用户名 */
  username?: string;
  /** 当前登录用户类型 */
  userType?: string;
  /** 退出登录回调 */
  onLogout?: () => void;
}

export function Sidebar({ conversations, activeId, onNewChat, onSwitch, onDelete, username, userType, onLogout }: SidebarProps) {
  // 根据用户类型显示中文标签
  const userTypeLabel = userType === 'manufacturer' ? '厂商用户' : userType === 'mobile' ? '移动用户' : '';
  // 用户名字首字母作为头像
  const userInitial = username ? username.charAt(0).toUpperCase() : 'U';
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 300 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-shrink-0 h-full glass-panel border-r border-surface-700/30 flex flex-col relative z-20 will-change-[width]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700/20 overflow-hidden">
        <div
          className={`flex items-center gap-2.5 transition-all duration-300 ${
            collapsed ? 'opacity-0 w-0 scale-90' : 'opacity-100 w-auto scale-100'
          }`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-semibold text-surface-100 text-sm tracking-tight">灵犀智能助手</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-surface-700/30 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className={`flex items-center rounded-xl bg-primary-600/10 border border-primary-500/20 text-primary-300 hover:bg-primary-600/15 hover:border-primary-500/30 transition-all w-full ${
            collapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-4 py-2.5 gap-3'
          }`}
        >
          <MessageSquarePlus size={18} className="flex-shrink-0" />
          <span
            className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
              collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[200px]'
            }`}
          >
            新对话
          </span>
        </motion.button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <p
          className={`text-[10px] font-medium text-surface-600 uppercase tracking-wider px-3 py-2 whitespace-nowrap overflow-hidden transition-all duration-300 ${
            collapsed ? 'opacity-0 max-h-0 py-0' : 'opacity-100 max-h-10'
          }`}
        >
          最近对话
        </p>

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isHovered = hoveredId === conv.id;

          return (
            <button
              key={conv.id}
              onClick={() => onSwitch(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative flex items-center w-full rounded-xl px-3 py-2.5 transition-colors duration-200 group overflow-hidden ${
                isActive
                  ? 'bg-primary-500/10 border border-primary-500/20 text-primary-200'
                  : 'hover:bg-surface-800/50 text-surface-400 border border-transparent'
              } ${collapsed ? 'justify-center px-2' : 'justify-start gap-3'}`}
            >
              <MessageSquare
                size={16}
                className={`flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-400'}`}
              />

              <div
                className={`text-left min-w-0 overflow-hidden transition-all duration-300 ${
                  collapsed ? 'w-0 opacity-0 pointer-events-none flex-[0_0_0px]' : 'flex-1 opacity-100'
                }`}
              >
                <p className={`text-sm truncate font-medium ${isActive ? 'text-surface-100' : 'text-surface-300'}`}>
                  {conv.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className="text-surface-600 flex-shrink-0" />
                  <span className="text-[10px] text-surface-600">
                    {formatDistanceToNow(conv.updatedAt, { addSuffix: true, locale: zhCN })}
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <div
                className={`flex-shrink-0 transition-all duration-200 ${
                  !collapsed && (isHovered || isActive)
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-75 pointer-events-none w-0 flex-[0_0_0px]'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="p-1 rounded-md text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer：用户信息 + 退出登录 */}
      <div className="p-4 border-t border-surface-700/20 overflow-hidden">
        <div
          className={`flex items-center gap-3 transition-all duration-300 ${
            collapsed ? 'opacity-0 max-h-0' : 'opacity-100 max-h-20'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-surface-200 truncate">{username || '用户'}</p>
            <p className="text-[10px] text-surface-600 truncate">{userTypeLabel || 'Pro 计划'}</p>
          </div>
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onLogout}
              title="退出登录"
              className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </motion.button>
          )}
        </div>

        <div
          className={`flex flex-col items-center gap-2 transition-all duration-300 ${
            collapsed ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {userInitial}
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="退出登录"
              className="p-1 rounded-md text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
