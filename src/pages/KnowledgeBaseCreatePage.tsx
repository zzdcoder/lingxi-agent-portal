import {useState, useRef, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
// ... existing code ...
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  Search,
  Grid3x3,
  ExternalLink,
  ArrowRight,
  BookOpen,
  Trash2,
  Settings,
  HelpCircle,
  RotateCcw,
  LayoutTemplate,
  Users,
} from 'lucide-react';

// ... existing code ...

interface FileItem {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'done';
}

// 新增 Chunk 类型
interface ChunkItem {
  id: number;
  length: number;
  content: string;
}

type CreateStep = 1 | 2 | 3;

interface StepConfig {
  id: number;
  label: string;
}

const STEPS: StepConfig[] = [
  {id: 1, label: '选择数据源'},
  {id: 2, label: '文本分段与清洗'},
  {id: 3, label: '处理并完成'},
];

// 新增 mock chunks
const MOCK_CHUNKS: ChunkItem[] = [
  {
    id: 1,
    length: 70,
    content: '这些规则适用于本项目中的每一项任务，除非有明确的例外说明。**核心倾向**：在处理非琐碎工作时，谨慎优先于速度。对于琐碎的任务则灵活判断。',
  },
  {
    id: 2,
    length: 106,
    content: '准则 1 —— 先思考，再动手写代码** 明确说出你的假设。如果不确定，直接提问而不是瞎猜。 当存在歧义时，列出多种可能的解读。 如果有更简单的解决方案，要主动提出来。 感到困惑时就停下来，并明确指出哪里不清楚。',
  },
  {
    id: 3,
    length: 101,
    content: '准则 2 —— 简单至上** 用最少的代码解决当前的问题。绝不写任何推测性的代码。 不做需求以外的功能。不为只用一次的代码搞抽象封装。 自我检验：资深工程师看了会不会觉得这太复杂了？如果是，那就简化它。',
  },
  {
    id: 4,
    length: 86,
    content: '准则 3 —— 外科手术式的改动** 只动必须动的地方。只收拾你自己弄出的烂摊子。 不要去“优化”旁边的代码、注释或格式。 没坏的东西就别去重构。保持和现有的代码风格一致。',
  },
  {
    id: 5,
    length: 88,
    content: '准则 4 —— 目标驱动执行** 定义好成功的标准，然后循环迭代直到验证通过。 不要死板地按步骤走。定义好成功状态，然后不断逼近它。 有了清晰的成功标准，你就能独立地持续迭代。',
  },
];

export default function KnowledgeBaseCreatePage({onBack, onFinish}: {
  onBack: () => void;
  onFinish: () => void
}) {
  const [step, setStep] = useState<CreateStep>(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 states
  const [segmentMode, setSegmentMode] = useState<'general' | 'parent_child'>('general');
  const [delimiter, setDelimiter] = useState('\\n\\n');
  const [maxLength, setMaxLength] = useState(1024);
  const [overlapLength, setOverlapLength] = useState(50);
  const [preprocessRules, setPreprocessRules] = useState({
    removeSpaces: true,
    removeUrls: false,
    autoSummary: false,
    useQa: false,
  });
  const [indexMode] = useState<'high' | 'eco'>('high');

  // Step 3 states
  const [kbName, setKbName] = useState('');

  const [parentChildConfig, setParentChildConfig] = useState({
    parentMode: 'paragraph' as 'paragraph' | 'full',
    parentDelimiter: '\\n\\n',
    parentMaxLength: 1024,
    childDelimiter: '\\n',
    childMaxLength: 512,
    removeSpaces: true,
    removeUrls: true,
    autoSummary: false,
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: FileItem[] = Array.from(selected).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    if (!kbName && newFiles[0]) {
      setKbName(newFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  }, [kbName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files;
    const newFiles: FileItem[] = Array.from(dropped).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    if (!kbName && newFiles[0]) {
      setKbName(newFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  }, [kbName]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canProceed = files.length > 0;

  function CustomCheckbox({checked, onChange, label, children}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: string;
    children?: React.ReactNode
  }) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
          <button
              type="button"
              onClick={() => onChange(!checked)}
              className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                  checked
                      ? 'bg-primary-600 border-primary-500'
                      : 'bg-surface-950/50 border border-surface-700/40 group-hover:border-surface-600'
              }`}
          >
            {checked && <Check size={10} className="text-white" strokeWidth={3}/>}
          </button>
          {children ? (
              <div className="flex items-center gap-1.5">{children}</div>
          ) : (
              <span
                  className={`text-sm transition-colors ${checked ? 'text-surface-300' : 'text-surface-500 group-hover:text-surface-400'}`}>
            {label}
          </span>
          )}
        </label>
    );
  }

  return (
      <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.25}}
          className="flex flex-col flex-1 min-h-0 bg-surface-950"
      >
        {/* Top Navigation Bar */}
        <div
            className="flex items-center px-6 py-3.5 border-b border-surface-700/20 bg-surface-950/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1">
            <motion.button
                whileHover={{scale: 1.08}}
                whileTap={{scale: 0.92}}
                onClick={onBack}
                className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
                title="返回"
            >
              <ArrowLeft size={16}/>
            </motion.button>
            <span className="text-sm font-semibold text-surface-100 tracking-tight">知识库</span>
          </div>

          {/* Stepper - 按图片精确还原 */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => {
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                  <div key={s.id} className="flex items-center gap-1">
                    {idx > 0 && (
                        <span className="text-surface-700/40 mx-1">—</span>
                    )}
                    {isActive ? (
                        <div className="flex items-center gap-1.5">
                    <span
                        className="px-2 py-0.5 rounded-md bg-primary-600 text-white text-[10px] font-bold tracking-wide">
                      STEP {s.id}
                    </span>
                          <span className="text-xs font-medium text-primary-300">{s.label}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                    <span
                        className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium ${
                            isDone
                                ? 'bg-surface-800 text-surface-500'
                                : 'bg-surface-800 text-surface-600 border border-surface-700/30'
                        }`}
                    >
                      {isDone ? <Check size={10}/> : s.id}
                    </span>
                          <span
                              className={`text-xs ${isDone ? 'text-surface-500' : 'text-surface-600'}`}>{s.label}</span>
                        </div>
                    )}
                  </div>
              );
            })}
          </div>

          <div className="flex-1"/>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
                <motion.div
                    key="step1"
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: 20}}
                    transition={{duration: 0.3}}
                    className="flex-1 overflow-auto"
                >
                  <div className="max-w-3xl mx-auto px-6 py-10">
                    <h2 className="text-xl font-bold text-surface-100 mb-8">上传文本文件</h2>

                    {/* Upload Area */}
                    <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-10 px-6 text-center ${
                            isDragging
                                ? 'border-primary-500/60 bg-primary-500/5'
                                : 'border-surface-700/40 bg-surface-900/20 hover:border-surface-600/50'
                        }`}
                    >
                      <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".htm,.xls,.vtt,.mdx,.docx,.pdf,.txt,.properties,.html,.xlsx,.csv,.markdown,.md"
                          onChange={handleFileSelect}
                          className="hidden"
                      />
                      <Upload size={28} className="text-surface-500 mb-3"/>
                      <p className="text-sm text-surface-300 mb-2">
                        拖拽文件或文件夹至此，或者 <span
                          className="text-primary-400 hover:text-primary-300 cursor-pointer">选择文件</span>
                      </p>
                      <p className="text-xs text-surface-600 max-w-lg leading-relaxed">
                        已支持
                        HTM、XLS、VTT、MDX、DOCX、PDF、TXT、PROPERTIES、HTML、XLSX、CSV、MARKDOWN、MD，每批最多 5
                        个文件，每个文件不超过 15 MB。
                      </p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <motion.div
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            className="mt-6 space-y-2"
                        >
                          {files.map((f) => (
                              <div
                                  key={f.id}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-900/60 border border-surface-700/20"
                              >
                                <FileText size={18} className="text-primary-400"/>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-surface-200 truncate">{f.name}</p>
                                  <p className="text-xs text-surface-600">{f.size}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(f.id);
                                    }}
                                    className="p-1.5 rounded-md text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                          ))}
                        </motion.div>
                    )}

                    {/* Next Button */}
                    <div className="flex justify-center mt-10">
                      <button
                          onClick={() => canProceed && setStep(2)}
                          disabled={!canProceed}
                          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                              canProceed
                                  ? 'bg-surface-800 text-surface-300 hover:bg-surface-700 border border-surface-700/30'
                                  : 'bg-surface-900/40 text-surface-700 border border-surface-800/20 cursor-not-allowed'
                          }`}
                      >
                        下一步 <ArrowRight size={14}/>
                      </button>
                    </div>
                  </div>
                </motion.div>
            )}

            {step === 2 && (
                <motion.div
                    key="step2"
                    initial={{opacity: 0, x: 20}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: -20}}
                    transition={{duration: 0.3}}
                    className="flex-1 flex min-h-0"
                >
                  {/* Left Panel - 分段设置 */}
                  <div className="flex-1 flex flex-col min-w-0 border-r border-surface-700/20">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
                         style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                      {/* 标题 */}
                      <h2 className="text-sm font-semibold text-surface-200">分段设置</h2>

                      {/* 通用 Card */}
                      <div
                          className={`rounded-xl border transition-all overflow-hidden ${
                              segmentMode === 'general'
                                  ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                  : 'border-surface-700/20 bg-surface-900/30'
                          }`}
                      >
                        <button
                            onClick={() => setSegmentMode('general')}
                            className="w-full flex items-start gap-3 p-4 text-left"
                        >
                          <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  segmentMode === 'general' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                              }`}>
                            <LayoutTemplate size={15}/>
                          </div>
                          <div>
                            <div
                                className={`text-sm font-medium ${segmentMode === 'general' ? 'text-surface-100' : 'text-surface-300'}`}>
                              通用
                            </div>
                            <p className="text-xs text-surface-500 mt-0.5">通用文本分块模式，检索和召回的块是相同的</p>
                          </div>
                        </button>

                        {segmentMode === 'general' && (
                            <motion.div
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: 'auto'}}
                                className="px-4 pb-4 space-y-4"
                            >
                              {/* 三个输入框 */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label
                                      className="flex items-center gap-1 text-xs text-surface-500 mb-1.5">
                                    分段标识符
                                    <HelpCircle size={12} className="text-surface-600"/>
                                  </label>
                                  <input
                                      type="text"
                                      value={delimiter}
                                      onChange={(e) => setDelimiter(e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label
                                      className="block text-xs text-surface-500 mb-1.5">分段最大长度</label>
                                  <div className="relative">
                                     <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                    <input
                                        type="number"
                                        value={maxLength}
                                        onChange={(e) => setOverlapLength(Number(e.target.value))}
                                        className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label
                                      className="flex items-center gap-1 text-xs text-surface-500 mb-1.5">
                                    分段重叠长度
                                    <HelpCircle size={12} className="text-surface-600"/>
                                  </label>
                                  <div className="relative">
                                    <span
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                    <input
                                        type="number"
                                        value={overlapLength}
                                        onChange={(e) => setOverlapLength(Number(e.target.value))}
                                        className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 文本预处理规则 */}
                              <div className="space-y-2.5 pt-1">
                                <p className="text-xs font-medium text-surface-400">文本预处理规则</p>
                                <CustomCheckbox
                                    checked={preprocessRules.removeSpaces}
                                    onChange={(v) => setPreprocessRules((p) => ({
                                      ...p,
                                      removeSpaces: v
                                    }))}
                                    label="替换掉连续的空格、换行符和制表符"
                                />
                                <CustomCheckbox
                                    checked={preprocessRules.removeUrls}
                                    onChange={(v) => setPreprocessRules((p) => ({
                                      ...p,
                                      removeUrls: v
                                    }))}
                                    label="删除所有 URL 和电子邮件地址"
                                />
                              </div>


                              {/* 使用 Q&A 分段 */}
                              <div className="flex items-center gap-2">
                                <CustomCheckbox
                                    checked={preprocessRules.useQa}
                                    onChange={(v) => setPreprocessRules((p) => ({...p, useQa: v}))}
                                >
                                  <span
                                      className="text-sm text-surface-500">使用 Q&A 分段</span>
                                </CustomCheckbox>
                              </div>

                              {/* 底部按钮 */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60 transition-colors">
                                  <Search size={12}/>
                                  预览块
                                </button>
                                <button
                                    onClick={() => {
                                      setDelimiter('\\n\\n');
                                      setMaxLength(1024);
                                      setOverlapLength(50);
                                      setPreprocessRules({
                                        removeSpaces: true,
                                        removeUrls: false,
                                        autoSummary: false,
                                        useQa: false,
                                      });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60 transition-colors"
                                >
                                  <RotateCcw size={12}/>
                                  重置
                                </button>
                              </div>
                            </motion.div>
                        )}
                      </div>

                      {/* 父子分段 Card */}
                      <div
                          className={`rounded-xl border transition-all overflow-hidden ${
                              segmentMode === 'parent_child'
                                  ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                  : 'border-surface-700/20 bg-surface-900/30'
                          }`}
                      >
                        <button
                            onClick={() => setSegmentMode('parent_child')}
                            className="w-full flex items-start gap-3 p-4 text-left"
                        >
                          <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  segmentMode === 'parent_child' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                              }`}>
                            <Users size={15}/>
                          </div>
                          <div>
                            <div
                                className={`text-sm font-medium ${segmentMode === 'parent_child' ? 'text-surface-100' : 'text-surface-300'}`}>
                              父子分段
                            </div>
                            <p className="text-xs text-surface-500 mt-0.5">使用父子模式时，子块用于检索，父块用作上下文</p>
                          </div>
                        </button>

                        {segmentMode === 'parent_child' && (
                            <motion.div
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: 'auto'}}
                                className="px-4 pb-4 space-y-4"
                            >
                              {/* 父块用作上下文 */}
                              <div>
                                <p className="text-xs font-medium text-surface-300 mb-3">父块用作上下文</p>

                                {/* 段落 Card */}
                                <div
                                    onClick={() => setParentChildConfig(p => ({...p, parentMode: 'paragraph'}))}
                                    className={`rounded-xl border p-3 mb-3 cursor-pointer transition-all ${
                                        parentChildConfig.parentMode === 'paragraph'
                                            ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                            : 'border-surface-700/20 bg-surface-950/20'
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        parentChildConfig.parentMode === 'paragraph' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                                    }`}>
                                      <FileText size={15}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className={`text-sm font-medium ${parentChildConfig.parentMode === 'paragraph' ? 'text-surface-100' : 'text-surface-300'}`}>
                                          段落
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            parentChildConfig.parentMode === 'paragraph'
                                                ? 'border-primary-500'
                                                : 'border-surface-600'
                                        }`}>
                                          {parentChildConfig.parentMode === 'paragraph' && (
                                              <div className="w-2 h-2 rounded-full bg-primary-500"/>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-surface-500 mt-0.5">此模式根据分隔符和最大块长度将文本拆分为段落，使用拆分文本作为检索的父块</p>
                                    </div>
                                  </div>

                                  {parentChildConfig.parentMode === 'paragraph' && (
                                      <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                          <label className="flex items-center gap-1 text-xs text-surface-500 mb-1.5">
                                            分段标识符
                                            <HelpCircle size={12} className="text-surface-600"/>
                                          </label>
                                          <input
                                              type="text"
                                              value={parentChildConfig.parentDelimiter}
                                              onChange={(e) => setParentChildConfig(p => ({
                                                ...p,
                                                parentDelimiter: e.target.value
                                              }))}
                                              className="w-full px-3 py-2 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-surface-500 mb-1.5">分段最大长度</label>
                                          <div className="relative">
                                            <input
                                                type="number"
                                                value={parentChildConfig.parentMaxLength}
                                                onChange={(e) => setParentChildConfig(p => ({
                                                  ...p,
                                                  parentMaxLength: Number(e.target.value)
                                                }))}
                                                className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                          </div>
                                        </div>
                                      </div>
                                  )}
                                </div>

                                {/* 全文 Card */}
                                <div
                                    onClick={() => setParentChildConfig(p => ({...p, parentMode: 'full'}))}
                                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                                        parentChildConfig.parentMode === 'full'
                                            ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                            : 'border-surface-700/20 bg-surface-950/20'
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        parentChildConfig.parentMode === 'full' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                                    }`}>
                                      <BookOpen size={15}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className={`text-sm font-medium ${parentChildConfig.parentMode === 'full' ? 'text-surface-100' : 'text-surface-300'}`}>
                                          全文
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            parentChildConfig.parentMode === 'full'
                                                ? 'border-primary-500'
                                                : 'border-surface-600'
                                        }`}>
                                          {parentChildConfig.parentMode === 'full' && (
                                              <div className="w-2 h-2 rounded-full bg-primary-500"/>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-surface-500 mt-0.5">整个文档用作父块并直接检索。请注意，出于性能原因，超过 10000 个标记的文本将被自动截断。</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 子块用于检索 */}
                              <div>
                                <p className="text-xs font-medium text-surface-300 mb-3">子块用于检索</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="flex items-center gap-1 text-xs text-surface-500 mb-1.5">
                                      分段标识符
                                      <HelpCircle size={12} className="text-surface-600"/>
                                    </label>
                                    <input
                                        type="text"
                                        value={parentChildConfig.childDelimiter}
                                        onChange={(e) => setParentChildConfig(p => ({
                                          ...p,
                                          childDelimiter: e.target.value
                                        }))}
                                        className="w-full px-3 py-2 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-surface-500 mb-1.5">分段最大长度</label>
                                    <div className="relative">
                                      <input
                                          type="number"
                                          value={parentChildConfig.childMaxLength}
                                          onChange={(e) => setParentChildConfig(p => ({
                                            ...p,
                                            childMaxLength: Number(e.target.value)
                                          }))}
                                          className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 文本预处理规则 */}
                              <div className="space-y-2.5 pt-1">
                                <p className="text-xs font-medium text-surface-400">文本预处理规则</p>
                                <CustomCheckbox
                                    checked={parentChildConfig.removeSpaces}
                                    onChange={(v) => setParentChildConfig(p => ({...p, removeSpaces: v}))}
                                    label="替换掉连续的空格、换行符和制表符"
                                />
                                <CustomCheckbox
                                    checked={parentChildConfig.removeUrls}
                                    onChange={(v) => setParentChildConfig(p => ({...p, removeUrls: v}))}
                                    label="删除所有 URL 和电子邮件地址"
                                />
                              </div>

                              {/* 摘要自动生成 */}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-sm text-surface-300">摘要自动生成</span>
                                <button
                                    type="button"
                                    onClick={() => setParentChildConfig(p => ({...p, autoSummary: !p.autoSummary}))}
                                    className={`relative w-9 h-5 rounded-full transition-colors ${
                                        parentChildConfig.autoSummary ? 'bg-primary-600' : 'bg-surface-700'
                                    }`}
                                >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                parentChildConfig.autoSummary ? 'translate-x-4' : 'translate-x-0'
                            }`}/>
                                </button>
                              </div>

                              {/* 底部按钮 */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60 transition-colors">
                                  <Search size={12}/>
                                  预估块
                                </button>
                                <button
                                    onClick={() => {
                                      setParentChildConfig({
                                        parentMode: 'paragraph',
                                        parentDelimiter: '\\n\\n',
                                        parentMaxLength: 1024,
                                        childDelimiter: '\\n',
                                        childMaxLength: 512,
                                        removeSpaces: true,
                                        removeUrls: true,
                                        autoSummary: false,
                                      });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60 transition-colors"
                                >
                                  <RotateCcw size={12}/>
                                  重置
                                </button>
                              </div>
                            </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div
                        className="px-6 py-4 border-t border-surface-700/20 flex items-center justify-between bg-surface-950/30">
                      <button
                          onClick={() => setStep(1)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 border border-surface-700/20 transition-colors"
                      >
                        <ArrowLeft size={14}/>
                        上一步
                      </button>
                      <button
                          onClick={() => {
                            setFiles((prev) => prev.map((f) => ({...f, status: 'done'})));
                            setStep(3);
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 border border-primary-500/30 shadow-lg shadow-primary-600/20 transition-colors"
                      >
                        保存并处理
                      </button>
                    </div>
                  </div>

                  {/* Right Panel - Preview Chunk列表 */}
                  <div className="w-[480px] flex-shrink-0 flex flex-col min-w-0 bg-surface-900/10">
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-surface-700/20">
                      <div className="flex items-center gap-1.5 text-xs text-surface-300">
                        <span className="text-[10px] text-primary-400 font-medium mr-1">预览</span>
                        <FileText size={12} className="text-primary-400"/>
                        <span
                            className="truncate max-w-[200px]">{files[0]?.name || 'CLAUDE模版.md'}</span>
                        <ChevronDown size={12} className="text-surface-500"/>
                      </div>
                      <span
                          className="text-[10px] text-surface-600 border border-surface-700/30 px-1.5 py-0.5 rounded">
                        {segmentMode === 'parent_child' ? '0 预估块' : '13 预估块'}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      {segmentMode === 'parent_child' ? (
                          <div className="h-full flex flex-col items-center justify-center text-surface-600">
                            <Search size={36} className="mb-3 opacity-20"/>
                            <p className="text-xs text-center">点击左侧的"预览块"按钮来加载预览</p>
                          </div>
                      ) : (
                          <div className="space-y-5">
                            {MOCK_CHUNKS.map((chunk) => (
                                <div key={chunk.id}>
                                  <div
                                      className="flex items-center gap-1.5 text-xs text-surface-500 mb-1.5">
                                    <LayoutTemplate size={11} className="text-surface-600"/>
                                    <span>Chunk-{chunk.id} · {chunk.length} characters</span>
                                  </div>
                                  <p className="text-sm text-surface-300 leading-relaxed">
                                    {chunk.content}
                                  </p>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>
                  </div>
                </motion.div>
            )}

            {step === 3 && (
                <motion.div
                    key="step3"
                    initial={{opacity: 0, x: 20}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: -20}}
                    transition={{duration: 0.3}}
                    className="flex-1 flex min-h-0"
                >
                  {/* Left Panel */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto px-6 py-8">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                            className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                          <BookOpen size={14} className="text-white"/>
                        </div>
                        <h2 className="text-lg font-bold text-surface-100">知识库已创建</h2>
                      </div>
                      <p className="text-sm text-surface-500 mb-6">我们自动为该知识库起了个名称，您也可以随时修改</p>

                      {/* KB Name Input */}
                      <div className="flex items-center gap-3 mb-8">
                        <div
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/10">
                          <BookOpen size={22} className="text-white"/>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-surface-500 mb-1">知识库名称</label>
                          <input
                              type="text"
                              value={kbName}
                              onChange={(e) => setKbName(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/40 transition-colors"
                              placeholder="请输入知识库名称"
                          />
                        </div>
                      </div>

                      {/* Embedding Done */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-surface-200 mb-3">嵌入已完成</h3>
                        <div className="space-y-2">
                          {files.map((f) => (
                              <div
                                  key={f.id}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-900/50 border border-surface-700/20"
                              >
                                <FileText size={16} className="text-primary-400"/>
                                <span
                                    className="flex-1 text-sm text-surface-300 truncate">{f.name}</span>
                                <div
                                    className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                  <Check size={12} className="text-emerald-400" strokeWidth={3}/>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>

                      {/* Config Summary */}
                      <div className="grid grid-cols-[120px_1fr] gap-x-6 gap-y-3 mb-8">
                        <div className="text-xs text-surface-500">分段模式</div>
                        <div
                            className="text-sm text-surface-200">{segmentMode === 'general' ? '自定义' : '父子分段'}</div>

                        <div className="text-xs text-surface-500">最大分段长度</div>
                        <div className="text-sm text-surface-200">{maxLength}</div>

                        <div className="text-xs text-surface-500">文本预处理规则</div>
                        <div className="text-sm text-surface-200">
                          {preprocessRules.removeSpaces ? '替换掉连续的空格、换行符和制表符' : '无'}
                        </div>

                        <div className="text-xs text-surface-500">索引方式</div>
                        <div className="text-sm text-surface-200 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-primary-400"/>
                          {indexMode === 'high' ? '高质量' : '经济'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div
                        className="px-6 py-4 border-t border-surface-700/20 flex items-center gap-3 bg-surface-950/30">
                      <button
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-surface-300 hover:text-surface-100 bg-surface-800/60 border border-surface-700/30 hover:bg-surface-800 transition-colors">
                        <ExternalLink size={14}/>
                        Access the API
                      </button>
                      <button
                          onClick={onFinish}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 border border-primary-500/30 shadow-lg shadow-primary-600/20 transition-colors"
                      >
                        前往文档 <ArrowRight size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* Right Panel - Next Steps */}
                  <div
                      className="flex-1 flex flex-col min-w-0 border-l border-surface-700/20 bg-surface-900/10 p-6">
                    <div
                        className="rounded-xl border border-surface-700/20 bg-surface-900/40 p-5 h-fit">
                      <div
                          className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-500/20 flex items-center justify-center mb-4">
                        <BookOpen size={16} className="text-primary-400"/>
                      </div>
                      <h4 className="text-sm font-semibold text-surface-200 mb-2">接下来做什么</h4>
                      <p className="text-xs text-surface-500 leading-relaxed">
                        当文档完成索引后，您可以管理和编辑文档、运行检索测试以及修改知识库设置。知识库即可集成到应用程序内作为上下文使用，因此请调整检索设置以确保最佳性能。
                      </p>
                      <a href="#"
                         className="inline-flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 mt-3 transition-colors">
                        了解更多
                      </a>
                    </div>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
  );
}

