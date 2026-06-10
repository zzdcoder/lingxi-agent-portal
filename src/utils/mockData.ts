import type { Conversation, ModelInfo } from '../types';
import { generateId } from './id';

export const models: ModelInfo[] = [
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    description: '快速通用对话模型',
    icon: 'brain',
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    description: '更强的综合理解与生成',
    icon: 'sparkles',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: '推理过程可视化',
    icon: 'code-2',
  },
];

export const initialConversations: Conversation[] = [
  {
    id: generateId(),
    title: 'React 性能优化方案',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2 + 3600000),
    messages: [
      {
        id: generateId(),
        role: 'user',
        content: '如何在 React 中优化大型列表的渲染性能？',
        timestamp: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: generateId(),
        role: 'assistant',
        content: `在 React 中优化大型列表渲染有以下几个核心策略：

## 1. 虚拟滚动 (Virtualization)

只渲染可视区域内的元素：

\`\`\`tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div key={virtualItem.key} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualItem.size,
            transform: \`translateY(\${virtualItem.start}px)\`,
          }}>
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\`

## 2. 使用 React.memo 避免不必要重渲染

\`\`\`tsx
const ListItem = React.memo(({ item, onSelect }) => {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
}, (prev, next) => prev.item.id === next.item.id);
\`\`\`

## 3. 状态拆分与原子化

避免将所有状态放在顶层，使用状态管理库如 Zustand 或 Jotai 进行细粒度订阅。`,
        timestamp: new Date(Date.now() - 86400000 * 2 + 3600000),
      },
    ],
  },
  {
    id: generateId(),
    title: 'TypeScript 类型体操',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000 + 1800000),
    messages: [
      {
        id: generateId(),
        role: 'user',
        content: '如何实现一个 DeepPartial 类型？',
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: generateId(),
        role: 'assistant',
        content: '你可以使用递归映射类型来实现 DeepPartial：\n\n```typescript\ntype DeepPartial<T> = {\n  [P in keyof T]?: T[P] extends object\n    ? DeepPartial<T[P]>\n    : T[P];\n};\n```',
        timestamp: new Date(Date.now() - 86400000 + 1800000),
      },
    ],
  },
  {
    id: generateId(),
    title: 'Docker 部署指南',
    createdAt: new Date(Date.now() - 3600000 * 5),
    updatedAt: new Date(Date.now() - 3600000 * 4),
    messages: [],
  },
];

export const welcomeMessage = {
  id: generateId(),
  role: 'assistant' as const,
  content: `你好！我是你的 灵犀智能助手，基于先进的深度学习技术构建。

我可以帮你：
- 💻 编写、解释和调试代码
- 📝 撰写技术文档和文章
- 🧠 解决算法和架构问题
- 🎨 设计前端界面和交互方案
- ⚡ 优化性能和排查故障

有什么我可以帮你的吗？`,
  timestamp: new Date(),
};
