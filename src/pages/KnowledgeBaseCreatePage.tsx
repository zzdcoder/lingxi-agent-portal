import {useState, useRef, useCallback, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
// ... existing code ...
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  ChevronDown,
  Sparkles,
  Search,
  ExternalLink,
  ArrowRight,
  BookOpen,
  Trash2,
  HelpCircle,
  RotateCcw,
  LayoutTemplate,
  Users,
  SlidersHorizontal,
  X,
  Plus,
  Type,
  Hash,
  Clock,
  Tag,
} from 'lucide-react';
import {listMetadata, type MetadataDefinition} from '../services/metadata';
import {uploadFile, type UploadedFile} from '../services/file';
import {previewChunks, previewParentChildChunks, saveProcess, type ChunkPreview, type ParentChildChunk} from '../services/fileProcess';

// ... existing code ...

interface FileItem {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  file?: File;
  uploadedInfo?: UploadedFile;
  error?: string;
}

// 新增 Chunk 类型
interface ChunkItem {
  id: number;
  length: number;
  content: string;
}

// 文件预览状态
type PreviewState = 'idle' | 'loading' | 'success' | 'error';

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
  
  // 预览状态
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewChunkList, setPreviewChunkList] = useState<ChunkPreview[]>([]);
  const [previewParentChildList, setPreviewParentChildList] = useState<ParentChildChunk[]>([]);
  const [previewError, setPreviewError] = useState<string>('');
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<string>('');

  // 保存处理状态
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');

  // Document settings states
  const [docPermission, setDocPermission] = useState<'public' | 'private'>('public');
  const [selectedMetadata, setSelectedMetadata] = useState<Array<{id: string; name: string; field_type: string; value: string}>>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metadataList, setMetadataList] = useState<MetadataDefinition[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

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

  const [uploadingCount, setUploadingCount] = useState(0);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: FileItem[] = Array.from(selected).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      status: 'pending',
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    if (!kbName && newFiles[0]) {
      setKbName(newFiles[0].name.replace(/\.[^/.]+$/, ''));
    }

    // 自动上传文件
    for (const item of newFiles) {
      if (item.file) {
        await uploadSingleFile(item.id, item.file);
      }
    }
  }, [kbName]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files;
    const newFiles: FileItem[] = Array.from(dropped).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      status: 'pending',
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    if (!kbName && newFiles[0]) {
      setKbName(newFiles[0].name.replace(/\.[^/.]+$/, ''));
    }

    // 自动上传文件
    for (const item of newFiles) {
      if (item.file) {
        await uploadSingleFile(item.id, item.file);
      }
    }
  }, [kbName]);

  // 上传单个文件到 COS
  const uploadSingleFile = useCallback(async (id: string, file: File) => {
    setFiles((prev) => prev.map((f) => f.id === id ? {...f, status: 'uploading'} : f));
    setUploadingCount((c) => c + 1);
    try {
      const uploadedInfo = await uploadFile(file);
      setFiles((prev) => prev.map((f) => f.id === id ? {...f, status: 'done', uploadedInfo} : f));
    } catch (err) {
      setFiles((prev) => prev.map((f) => f.id === id ? {...f, status: 'error', error: (err as Error).message} : f));
    } finally {
      setUploadingCount((c) => c - 1);
    }
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canProceed = files.length > 0;

  const loadMetadata = useCallback(async () => {
    setMetaLoading(true);
    try {
      const data = await listMetadata();
      setMetadataList(data);
    } catch {
      // ignore
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const openMetadataModal = useCallback(() => {
    setTempSelectedIds(new Set(selectedMetadata.map((m) => m.id)));
    setShowMetadataModal(true);
    loadMetadata();
  }, [selectedMetadata, loadMetadata]);

  const closeMetadataModal = useCallback(() => {
    setShowMetadataModal(false);
  }, []);

  const confirmMetadataSelection = useCallback(() => {
    const newSelected = metadataList
      .filter((m) => tempSelectedIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        field_type: m.field_type,
        value: selectedMetadata.find((s) => s.id === m.id)?.value || '',
      }));
    setSelectedMetadata(newSelected);
    setShowMetadataModal(false);
  }, [metadataList, tempSelectedIds, selectedMetadata]);

  const removeSelectedMetadata = useCallback((id: string) => {
    setSelectedMetadata((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMetadataValue = useCallback((id: string, value: string) => {
    setSelectedMetadata((prev) =>
      prev.map((m) => (m.id === id ? {...m, value} : m))
    );
  }, []);

  const toggleTempMetadata = useCallback((id: string) => {
    setTempSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleField = useCallback((field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }, []);

  const removeField = useCallback((field: string) => {
    setSelectedFields((prev) => prev.filter((f) => f !== field));
  }, []);

  // 获取已上传成功的文件
  const getUploadedFiles = useCallback((): UploadedFile[] => {
    return files
      .filter((f) => f.status === 'done' && f.uploadedInfo)
      .map((f) => f.uploadedInfo!);
  }, [files]);

  // 获取当前选中的预览文件
  const getSelectedPreviewFile = useCallback((): FileItem | undefined => {
    if (selectedPreviewFileId) {
      return files.find((f) => f.id === selectedPreviewFileId);
    }
    // 默认返回第一个已上传成功的文件
    return files.find((f) => f.status === 'done' && f.uploadedInfo);
  }, [files, selectedPreviewFileId]);

  // 处理预览块
  const handlePreviewChunks = useCallback(async () => {
    const fileToPreview = getSelectedPreviewFile();
    if (!fileToPreview || !fileToPreview.uploadedInfo) {
      setPreviewError('请先上传文件');
      setPreviewState('error');
      return;
    }

    setPreviewState('loading');
    setPreviewError('');

    try {
      const fileExt = fileToPreview.name.split('.').pop()?.toLowerCase() || '';
      const metadataListPayload = selectedMetadata
        .filter((m) => m.value.trim() !== '')
        .map((m) => ({ [m.name]: m.value }));

      // 通用分段模式
      if (segmentMode === 'general') {
        const chunks = await previewChunks({
          file_id: fileToPreview.uploadedInfo.id,
          file_type: fileExt,
          separators: delimiter,
          chunk_size: maxLength,
          chunk_overlap: overlapLength,
          ddl_option1: preprocessRules.removeSpaces,
          ddl_option2: preprocessRules.removeUrls,
          metadata_list: metadataListPayload,
          auth_option: docPermission,
          belong_demain: selectedFields,
        });
        setPreviewChunkList(chunks);
        setPreviewParentChildList([]);
      } else {
        // 父子分段模式
        const parentChildResult = await previewParentChildChunks(
          {
            file_id: fileToPreview.uploadedInfo.id,
            file_type: fileExt,
            separators: delimiter,
            chunk_size: maxLength,
            chunk_overlap: overlapLength,
            ddl_option1: preprocessRules.removeSpaces,
            ddl_option2: preprocessRules.removeUrls,
            metadata_list: metadataListPayload,
            auth_option: docPermission,
            belong_demain: selectedFields,
          },
          {
            mode: parentChildConfig.parentMode,
            delimiter: parentChildConfig.parentDelimiter,
            max_length: parentChildConfig.parentMaxLength,
          },
          {
            delimiter: parentChildConfig.childDelimiter,
            max_length: parentChildConfig.childMaxLength,
          }
        );
        setPreviewParentChildList(parentChildResult);
        setPreviewChunkList([]);
      }

      setPreviewState('success');
    } catch (err) {
      setPreviewError((err as Error).message || '预览失败');
      setPreviewState('error');
    }
  }, [getSelectedPreviewFile, segmentMode, delimiter, maxLength, overlapLength, parentChildConfig, preprocessRules, docPermission, selectedFields, selectedMetadata]);

  const FIELD_OPTIONS = ['技术类', '人事类', '运维类', '客户类'];

  // 保存并处理
  const handleSaveAndProcess = useCallback(async () => {
    const fileToProcess = getSelectedPreviewFile();
    if (!fileToProcess || !fileToProcess.uploadedInfo) {
      setSaveError('请先上传文件');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const fileExt = fileToProcess.name.split('.').pop()?.toLowerCase() || '';
      const metadataListPayload = selectedMetadata
        .filter((m) => m.value.trim() !== '')
        .map((m) => ({ [m.name]: m.value }));

      await saveProcess({
        file_id: fileToProcess.uploadedInfo.id,
        file_type: fileExt,
        segment_mode: segmentMode,
        separators: segmentMode === 'general' ? delimiter : parentChildConfig.parentDelimiter,
        chunk_size: segmentMode === 'general' ? maxLength : parentChildConfig.parentMaxLength,
        chunk_overlap: overlapLength,
        ddl_option1: preprocessRules.removeSpaces,
        ddl_option2: preprocessRules.removeUrls,
        metadata_list: metadataListPayload,
        auth_option: docPermission,
        belong_demain: selectedFields,
      });

      // 成功后进入 step3
      setFiles((prev) => prev.map((f) => ({...f, status: 'done'})));
      setStep(3);
    } catch (err) {
      setSaveError((err as Error).message || '保存处理失败');
    } finally {
      setSaving(false);
    }
  }, [getSelectedPreviewFile, segmentMode, delimiter, maxLength, overlapLength, parentChildConfig, preprocessRules, docPermission, selectedFields, selectedMetadata]);

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
                  <div className="flex-[3] flex flex-col min-w-0 border-r border-surface-700/20">
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
                         style={{scrollbarWidth: 'thin', msOverflowStyle: 'auto'}}>
                      {/* 标题 */}
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-primary-500/60"/>
                        <h2 className="text-sm font-semibold text-surface-200 tracking-wide">分段设置</h2>
                      </div>

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
                                className="px-4 pb-4 space-y-5"
                            >
                              {/* 三个输入框 */}
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="flex items-center gap-1 text-xs text-surface-400 mb-2 font-medium">
                                    分段标识符
                                    <HelpCircle size={11} className="text-surface-600"/>
                                  </label>
                                  <input
                                      type="text"
                                      value={delimiter}
                                      onChange={(e) => setDelimiter(e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-surface-400 mb-2 font-medium">分段最大长度</label>
                                  <div className="relative">
                                     <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                    <input
                                        type="number"
                                        value={maxLength}
                                        onChange={(e) => setMaxLength(Number(e.target.value))}
                                        className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="flex items-center gap-1 text-xs text-surface-400 mb-2 font-medium">
                                    分段重叠长度
                                    <HelpCircle size={11} className="text-surface-600"/>
                                  </label>
                                  <div className="relative">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded">characters</span>
                                    <input
                                        type="number"
                                        value={overlapLength}
                                        onChange={(e) => setOverlapLength(Number(e.target.value))}
                                        className="w-full px-3 py-2 pr-20 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 文本预处理规则 */}
                              <div className="rounded-lg bg-surface-950/30 border border-surface-700/10 p-3.5 space-y-3">
                                <p className="text-xs font-medium text-surface-400">文本预处理规则</p>
                                <div className="space-y-2.5">
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
                              </div>

                              {/* 使用 Q&A 分段 */}
                              <div className="flex items-center gap-2">
                                <CustomCheckbox
                                    checked={preprocessRules.useQa}
                                    onChange={(v) => setPreprocessRules((p) => ({...p, useQa: v}))}
                                >
                                  <span className="text-sm text-surface-500">使用 Q&A 分段</span>
                                </CustomCheckbox>
                              </div>

                              {/* 底部按钮 */}
                              <div className="flex items-center justify-between pt-1">
                                <button
                                    onClick={handlePreviewChunks}
                                    disabled={previewState === 'loading' || files.every(f => f.status !== 'done')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                      previewState === 'loading'
                                        ? 'text-surface-500 bg-surface-800/20 border border-surface-700/10 cursor-not-allowed'
                                        : 'text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60'
                                    }`}>
                                  {previewState === 'loading' ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-surface-600 border-t-primary-500 rounded-full animate-spin"/>
                                      加载中...
                                    </>
                                  ) : (
                                    <>
                                      <Search size={12}/>
                                      预览块
                                    </>
                                  )}
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
                                      setPreviewState('idle');
                                      setPreviewChunkList([]);
                                      setPreviewError('');
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
                                className="px-4 pb-4 space-y-5"
                            >
                              {/* 父块用作上下文 */}
                              <div>
                                <p className="text-xs font-medium text-surface-400 mb-3">父块用作上下文</p>
                                <div className="grid grid-cols-2 gap-3">
                                  {/* 段落 Card */}
                                  <div
                                      onClick={() => setParentChildConfig(p => ({...p, parentMode: 'paragraph'}))}
                                      className={`rounded-xl border p-3 cursor-pointer transition-all ${
                                          parentChildConfig.parentMode === 'paragraph'
                                              ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                              : 'border-surface-700/20 bg-surface-950/20 hover:border-surface-700/40'
                                      }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          parentChildConfig.parentMode === 'paragraph' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                                      }`}>
                                        <FileText size={14}/>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className={`text-sm font-medium ${parentChildConfig.parentMode === 'paragraph' ? 'text-surface-100' : 'text-surface-300'}`}>
                                            段落
                                          </div>
                                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                              parentChildConfig.parentMode === 'paragraph'
                                                  ? 'border-primary-500'
                                                  : 'border-surface-600'
                                          }`}>
                                            {parentChildConfig.parentMode === 'paragraph' && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"/>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">按分隔符拆分为段落</p>
                                      </div>
                                    </div>

                                    {parentChildConfig.parentMode === 'paragraph' && (
                                        <motion.div
                                          initial={{opacity: 0, height: 0}}
                                          animate={{opacity: 1, height: 'auto'}}
                                          className="grid grid-cols-1 gap-2 mt-3"
                                        >
                                          <div>
                                            <label className="flex items-center gap-1 text-[11px] text-surface-500 mb-1.5">
                                              分段标识符
                                              <HelpCircle size={10} className="text-surface-600"/>
                                            </label>
                                            <input
                                                type="text"
                                                value={parentChildConfig.parentDelimiter}
                                                onChange={(e) => setParentChildConfig(p => ({
                                                  ...p,
                                                  parentDelimiter: e.target.value
                                                }))}
                                                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[11px] text-surface-500 mb-1.5">分段最大长度</label>
                                            <div className="relative">
                                              <input
                                                  type="number"
                                                  value={parentChildConfig.parentMaxLength}
                                                  onChange={(e) => setParentChildConfig(p => ({
                                                    ...p,
                                                    parentMaxLength: Number(e.target.value)
                                                  }))}
                                                  className="w-full px-2.5 py-1.5 pr-16 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                              />
                                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1 py-0.5 rounded">chars</span>
                                            </div>
                                          </div>
                                        </motion.div>
                                    )}
                                  </div>

                                  {/* 全文 Card */}
                                  <div
                                      onClick={() => setParentChildConfig(p => ({...p, parentMode: 'full'}))}
                                      className={`rounded-xl border p-3 cursor-pointer transition-all ${
                                          parentChildConfig.parentMode === 'full'
                                              ? 'border-primary-500/30 bg-primary-500/[0.03]'
                                              : 'border-surface-700/20 bg-surface-950/20 hover:border-surface-700/40'
                                      }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          parentChildConfig.parentMode === 'full' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                                      }`}>
                                        <BookOpen size={14}/>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className={`text-sm font-medium ${parentChildConfig.parentMode === 'full' ? 'text-surface-100' : 'text-surface-300'}`}>
                                            全文
                                          </div>
                                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                              parentChildConfig.parentMode === 'full'
                                                  ? 'border-primary-500'
                                                  : 'border-surface-600'
                                          }`}>
                                            {parentChildConfig.parentMode === 'full' && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"/>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">整个文档作为父块，超过 10000 标记自动截断</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 子块用于检索 */}
                              <div className="rounded-lg bg-surface-950/30 border border-surface-700/10 p-3.5 space-y-3">
                                <p className="text-xs font-medium text-surface-400">子块用于检索</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="flex items-center gap-1 text-[11px] text-surface-500 mb-1.5">
                                      分段标识符
                                      <HelpCircle size={10} className="text-surface-600"/>
                                    </label>
                                    <input
                                        type="text"
                                        value={parentChildConfig.childDelimiter}
                                        onChange={(e) => setParentChildConfig(p => ({
                                          ...p,
                                          childDelimiter: e.target.value
                                        }))}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-surface-500 mb-1.5">分段最大长度</label>
                                    <div className="relative">
                                      <input
                                          type="number"
                                          value={parentChildConfig.childMaxLength}
                                          onChange={(e) => setParentChildConfig(p => ({
                                            ...p,
                                            childMaxLength: Number(e.target.value)
                                          }))}
                                          className="w-full px-2.5 py-1.5 pr-16 rounded-lg bg-surface-950/50 border border-surface-700/30 text-sm text-surface-200 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-800/80 px-1 py-0.5 rounded">chars</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 文本预处理规则 */}
                              <div className="rounded-lg bg-surface-950/30 border border-surface-700/10 p-3.5 space-y-3">
                                <p className="text-xs font-medium text-surface-400">文本预处理规则</p>
                                <div className="space-y-2.5">
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
                              </div>

                              {/* 摘要自动生成 */}
                              <div className="flex items-center justify-between rounded-lg bg-surface-950/30 border border-surface-700/10 p-3.5">
                                <div>
                                  <p className="text-sm text-surface-300">摘要自动生成</p>
                                  <p className="text-[11px] text-surface-500 mt-0.5">为每个父块自动生成摘要</p>
                                </div>
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
                              <div className="flex items-center justify-between pt-1">
                                <button
                                    onClick={handlePreviewChunks}
                                    disabled={previewState === 'loading' || files.every(f => f.status !== 'done')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                      previewState === 'loading'
                                        ? 'text-surface-500 bg-surface-800/20 border border-surface-700/10 cursor-not-allowed'
                                        : 'text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60'
                                    }`}>
                                  {previewState === 'loading' ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-surface-600 border-t-primary-500 rounded-full animate-spin"/>
                                      加载中...
                                    </>
                                  ) : (
                                    <>
                                      <Search size={12}/>
                                      预览块
                                    </>
                                  )}
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
                                      setPreviewState('idle');
                                      setPreviewChunkList([]);
                                      setPreviewError('');
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

                      {/* 分隔线 */}
                      <div className="border-t border-surface-700/10 pt-3">
                        {/* 文档设置 */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-4 rounded-full bg-primary-500/60"/>
                          <h2 className="text-sm font-semibold text-surface-200 tracking-wide">文档设置</h2>
                        </div>
                      </div>

                      {/* 元数据设置 Card */}
                      <div className="rounded-xl border border-surface-700/20 bg-surface-900/30 overflow-hidden">
                        <button
                          onClick={openMetadataModal}
                          className="w-full flex items-center gap-3 p-4 text-left group"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-800 text-surface-500 group-hover:bg-primary-600/15 group-hover:text-primary-400 transition-all">
                            <SlidersHorizontal size={16}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-surface-200">元数据设置</div>
                            <p className="text-xs text-surface-500 mt-0.5">
                              {selectedMetadata.length > 0
                                ? `已配置 ${selectedMetadata.length} 个元数据字段`
                                : '为文档添加元数据字段'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/60 text-xs text-surface-400 group-hover:bg-primary-600/15 group-hover:text-primary-300 transition-all border border-surface-700/20 group-hover:border-primary-500/20">
                            <Plus size={12}/>
                            <span>添加</span>
                          </div>
                        </button>

                        {selectedMetadata.length > 0 ? (
                          <motion.div
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            className="px-4 pb-4"
                          >
                            {/* 表头 */}
                            <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-surface-500 font-medium border-b border-surface-700/10">
                              <span className="w-36">字段名</span>
                              <span className="flex-1">值</span>
                              <span className="w-6 text-right">操作</span>
                            </div>
                            <div className="max-h-44 overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
                              {selectedMetadata.map((meta) => (
                                <div
                                  key={meta.id}
                                  className="flex items-center gap-2 px-2.5 py-2 border-b border-surface-700/5 last:border-0 hover:bg-surface-800/20 transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
                                    <div className="flex items-center justify-center w-5 h-5 rounded bg-surface-800/60 border border-surface-700/20 flex-shrink-0">
                                      {meta.field_type === 'number' ? (
                                        <Hash size={9} className="text-surface-400"/>
                                      ) : meta.field_type === 'time' ? (
                                        <Clock size={9} className="text-surface-400"/>
                                      ) : (
                                        <Type size={9} className="text-surface-400"/>
                                      )}
                                    </div>
                                    <span className="text-xs text-surface-300 truncate">{meta.name}</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={meta.value}
                                    onChange={(e) => updateMetadataValue(meta.id, e.target.value)}
                                    placeholder="输入值"
                                    className="flex-1 min-w-0 px-2 py-1 rounded bg-surface-950/50 border border-surface-700/20 text-xs text-surface-200 placeholder:text-surface-600 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSelectedMetadata(meta.id);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-md text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                                  >
                                    <X size={11}/>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="px-4 pb-4">
                            <div className="rounded-lg bg-surface-950/30 border border-surface-700/10 p-3 flex items-center gap-2 text-xs text-surface-500">
                              <SlidersHorizontal size={12} className="text-surface-600"/>
                              <span>未配置元数据，点击上方添加按钮选择字段</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 权限设置 Card */}
                      <div className="rounded-xl border border-surface-700/20 bg-surface-900/30 overflow-hidden p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-800 text-surface-500">
                            <Users size={16}/>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-surface-200">权限设置</div>
                            <p className="text-xs text-surface-500 mt-0.5">选择谁可以查看此文档</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setDocPermission('public')}
                            className={`relative rounded-xl border p-3 text-left transition-all ${
                              docPermission === 'public'
                                ? 'border-primary-500/30 bg-primary-500/[0.04]'
                                : 'border-surface-700/20 bg-surface-950/20 hover:border-surface-700/40'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                docPermission === 'public' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                              }`}>
                                <Users size={14}/>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-sm font-medium ${docPermission === 'public' ? 'text-surface-100' : 'text-surface-300'}`}>
                                    全部可见
                                  </span>
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    docPermission === 'public' ? 'border-primary-500' : 'border-surface-600'
                                  }`}>
                                    {docPermission === 'public' && <div className="w-1.5 h-1.5 rounded-full bg-primary-500"/>}
                                  </div>
                                </div>
                                <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">所有人都可以查看和检索此文档</p>
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => setDocPermission('private')}
                            className={`relative rounded-xl border p-3 text-left transition-all ${
                              docPermission === 'private'
                                ? 'border-primary-500/30 bg-primary-500/[0.04]'
                                : 'border-surface-700/20 bg-surface-950/20 hover:border-surface-700/40'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                docPermission === 'private' ? 'bg-primary-600/15 text-primary-400' : 'bg-surface-800 text-surface-500'
                              }`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-sm font-medium ${docPermission === 'private' ? 'text-surface-100' : 'text-surface-300'}`}>
                                    仅自己可见
                                  </span>
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    docPermission === 'private' ? 'border-primary-500' : 'border-surface-600'
                                  }`}>
                                    {docPermission === 'private' && <div className="w-1.5 h-1.5 rounded-full bg-primary-500"/>}
                                  </div>
                                </div>
                                <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">仅文档创建者可以查看和检索</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 所属领域 Card */}
                      <div className="rounded-xl border border-surface-700/20 bg-surface-900/30 overflow-hidden p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-800 text-surface-500">
                            <Tag size={16}/>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-surface-200">所属领域</div>
                            <p className="text-xs text-surface-500 mt-0.5">选择文档所属的业务领域</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {FIELD_OPTIONS.map((field) => {
                            const isSelected = selectedFields.includes(field);
                            return (
                              <button
                                key={field}
                                onClick={() => toggleField(field)}
                                className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                                  isSelected
                                    ? 'border-primary-500/30 bg-primary-500/[0.04]'
                                    : 'border-surface-700/20 bg-surface-950/20 hover:border-surface-700/40'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded flex items-center justify-center transition-all border ${
                                  isSelected
                                    ? 'bg-primary-600 border-primary-500 shadow-sm shadow-primary-500/20'
                                    : 'bg-surface-950/50 border-surface-700/40'
                                }`}>
                                  {isSelected && <Check size={9} className="text-white" strokeWidth={3}/>}
                                </div>
                                <span className={`text-sm ${isSelected ? 'text-surface-100 font-medium' : 'text-surface-300'}`}>
                                  {field}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {selectedFields.length > 0 && (
                          <motion.div
                            initial={{opacity: 0, y: -4}}
                            animate={{opacity: 1, y: 0}}
                            className="mt-3 pt-3 border-t border-surface-700/10"
                          >
                            <p className="text-[11px] text-surface-500 mb-2">已选领域</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedFields.map((field) => (
                                <span
                                  key={field}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-xs text-primary-300"
                                >
                                  {field}
                                  <button
                                    onClick={() => removeField(field)}
                                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-500/20 transition-colors"
                                  >
                                    <X size={10}/>
                                  </button>
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    {saveError && (
                      <div className="px-6 py-2 bg-red-500/5 border-t border-red-500/10">
                        <p className="text-xs text-red-400 flex items-center gap-1.5">
                          <X size={12}/>
                          {saveError}
                        </p>
                      </div>
                    )}
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
                          onClick={handleSaveAndProcess}
                          disabled={saving}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white border border-primary-500/30 shadow-lg shadow-primary-600/20 transition-colors ${
                            saving
                              ? 'bg-primary-600/70 cursor-not-allowed'
                              : 'bg-primary-600 hover:bg-primary-500'
                          }`}
                      >
                        {saving ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            处理中...
                          </>
                        ) : (
                          <>
                            保存并处理
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Panel - Preview Chunk列表 */}
                  <div className="flex-[2] flex flex-col min-w-0 bg-surface-900/10">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/20">
                      <div className="flex items-center gap-2 text-xs text-surface-300">
                        <span className="text-[10px] text-primary-400 font-medium">预览</span>
                        <div className="w-px h-3 bg-surface-700/30"/>
                        {/* 文件选择器 */}
                        {getUploadedFiles().length > 1 ? (
                          <select
                            value={selectedPreviewFileId || getUploadedFiles()[0]?.id || ''}
                            onChange={(e) => setSelectedPreviewFileId(e.target.value)}
                            className="bg-surface-900/50 border border-surface-700/20 rounded px-2 py-0.5 text-[11px] text-surface-300 outline-none focus:border-primary-500/30"
                          >
                            {files.filter(f => f.status === 'done' && f.uploadedInfo).map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <FileText size={11} className="text-surface-500"/>
                            <span className="truncate max-w-[160px]">{getSelectedPreviewFile()?.name || '请选择文件'}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-surface-500 bg-surface-800/40 border border-surface-700/20 px-1.5 py-0.5 rounded">
                        {previewState === 'success'
                          ? (segmentMode === 'parent_child'
                            ? `${previewParentChildList.length} 个父块, ${previewParentChildList.reduce((sum, p) => sum + p.children.length, 0)} 个子块`
                            : `${previewChunkList.length} 个块`)
                          : '0 个块'}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4" style={{scrollbarWidth: 'thin'}}>
                      {previewState === 'idle' && (
                        <div className="h-full flex flex-col items-center justify-center text-surface-600">
                          <Search size={32} className="mb-3 opacity-20"/>
                          <p className="text-xs text-center">点击左侧的"预览块"按钮来加载预览</p>
                        </div>
                      )}

                      {previewState === 'loading' && (
                        <div className="h-full flex flex-col items-center justify-center text-surface-600">
                          <div className="w-6 h-6 border-2 border-surface-600 border-t-primary-500 rounded-full animate-spin mb-3"/>
                          <p className="text-xs text-center">正在预览分块...</p>
                        </div>
                      )}

                      {previewState === 'error' && (
                        <div className="h-full flex flex-col items-center justify-center text-surface-600">
                          <X size={32} className="mb-3 opacity-20 text-red-400"/>
                          <p className="text-xs text-center text-red-300">{previewError}</p>
                          <button
                            onClick={handlePreviewChunks}
                            className="mt-3 px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-300 bg-surface-800/40 border border-surface-700/20 hover:bg-surface-800/60 transition-colors"
                          >
                            重试
                          </button>
                        </div>
                      )}

                      {previewState === 'success' && previewChunkList.length === 0 && previewParentChildList.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-surface-600">
                          <FileText size={32} className="mb-3 opacity-20"/>
                          <p className="text-xs text-center">未生成分块，请检查分段参数</p>
                        </div>
                      )}

                      {/* 父子分段模式：父块包含子块的层级展示 */}
                      {previewState === 'success' && previewParentChildList.length > 0 && (
                        <div className="space-y-6">
                          {previewParentChildList.map((parent) => (
                            <div
                              key={parent.parentId}
                              className="rounded-xl border border-primary-500/20 bg-surface-900/30 overflow-hidden"
                            >
                              {/* 父块头部 */}
                              <div className="px-4 py-3 bg-primary-600/5 border-b border-primary-500/10">
                                <div className="flex items-center gap-2 text-[11px] text-primary-400 mb-1.5">
                                  <BookOpen size={10} className="text-primary-400"/>
                                  <span className="font-medium">父块-{parent.parentId}</span>
                                  <span className="text-primary-400/50">·</span>
                                  <span>{parent.parentLength} chars</span>
                                  <span className="text-primary-400/50">·</span>
                                  <span>{parent.children.length} 个子块</span>
                                </div>
                                <p className="text-sm text-surface-200 leading-relaxed line-clamp-3">
                                  {parent.parentContent}
                                </p>
                              </div>

                              {/* 子块列表 */}
                              {parent.children.length > 0 && (
                                <div className="p-3 space-y-2">
                                  {parent.children.map((child, childIdx) => (
                                    <div
                                      key={child.id}
                                      className="rounded-lg border border-surface-700/10 bg-surface-950/30 p-2.5 ml-3 relative"
                                    >
                                      {/* 连接线 */}
                                      <div className="absolute -left-3 top-3 w-3 h-px bg-surface-700/30"/>
                                      <div className="flex items-center gap-2 text-[10px] text-surface-500 mb-1">
                                        <LayoutTemplate size={9} className="text-primary-500/50"/>
                                        <span className="text-surface-400">子块-{childIdx + 1}</span>
                                        <span className="text-surface-600">·</span>
                                        <span>{child.length} chars</span>
                                      </div>
                                      <p className="text-xs text-surface-400 leading-relaxed">
                                        {child.content}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {previewState === 'success' && previewChunkList.length > 0 && (
                        <div className="space-y-4">
                          {previewChunkList.map((chunk) => (
                            <div
                              key={chunk.id}
                              className="rounded-lg border border-surface-700/10 bg-surface-900/20 p-3"
                            >
                              <div className="flex items-center gap-2 text-[11px] text-surface-500 mb-2">
                                <LayoutTemplate size={10} className="text-primary-500/60"/>
                                <span className="font-medium text-surface-400">Chunk-{chunk.id}</span>
                                <span className="text-surface-600">·</span>
                                <span>{chunk.length} chars</span>
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

          {/* 元数据多选弹窗 */}
          <AnimatePresence>
            {showMetadataModal && (
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.2}}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={closeMetadataModal}
              >
                <motion.div
                  initial={{opacity: 0, scale: 0.95, y: 10}}
                  animate={{opacity: 1, scale: 1, y: 0}}
                  exit={{opacity: 0, scale: 0.95, y: 10}}
                  transition={{duration: 0.2}}
                  className="w-[440px] max-w-[92vw] max-h-[85vh] flex flex-col rounded-xl border border-surface-700/30 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-3 border-b border-surface-700/20">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-surface-200">选择元数据</h3>
                      <button
                        onClick={closeMetadataModal}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
                      >
                        <X size={16}/>
                      </button>
                    </div>
                    <p className="text-xs text-surface-500">选择需要为此文档配置的元数据字段</p>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0" style={{scrollbarWidth: 'thin'}}>
                    {metaLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 text-surface-500">
                        <div className="w-6 h-6 border-2 border-surface-600 border-t-primary-500 rounded-full animate-spin mb-3"/>
                        <p className="text-sm">加载元数据中...</p>
                      </div>
                    ) : metadataList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-surface-600">
                        <div className="w-10 h-10 rounded-xl bg-surface-800/60 border border-surface-700/20 flex items-center justify-center mb-3">
                          <SlidersHorizontal size={18} className="text-surface-500"/>
                        </div>
                        <p className="text-sm text-surface-400 font-medium">暂无元数据</p>
                        <p className="text-xs text-surface-600 mt-1">请先前往知识库页面创建元数据字段</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {metadataList.map((meta) => {
                          const isSelected = tempSelectedIds.has(meta.id);
                          return (
                            <button
                              key={meta.id}
                              onClick={() => toggleTempMetadata(meta.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                                isSelected
                                  ? 'bg-primary-500/[0.06]'
                                  : 'hover:bg-surface-800/30'
                              }`}
                            >
                              <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all border ${
                                isSelected
                                  ? 'bg-primary-600 border-primary-500 shadow-sm shadow-primary-500/20'
                                  : 'bg-surface-950/50 border-surface-700/40'
                              }`}>
                                {isSelected && <Check size={10} className="text-white" strokeWidth={3}/>}
                              </div>
                              <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 border ${
                                isSelected
                                  ? 'bg-primary-600/10 border-primary-500/20 text-primary-400'
                                  : 'bg-surface-800/60 border-surface-700/20 text-surface-400'
                              }`}>
                                {meta.field_type === 'number' ? (
                                  <Hash size={13}/>
                                ) : meta.field_type === 'time' ? (
                                  <Clock size={13}/>
                                ) : (
                                  <Type size={13}/>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm truncate ${isSelected ? 'text-surface-100 font-medium' : 'text-surface-200'}`}>
                                    {meta.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-500 border border-surface-700/20">
                                    {meta.field_type}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-4 border-t border-surface-700/20 flex items-center justify-between">
                    <span className="text-xs text-surface-500">
                      已选择 <span className="text-surface-300 font-medium">{tempSelectedIds.size}</span> 个字段
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={closeMetadataModal}
                        className="px-4 py-2 rounded-lg bg-surface-800 border border-surface-700/30 text-sm text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={confirmMetadataSelection}
                        disabled={tempSelectedIds.size === 0}
                        className="px-4 py-2 rounded-lg bg-primary-600 border border-primary-500/30 text-sm text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
  );
}

