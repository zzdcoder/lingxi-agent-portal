/**
 * LLM API Service Layer
 *
 * 提供统一的 LLM 接入入口，支持 SSE 流式响应。
 * 默认包含 Mock 实现用于前端独立演示，接入真实后端时修改 BASE_URL 即可。
 */

import type { Attachment } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const USE_MOCK_CHAT = import.meta.env.VITE_USE_MOCK_CHAT === 'true';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachment_ids?: string[];
}

interface BackendAttachment {
  id: string | number;
  name?: string;
  original_name?: string;
  mimeType?: string;
  content_type?: string;
  size: number;
  url: string;
}

export interface BackendConversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface BackendMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: BackendAttachment[];
  thinking_content?: string;
  created_at: string;
}

export interface StreamCallbacks {
  onThinking?: (text: string) => void;
  onContent?: (text: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export async function listConversations(): Promise<BackendConversation[]> {
  return requestJson<BackendConversation[]>('/conversations');
}

export async function createConversation(title: string, model: string): Promise<BackendConversation> {
  const params = new URLSearchParams({ title, model });
  return requestJson<BackendConversation>(`/conversations?${params.toString()}`, {
    method: 'POST',
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await requestJson<void>(`/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function listMessages(conversationId: string): Promise<BackendMessage[]> {
  return requestJson<BackendMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export async function uploadAttachment(conversationId: string | undefined, file: File): Promise<Attachment> {
  if (USE_MOCK_CHAT) {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url: URL.createObjectURL(file),
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversation_id', conversationId);
  }

  const attachment = await requestJson<BackendAttachment>('/attachments', {
    method: 'POST',
    body: formData,
  });

  return mapBackendAttachment(attachment);
}

export function streamChat(
  messages: ChatMessage[],
  model: string,
  conversation_id: string,
  callbacks: StreamCallbacks
): { abort: () => void } {
  if (USE_MOCK_CHAT) {
    return mockStreamChat(messages, model, callbacks);
  }

  const controller = new AbortController();

  fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ messages, model, conversation_id }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        throw new Error(`请求失败，请稍后重试（${res.status}）`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            callbacks.onDone?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.thinking) callbacks.onThinking?.(parsed.thinking);
            if (parsed.content) callbacks.onContent?.(parsed.content);
            if (parsed.done) {
              callbacks.onDone?.();
              return;
            }
          } catch {
            callbacks.onContent?.(data);
          }
        }
      }

      callbacks.onDone?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    });

  return { abort: () => controller.abort() };
}

/**
 * 从 localStorage 读取 JWT Token 并构建 Authorization 请求头
 * 所有受保护的 API 请求都会自动携带此头部
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  // 自动合并认证请求头，确保受保护接口可以正常访问
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    throw new Error(`请求失败，请稍后重试（${res.status}）`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export function mapBackendAttachment(attachment: BackendAttachment): Attachment {
  return {
    id: String(attachment.id),
    name: attachment.name || attachment.original_name || '未命名附件',
    mimeType: attachment.mimeType || attachment.content_type || 'application/octet-stream',
    size: attachment.size,
    url: attachment.url,
  };
}

/* ===================== Mock SSE Implementation ===================== */

function mockStreamChat(
  messages: ChatMessage[],
  model: string,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const userContent = messages[messages.length - 1]?.content || '';
  let aborted = false;

  const thinkingTexts: Record<string, string> = {
    'qwen-turbo': `1.  分析用户问题："${userContent.slice(0, 30)}..."\n2.  检索相关上下文...\n3.  构建回答框架...`,
    'qwen-plus': `理解问题上下文，提取关键实体，检索相关文档...`,
    'deepseek-r1': `step 1: parse_query("${userContent.slice(0, 20)}...")\nstep 2: reason_over_context()\nstep 3: generate_response()`,
  };

  const answerTexts: Record<string, string> = {
    'qwen-turbo': `收到你的问题：**"${userContent.trim()}"**

这是一个很好的问题。让我从多个维度来分析：

## 核心思路

在工程实践中，我们通常采用分层架构来解耦复杂性。具体步骤如下：

1. **识别边界** - 明确业务领域的核心实体和关系
2. **抽象接口** - 定义稳定的契约，隐藏实现细节
3. **组合验证** - 通过单元测试和集成测试确保正确性

\`\`\`typescript
interface Solution<T> {
  analyze(problem: T): Strategy<T>;
  execute(strategy: Strategy<T>): Result<T>;
}
\`\`\`

## 实践建议

> 不要过早优化。先让代码正确工作，再考虑性能。

如果你需要更具体的代码示例或架构图，请告诉我！`,
    'qwen-plus': `关于「${userContent.trim().slice(0, 15)}...」，我有以下见解：

长文本处理能力让我可以为你梳理完整的上下文。核心要点是：**保持简洁，追求表达力**。

建议阅读《代码大全》第 6 章关于抽象层次的内容。`,
    'deepseek-r1': `\`\`\`python
def solve(problem: str) -> Solution:
    # 1. 解析问题
    parsed = parse(problem)
    # 2. 构建图模型
    graph = build_graph(parsed)
    # 3. 执行搜索
    return search(graph)
\`\`\`

这是处理「${userContent.trim().slice(0, 20)}...」的标准范式。`,
  };

  const thinkingText = thinkingTexts[model] || thinkingTexts['qwen-turbo'];
  const answerText = answerTexts[model] || answerTexts['qwen-turbo'];

  // Phase 1: Thinking (3 seconds)
  const thinkingChars = thinkingText.split('');
  let thinkingIndex = 0;
  let currentThinking = '';

  const thinkInterval = setInterval(() => {
    if (aborted) {
      clearInterval(thinkInterval);
      return;
    }
    if (thinkingIndex >= thinkingChars.length) {
      clearInterval(thinkInterval);
      // Phase 2: Answering
      startAnswering();
      return;
    }
    currentThinking += thinkingChars[thinkingIndex];
    callbacks.onThinking?.(currentThinking);
    thinkingIndex++;
  }, 40);

  function startAnswering() {
    const answerChars = answerText.split('');
    let answerIndex = 0;
    let currentAnswer = '';

    const answerInterval = setInterval(() => {
      if (aborted) {
        clearInterval(answerInterval);
        return;
      }
      if (answerIndex >= answerChars.length) {
        clearInterval(answerInterval);
        callbacks.onDone?.();
        return;
      }
      currentAnswer += answerChars[answerIndex];
      callbacks.onContent?.(currentAnswer);
      answerIndex++;
    }, 15 + Math.random() * 20);
  }

  return {
    abort: () => {
      aborted = true;
    },
  };
}
