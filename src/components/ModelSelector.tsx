import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, Sparkles, Code2 } from 'lucide-react';
// ModelInfo type not needed at runtime
import { models } from '../utils/mockData';

interface ModelSelectorProps {
  activeModel: string;
  onChange: (modelId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain size={14} />,
  sparkles: <Sparkles size={14} />,
  'code-2': <Code2 size={14} />,
};

export function ModelSelector({ activeModel, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const active = models.find((m) => m.id === activeModel) || models[0];

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-surface-700/40 hover:border-surface-600/50 text-surface-300 text-sm transition-all"
      >
        <span className="text-primary-400">{iconMap[active.icon]}</span>
        <span className="font-medium">{active.name}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full left-0 mt-2 w-64 bg-surface-900 rounded-xl border border-surface-700/50 shadow-2xl shadow-black/50 z-20 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {models.map((model) => (
                  <motion.button
                    key={model.id}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 w-full p-2.5 rounded-lg transition-all ${
                      activeModel === model.id
                        ? 'bg-primary-500/10 border border-primary-500/20'
                        : 'hover:bg-surface-800/50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activeModel === model.id
                          ? 'bg-primary-500/20 text-primary-300'
                          : 'bg-surface-700/30 text-surface-500'
                      }`}
                    >
                      {iconMap[model.icon]}
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${
                          activeModel === model.id ? 'text-surface-100' : 'text-surface-300'
                        }`}
                      >
                        {model.name}
                      </p>
                      <p className="text-[11px] text-surface-500 mt-0.5">{model.description}</p>
                    </div>
                    {activeModel === model.id && (
                      <motion.div
                        layoutId="activeModel"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 mt-2"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
