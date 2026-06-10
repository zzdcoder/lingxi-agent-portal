import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Database, ArrowLeft } from 'lucide-react';
import { ModelSelector } from './ModelSelector';

interface ChatHeaderProps {
  title: string;
  activeModel: string;
  onModelChange: (modelId: string) => void;
  onNavigateToKnowledgeBase?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  pageTitle?: string;
}

export function ChatHeader({
  title,
  activeModel,
  onModelChange,
  onNavigateToKnowledgeBase,
  showBackButton,
  onBack,
  pageTitle,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between px-6 py-3.5 border-b border-surface-700/20 bg-surface-950/50 backdrop-blur-xl sticky top-0 z-10"
    >
      <div className="flex items-center gap-4">
        {showBackButton && onBack && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
            title="返回"
          >
            <ArrowLeft size={16} />
          </motion.button>
        )}
        <h2 className="text-sm font-semibold text-surface-100 tracking-tight">
          {pageTitle || title}
        </h2>
        {!showBackButton && <ModelSelector activeModel={activeModel} onChange={onModelChange} />}
      </div>

      <div className="flex items-center gap-1 relative" ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setMenuOpen(!menuOpen)}
          className={`p-2 rounded-lg transition-colors ${
            menuOpen
              ? 'text-surface-300 bg-surface-800/50'
              : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50'
          }`}
          title="更多"
        >
          <MoreHorizontal size={16} />
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-surface-700/30 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 py-1.5 z-50"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigateToKnowledgeBase?.();
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors"
              >
                <Database size={15} className="text-surface-500" />
                知识库维护
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
