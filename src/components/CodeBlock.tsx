import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-surface-700/40 bg-surface-950">
      {language && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-900/80 border-b border-surface-700/30">
          <span className="text-xs font-mono font-medium text-surface-400 uppercase tracking-wider">
            {language}
          </span>
          <motion.button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700/40 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 text-emerald-400"
                >
                  <Check size={13} />
                  已复制
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  复制
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.25rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.7',
          fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
        }}
        codeTagProps={{
          style: {
            fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
