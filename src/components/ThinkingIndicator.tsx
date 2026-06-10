import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

interface ThinkingIndicatorProps {
  thinkingContent?: string;
}

export function ThinkingIndicator({ thinkingContent }: ThinkingIndicatorProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Thinking header with animation */}
      <div className="flex items-center gap-2 text-amber-400/80">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BrainCircuit size={15} />
        </motion.div>
        <span className="text-xs font-medium tracking-wide uppercase">深度思考中</span>
        <div className="flex items-center gap-1 ml-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-amber-400/60"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Thinking content area */}
      {thinkingContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pl-4 border-l-2 border-amber-500/20"
        >
          <pre className="text-[12px] leading-relaxed text-surface-500 font-mono whitespace-pre-wrap">
            {thinkingContent}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
