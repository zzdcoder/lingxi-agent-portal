import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Paperclip, Mic, Square, X } from 'lucide-react';

const MAX_ATTACHMENTS = 10;
const DEFAULT_FILE_HINT = `当前仅支持文本类附件，最多添加 ${MAX_ATTACHMENTS} 个附件`;
const TEXT_ATTACHMENT_ACCEPT = [
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.java',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.py',
  '.xml',
  '.html',
  '.htm',
  '.yml',
  '.yaml',
  '.log',
  '.properties',
  '.sql',
].join(',');
const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'csv',
  'java',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'xml',
  'html',
  'htm',
  'yml',
  'yaml',
  'log',
  'properties',
  'sql',
]);

interface ChatInputProps {
  onSend: (message: string, files: File[]) => void;
  onStop?: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileHint, setFileHint] = useState(DEFAULT_FILE_HINT);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;

    const supportedFiles = selectedFiles.filter(isSupportedTextAttachment);
    if (supportedFiles.length !== selectedFiles.length) {
      setSelectedFiles(supportedFiles);
      setFileHint('当前仅支持文本类附件，不支持的文件已忽略');
      return;
    }

    if (supportedFiles.length > MAX_ATTACHMENTS) {
      setSelectedFiles(supportedFiles.slice(0, MAX_ATTACHMENTS));
      setFileHint(`最多添加 ${MAX_ATTACHMENTS} 个附件`);
      return;
    }

    onSend(input.trim(), supportedFiles);
    setInput('');
    setSelectedFiles([]);
    setFileHint(DEFAULT_FILE_HINT);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOpenFilePicker = () => {
    if (selectedFiles.length >= MAX_ATTACHMENTS) {
      setFileHint(`最多添加 ${MAX_ATTACHMENTS} 个附件`);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const supportedFiles = files.filter(isSupportedTextAttachment);
    const remainingSlots = Math.max(MAX_ATTACHMENTS - selectedFiles.length, 0);
    const nextFiles = supportedFiles.slice(0, remainingSlots);
    const hasUnsupportedFiles = supportedFiles.length !== files.length;
    const hitAttachmentLimit = supportedFiles.length > remainingSlots;

    if (nextFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...nextFiles]);
    }

    setFileHint(buildFileHint(hasUnsupportedFiles, hitAttachmentLimit));
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    const nextFiles = selectedFiles.filter((_, currentIndex) => currentIndex !== index);
    setSelectedFiles(nextFiles);
    if (nextFiles.length < MAX_ATTACHMENTS) {
      setFileHint(DEFAULT_FILE_HINT);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept={TEXT_ATTACHMENT_ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <motion.div
          className="relative glass-panel rounded-2xl input-glow transition-shadow duration-300"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-1 px-4 pt-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/30 transition-colors"
              title="文本附件"
              onClick={handleOpenFilePicker}
              disabled={isLoading}
            >
              <Paperclip size={16} />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/30 transition-colors"
              title="语音输入"
              disabled
            >
              <Mic size={16} />
            </motion.button>
          </div>

          <p className="px-4 pt-2 text-xs text-surface-500">
            {fileHint}
          </p>

          {selectedFiles.length > 0 && (
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-surface-700/60 bg-surface-800/60 px-3 py-2 text-xs text-surface-200"
                >
                  <Paperclip size={12} className="text-primary-300" />
                  <div className="min-w-0">
                    <p className="truncate max-w-44">{file.name}</p>
                    <p className="text-surface-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="rounded-md p-0.5 text-surface-500 hover:text-surface-200"
                    aria-label={`移除附件 ${file.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 px-3 pb-3 pt-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，按 Enter 发送，Shift + Enter 换行..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-surface-100 placeholder:text-surface-600 text-[15px] leading-relaxed py-2.5 px-2 max-h-[200px] disabled:opacity-60"
            />
            <motion.button
              type="button"
              onClick={isLoading ? onStop : handleSubmit}
              disabled={!isLoading && !input.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isLoading
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                  : input.trim()
                    ? 'bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-600/25 text-white'
                    : 'bg-surface-700/50 text-surface-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <ArrowUp size={18} strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </motion.div>

        <p className="text-center text-[11px] text-surface-600 mt-2.5">
          AI 生成的内容可能存在不准确之处，请仔细核实重要信息
        </p>
      </div>
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedTextAttachment(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && TEXT_ATTACHMENT_EXTENSIONS.has(extension));
}

function buildFileHint(hasUnsupportedFiles: boolean, hitAttachmentLimit: boolean): string {
  if (hasUnsupportedFiles && hitAttachmentLimit) {
    return `当前仅支持文本类附件，且最多添加 ${MAX_ATTACHMENTS} 个附件`;
  }

  if (hitAttachmentLimit) {
    return `最多添加 ${MAX_ATTACHMENTS} 个附件`;
  }

  if (hasUnsupportedFiles) {
    return '当前仅支持文本类附件，不支持的文件已忽略';
  }

  return DEFAULT_FILE_HINT;
}
