import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, Conversation } from '../types';
import { generateId } from '../utils/id';
import { welcomeMessage } from '../utils/mockData';
import {
  createConversation as createBackendConversation,
  deleteConversation as deleteBackendConversation,
  listConversations,
  listMessages,
  mapBackendAttachment,
  streamChat,
  uploadAttachment,
} from '../services/llm';
import type { BackendConversation, BackendMessage } from '../services/llm';

const DEFAULT_MODEL = 'qwen-turbo';

interface RunningStream {
  abort: () => void;
  conversation_id: string;
  assistantId: string;
}

export function useChat(enabled: boolean = true) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(DEFAULT_MODEL);
  const abortRef = useRef<RunningStream | null>(null);
  const hasLoadedRef = useRef(false);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      const backendMessages = await listMessages(conversationId);
      const messages = backendMessages.map(mapBackendMessage);

      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === conversationId && !conversation.messages.some(message => message.isStreaming)
            ? { ...conversation, messages: withWelcomeMessage(messages) }
            : conversation
        )
      );
    } catch (err) {
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  createErrorMessage(`加载消息失败：${getErrorMessage(err)}`),
                ],
              }
            : conversation
        )
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    let cancelled = false;

    async function loadInitialConversations() {
      try {
        const backendConversations = await listConversations();
        if (cancelled) return;

        const mapped = backendConversations.map(mapBackendConversation);
        setConversations(mapped);

        const firstConversation = mapped[0];
        if (firstConversation) {
          setActiveConversationId(firstConversation.id);
          setActiveModel(firstConversation.model || DEFAULT_MODEL);
          await loadConversationMessages(firstConversation.id);
        }
      } catch (err) {
        if (cancelled) return;

        const localId = generateId();
        setActiveConversationId(localId);
        setConversations([
          {
            id: localId,
            title: '后端连接失败',
            model: DEFAULT_MODEL,
            messages: [
              welcomeMessage,
              createErrorMessage(`无法连接后端：${getErrorMessage(err)}`),
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    }

    void loadInitialConversations();

    return () => {
      cancelled = true;
    };
  }, [loadConversationMessages, enabled]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || {
    id: activeConversationId,
    title: '新对话',
    model: activeModel,
    messages: [welcomeMessage],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sendMessage = useCallback(async (content: string, files: File[] = []) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isLoading) return;

    setIsLoading(true);

    let conversationId = activeConversationId;

    try {
      let conversation = conversations.find(item => item.id === conversationId);

      if (!conversation) {
        const backendConversation = await createBackendConversation(buildTitle(trimmedContent), activeModel);
        conversation = mapBackendConversation(backendConversation);
        conversationId = conversation.id;
        setActiveConversationId(conversationId);
        setConversations(prev => [conversation!, ...prev]);
      }

      let historyMessages = conversation.messages;
      if (historyMessages.length <= 1) {
        try {
          const backendMessages = await listMessages(conversationId);
          historyMessages = withWelcomeMessage(backendMessages.map(mapBackendMessage));
          setConversations(prev =>
            prev.map(item =>
              item.id === conversationId && !item.messages.some(message => message.isStreaming)
                ? { ...item, messages: historyMessages }
                : item
            )
          );
        } catch {
          historyMessages = conversation.messages;
        }
      }

      const uploadedAttachments = await Promise.all(files.map(file => uploadAttachment(conversationId || undefined, file)));
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: trimmedContent,
        attachments: uploadedAttachments,
        timestamp: new Date(),
      };
      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        isThinking: true,
        thinkingContent: '',
      };

      setConversations(prev =>
        prev.map(item =>
          item.id === conversationId
            ? {
                ...item,
                title: item.messages.length <= 1
                  ? buildTitle(trimmedContent)
                  : item.title,
                messages: [...item.messages, userMessage, assistantMessage],
                updatedAt: new Date(),
              }
            : item
        )
      );

      const historyApiMessages = historyMessages
        .filter(isRealMessage)
        .map(message => ({
          role: message.role,
          content: message.content,
          attachment_ids: message.attachments?.map(attachment => attachment.id),
        }));

      const apiMessages = [
        ...historyApiMessages,
        {
          role: userMessage.role,
          content: userMessage.content,
          attachment_ids: uploadedAttachments.map(attachment => attachment.id),
        },
      ];

      const stream = streamChat(apiMessages, activeModel, conversationId, {
        onThinking: (text) => {
          setConversations(prev =>
            prev.map(item =>
              item.id === conversationId
                ? {
                    ...item,
                    messages: item.messages.map(message =>
                      message.id === assistantId
                        ? { ...message, thinkingContent: text, isThinking: true }
                        : message
                    ),
                  }
                : item
            )
          );
        },
        onContent: (text) => {
          setConversations(prev =>
            prev.map(item =>
              item.id === conversationId
                ? {
                    ...item,
                    messages: item.messages.map(message =>
                      message.id === assistantId
                        ? { ...message, content: text, isThinking: false, isStreaming: true }
                        : message
                    ),
                  }
                : item
            )
          );
        },
        onDone: () => {
          setConversations(prev =>
            prev.map(item =>
              item.id === conversationId
                ? {
                    ...item,
                    messages: item.messages.map(message =>
                      message.id === assistantId
                        ? { ...message, isStreaming: false, isThinking: false }
                        : message
                    ),
                    updatedAt: new Date(),
                  }
                : item
            )
          );
          setIsLoading(false);
          abortRef.current = null;
        },
        onError: (err) => {
          setConversations(prev =>
            prev.map(item =>
              item.id === conversationId
                ? {
                    ...item,
                    messages: item.messages.map(message =>
                      message.id === assistantId
                        ? {
                            ...message,
                            content: `请求出错：${err.message}`,
                            isStreaming: false,
                            isThinking: false,
                          }
                        : message
                    ),
                  }
                : item
            )
          );
          setIsLoading(false);
          abortRef.current = null;
        },
      });
      abortRef.current = { ...stream, conversation_id: conversationId, assistantId };
    } catch (err) {
      const errorMessage = createErrorMessage(`发送失败：${getErrorMessage(err)}`);
      setConversations(prev =>
        prev.map(item =>
          item.id === conversationId
            ? { ...item, messages: [...item.messages, errorMessage], updatedAt: new Date() }
            : item
        )
      );
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeConversationId, activeModel, conversations, isLoading]);

  const stopGenerating = useCallback(() => {
    const runningStream = abortRef.current;
    runningStream?.abort();
    abortRef.current = null;
    setIsLoading(false);

    const targetConversationId = runningStream?.conversation_id || activeConversationId;
    const targetAssistantId = runningStream?.assistantId;

    setConversations(prev =>
      prev.map(conversation =>
        conversation.id === targetConversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                targetAssistantId && message.id !== targetAssistantId
                  ? message
                  : message.isStreaming
                    ? { ...message, isStreaming: false, isThinking: false }
                    : message
              ),
            }
          : conversation
      )
    );
  }, [activeConversationId]);

  const createNewChat = useCallback(async () => {
    try {
      const backendConversation = await createBackendConversation('新对话', activeModel);
      const conversation = mapBackendConversation(backendConversation);
      setActiveConversationId(conversation.id);
      setConversations(prev => [conversation, ...prev.filter(item => item.id !== conversation.id)]);
    } catch (err) {
      const errorMessage = createErrorMessage(`创建对话失败：${getErrorMessage(err)}`);
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === activeConversationId
            ? { ...conversation, messages: [...conversation.messages, errorMessage] }
            : conversation
        )
      );
    }
  }, [activeConversationId, activeModel]);

  const switchConversation = useCallback((id: string) => {
    const conversation = conversations.find(item => item.id === id);
    setActiveConversationId(id);
    if (conversation?.model) {
      setActiveModel(conversation.model);
    }
    void loadConversationMessages(id);
  }, [conversations, loadConversationMessages]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await deleteBackendConversation(id);
      const remaining = conversations.filter(conversation => conversation.id !== id);
      setConversations(remaining);

      if (activeConversationId === id) {
        const nextConversation = remaining[0];
        setActiveConversationId(nextConversation?.id || '');
        if (nextConversation) {
          setActiveModel(nextConversation.model || DEFAULT_MODEL);
          void loadConversationMessages(nextConversation.id);
        }
      }
    } catch (err) {
      const errorMessage = createErrorMessage(`删除对话失败：${getErrorMessage(err)}`);
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === activeConversationId
            ? { ...conversation, messages: [...conversation.messages, errorMessage] }
            : conversation
        )
      );
    }
  }, [activeConversationId, conversations, loadConversationMessages]);

  const reset = useCallback(() => {
    setConversations([]);
    setActiveConversationId('');
    setIsLoading(false);
    setActiveModel(DEFAULT_MODEL);
    abortRef.current = null;
    hasLoadedRef.current = false;
  }, []);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    activeModel,
    setActiveModel,
    sendMessage,
    stopGenerating,
    createNewChat,
    switchConversation,
    deleteConversation,
    reset,
  };
}

function mapBackendConversation(conversation: BackendConversation): Conversation {
  return {
    id: String(conversation.id),
    title: conversation.title,
    model: conversation.model,
    messages: [welcomeMessage],
    createdAt: parseBackendDate(conversation.created_at),
    updatedAt: parseBackendDate(conversation.updated_at),
  };
}

function mapBackendMessage(message: BackendMessage): Message {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    attachments: message.attachments?.map(mapBackendAttachment),
    thinkingContent: message.thinking_content,
    timestamp: parseBackendDate(message.created_at),
  };
}

function parseBackendDate(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function withWelcomeMessage(messages: Message[]): Message[] {
  return messages.length > 0 ? messages : [welcomeMessage];
}

function isRealMessage(message: Message): boolean {
  return message.id !== welcomeMessage.id
    && (Boolean(message.content.trim()) || Boolean(message.attachments?.length))
    && !message.isStreaming;
}

function createErrorMessage(content: string): Message {
  return {
    id: generateId(),
    role: 'assistant',
    content,
    timestamp: new Date(),
  };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '未知错误';
}

function buildTitle(content: string): string {
  return content.length > 20 ? `${content.slice(0, 20)}...` : content;
}
