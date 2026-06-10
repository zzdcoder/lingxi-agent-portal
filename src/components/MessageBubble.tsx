import { motion } from 'framer-motion';
import { User, Sparkles, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { HTMLAttributes, ReactNode } from 'react';
import type { Message } from '../types';
import { CodeBlock } from './CodeBlock';
import { TypingIndicator } from './TypingIndicator';
import { ThinkingIndicator } from './ThinkingIndicator';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

interface MarkdownCodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isThinking = isAssistant && message.isThinking;
  const hasAttachments = Boolean(message.attachments?.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <motion.div
          whileHover={{ scale: 1.08 }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
            isUser
              ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/20'
              : isThinking
                ? 'bg-gradient-to-br from-amber-600/40 to-amber-800/30 border border-amber-500/30'
                : 'bg-gradient-to-br from-surface-700 to-surface-800 border border-surface-600/30'
          }`}
        >
          {isUser ? (
            <User size={16} className="text-white" />
          ) : isThinking ? (
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles size={16} className="text-amber-300" />
            </motion.div>
          ) : (
            <Sparkles size={16} className="text-primary-300" />
          )}
        </motion.div>
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%] lg:max-w-[70%]`}>
        <div
          className={`relative px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'message-user rounded-tr-sm'
              : isThinking
                ? 'bg-gradient-to-br from-amber-500/5 to-surface-800/40 border border-amber-500/10 rounded-tl-sm'
                : 'message-assistant rounded-tl-sm'
          }`}
        >
          {/* Thinking phase */}
          {isThinking && (
            <ThinkingIndicator thinkingContent={message.thinkingContent} />
          )}

          {/* Answering phase */}
          {!isThinking && isAssistant && message.isStreaming && !message.content && !hasAttachments && (
            <TypingIndicator />
          )}

          {!isThinking && hasAttachments && (
            <div className="mb-2 space-y-1.5">
              {message.attachments?.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-surface-700/40 bg-surface-900/50 px-3 py-2 text-surface-200 transition-colors hover:border-primary-500/40 hover:bg-surface-800/70"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-300">
                    <Paperclip size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-surface-100">{attachment.name}</p>
                    <p className="text-xs text-surface-500">{attachment.mimeType || 'application/octet-stream'} · {formatFileSize(attachment.size)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {!isThinking && message.content && (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: MarkdownCodeProps) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code className="px-1.5 py-0.5 rounded-md bg-surface-800 text-primary-300 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="text-surface-200 leading-relaxed mb-2 last:mb-0">{children}</p>;
                  },
                  h1({ children }) {
                    return <h1 className="text-base font-semibold text-surface-100 mt-4 mb-2 pb-1.5 border-b border-surface-700/30">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-sm font-semibold text-surface-100 mt-3 mb-1.5">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-semibold text-surface-100 mt-2.5 mb-1">{children}</h3>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc list-inside space-y-0.5 text-surface-300 mb-2">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal list-inside space-y-0.5 text-surface-300 mb-2">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="text-surface-300">{children}</li>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-2 border-primary-500/50 pl-3 italic text-surface-400 my-2 bg-primary-500/5 py-1.5 pr-2 rounded-r-lg text-sm">
                        {children}
                      </blockquote>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors">
                        {children}
                      </a>
                    );
                  },
                  img() {
                    return null;
                  },
                  hr() {
                    return <hr className="border-surface-700/30 my-3" />;
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3 rounded-lg border border-surface-700/30">
                        <table className="w-full text-sm text-surface-300">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-200 bg-surface-800/50 border-b border-surface-700/30">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-4 py-2.5 border-b border-surface-800/50">{children}</td>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming cursor */}
          {!isThinking && isAssistant && message.isStreaming && message.content && (
            <motion.span
              className="inline-block w-2 h-4 ml-0.5 bg-primary-400 align-middle rounded-sm"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-surface-600 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
