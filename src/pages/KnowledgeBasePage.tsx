import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowUpDown,
  ChevronDown,
  FileText,
  MoreHorizontal,
  Check,
  X,
  ExternalLink,
  Play,
  Ban,
  ScrollText,
  Sparkles,
  Archive,
  Download,
  Trash2,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  name: string;
  segmentMode: string;
  charCount: string;
  recallCount: number;
  uploadTime: string;
  status: 'archived' | 'active' | 'disabled';
}

const MOCK_DOCS: KnowledgeDoc[] = [
  {
    id: '1',
    name: '电商客服知识库.md',
    segmentMode: '通用',
    charCount: '1.3k',
    recallCount: 0,
    uploadTime: '2026-04-30 14:28',
    status: 'archived',
  },
  {
    id: '2',
    name: '产品FAQ文档.md',
    segmentMode: '通用',
    charCount: '8.5k',
    recallCount: 12,
    uploadTime: '2026-05-01 09:15',
    status: 'active',
  },
  {
    id: '3',
    name: '技术支持手册.pdf',
    segmentMode: '通用',
    charCount: '24.1k',
    recallCount: 5,
    uploadTime: '2026-05-02 16:42',
    status: 'active',
  },
  {
    id: '4',
    name: '销售话术库.md',
    segmentMode: '通用',
    charCount: '5.2k',
    recallCount: 0,
    uploadTime: '2026-05-03 11:20',
    status: 'disabled',
  },
];

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  archived: { label: '已归档', color: 'text-surface-500', dot: 'bg-surface-500' },
  active: { label: '已启用', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  disabled: { label: '已禁用', color: 'text-red-400', dot: 'bg-red-400' },
};

export default function KnowledgeBasePage({ onCreate }: { onCreate: () => void }) {
  const [docs] = useState<KnowledgeDoc[]>(MOCK_DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('uploadTime');
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredDocs = useMemo(() => {
    let result = [...docs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (sortBy === 'uploadTime') {
      result.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'recallCount') {
      result.sort((a, b) => b.recallCount - a.recallCount);
    }
    return result;
  }, [docs, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const pagedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = pagedDocs.length > 0 && pagedDocs.every((d) => selectedIds.has(d.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedDocs.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedDocs.forEach((d) => next.add(d.id));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedCount = selectedIds.size;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col flex-1 min-h-0"
    >
      {/* Header Info */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-lg font-bold text-surface-100 tracking-tight">文档</h1>
        <p className="text-sm text-surface-500 mt-1">
          知识库的所有文件都在这里显示，整个知识库都可以链接到 Dify 引用或通过 Chat 插件进行索引。
          <a href="#" className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-0.5 ml-1 transition-colors">
            了解更多 <ExternalLink size={12} />
          </a>
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
        {/* Filter Tag */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700/30 text-sm text-surface-300">
          <span>全部</span>
          <button className="text-surface-600 hover:text-surface-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700/30 flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="text-surface-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索"
            className="bg-transparent text-sm text-surface-200 placeholder:text-surface-600 outline-none flex-1"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700/30 text-sm text-surface-300 hover:bg-surface-800/80 transition-colors"
          >
            <span>排序：上传时间</span>
            <ChevronDown size={14} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-surface-700/30 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 py-1.5 z-50"
              >
                {[
                  { key: 'uploadTime', label: '上传时间' },
                  { key: 'name', label: '名称' },
                  { key: 'recallCount', label: '召回次数' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSortBy(item.key);
                      setSortOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                      sortBy === item.key
                        ? 'text-primary-300 bg-primary-500/10'
                        : 'text-surface-300 hover:text-surface-100 hover:bg-surface-800/60'
                    }`}
                  >
                    {sortBy === item.key && <Check size={14} />}
                    <span className={sortBy === item.key ? 'ml-0' : 'ml-5'}>{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-500 hover:text-surface-300 hover:bg-surface-800/80 transition-colors">
          <ArrowUpDown size={14} />
        </button>

        <div className="flex-1" />

        {/* Metadata */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800/60 border border-surface-700/30 text-sm text-surface-300 hover:bg-surface-800/80 transition-colors">
          <SlidersHorizontal size={14} />
          元数据
        </button>

        {/* Add File */}
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 border border-primary-500/30 text-sm text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/20"
        >
          <Plus size={14} />
          添加文件
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        <div className="min-w-[800px] border border-surface-700/20 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center px-4 py-3 bg-surface-900/40 border-b border-surface-700/20 text-xs text-surface-500 font-medium">
            <div className="w-10 flex items-center justify-center">
              <button
                onClick={toggleSelectAll}
                className="text-surface-500 hover:text-surface-300 transition-colors"
              >
                {allSelected ? <CheckSquare size={16} className="text-primary-400" /> : <Square size={16} />}
              </button>
            </div>
            <div className="w-10 text-center">#</div>
            <div className="flex-1 min-w-[200px]">名称</div>
            <div className="w-28 text-center">分段模式</div>
            <div className="w-24 text-center">字符数</div>
            <div className="w-24 text-center">召回次数</div>
            <div className="w-36 text-center">上传时间</div>
            <div className="w-28 text-center">状态</div>
            <div className="w-24 text-right">操作</div>
          </div>

          {/* Table Body */}
          {pagedDocs.map((doc, index) => {
            const statusInfo = STATUS_MAP[doc.status];
            const isSelected = selectedIds.has(doc.id);
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`flex items-center px-4 py-3 border-b border-surface-700/10 text-sm transition-colors ${
                  isSelected ? 'bg-primary-500/5' : 'hover:bg-surface-800/30'
                }`}
              >
                <div className="w-10 flex items-center justify-center">
                  <button
                    onClick={() => toggleSelect(doc.id)}
                    className="text-surface-500 hover:text-surface-300 transition-colors"
                  >
                    {isSelected ? <CheckSquare size={16} className="text-primary-400" /> : <Square size={16} />}
                  </button>
                </div>
                <div className="w-10 text-center text-surface-500">{doc.id}</div>
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <FileText size={16} className="text-primary-400 flex-shrink-0" />
                  <span className="text-surface-200 truncate">{doc.name}</span>
                </div>
                <div className="w-28 flex justify-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-800/60 border border-surface-700/30 text-xs text-surface-400">
                    <SlidersHorizontal size={10} />
                    {doc.segmentMode}
                  </span>
                </div>
                <div className="w-24 text-center text-surface-300">{doc.charCount}</div>
                <div className="w-24 text-center text-surface-300">{doc.recallCount}</div>
                <div className="w-36 text-center text-surface-400 text-xs">{doc.uploadTime}</div>
                <div className="w-28 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${statusInfo.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                </div>
                <div className="w-24 flex items-center justify-end gap-1">
                  <button className="p-1.5 rounded-md text-surface-600 hover:text-surface-300 hover:bg-surface-800/50 transition-colors">
                    <Play size={13} />
                  </button>
                  <button className="p-1.5 rounded-md text-surface-600 hover:text-surface-300 hover:bg-surface-800/50 transition-colors">
                    <MoreHorizontal size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {pagedDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-surface-600">
              <FileText size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无文档</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="px-6 pb-4">
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center mb-4"
            >
              <div className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-surface-900/80 border border-surface-700/30 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                  {selectedCount}
                </span>
                <span className="text-sm text-primary-300 font-medium mr-2">已选择</span>

                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <Play size={13} />
                  启用
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <Ban size={13} />
                  禁用
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <ScrollText size={13} />
                  元数据
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <Sparkles size={13} />
                  生成摘要
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <Archive size={13} />
                  归档
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-colors">
                  <Download size={13} />
                  下载
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={13} />
                  删除
                </button>
                <div className="w-px h-5 bg-surface-700/30 mx-1" />
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-lg text-sm text-surface-400 hover:text-surface-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-400 hover:text-surface-200 hover:bg-surface-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
            <span className="text-sm text-surface-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-400 hover:text-surface-200 hover:bg-surface-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {[10, 25, 50].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                  pageSize === size
                    ? 'bg-surface-700/60 text-surface-200'
                    : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/40'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
