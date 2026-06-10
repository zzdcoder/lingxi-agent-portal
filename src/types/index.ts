export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}


export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  isStreaming?: boolean;
  /** 是否处于思考阶段（如 DeepSeek-R1 的 reasoning_content） */
  isThinking?: boolean;
  /** 思考过程的文本内容 */
  thinkingContent?: string;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}
