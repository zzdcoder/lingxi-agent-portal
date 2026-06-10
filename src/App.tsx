import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';
import AuthPage from './pages/AuthPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import KnowledgeBaseCreatePage from './pages/KnowledgeBaseCreatePage';
import { getMe, type User } from './services/auth';

type AppPage = 'chat' | 'knowledge-base' | 'knowledge-base-create';

function App() {
  // ===== 认证状态管理 =====
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ===== 页面路由状态 =====
  const [currentPage, setCurrentPage] = useState<AppPage>('chat');

  // ===== 聊天业务逻辑 Hook =====
  const {
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
  } = useChat(isAuthenticated);

  // ===== 应用启动时尝试恢复登录状态 =====
  // 从 localStorage 读取 Token，若存在则调用 /api/auth/me 验证其有效性
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    getMe(token)
      .then((u) => {
        setUser(u);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Token 无效或过期，清除本地存储
        localStorage.removeItem('access_token');
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // ===== 登录成功回调 =====
  const handleLoginSuccess = useCallback((u: User, token: string) => {
    setUser(u);
    setIsAuthenticated(true);
    localStorage.setItem('access_token', token);
  }, []);

  // ===== 退出登录 =====
  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    setUser(null);
    reset();
    setIsAuthenticated(false);
    setCurrentPage('chat');
  }, [reset]);

  // ===== 认证状态加载中 =====
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen bg-surface-950 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="h-screen w-screen"
        >
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="flex h-screen w-screen bg-surface-950 overflow-hidden"
        >
          {/* Sidebar */}
          <Sidebar
            conversations={conversations}
            activeId={activeConversationId}
            onNewChat={() => {
              createNewChat();
              setCurrentPage('chat');
            }}
            onSwitch={(id) => {
              switchConversation(id);
              setCurrentPage('chat');
            }}
            onDelete={deleteConversation}
            username={user?.username}
            userType={user?.user_type}
            onLogout={handleLogout}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-surface-950 to-surface-900/30">
            {currentPage === 'chat' && (
              <>
                <ChatHeader
                  title={activeConversation.title}
                  activeModel={activeModel}
                  onModelChange={setActiveModel}
                  onNavigateToKnowledgeBase={() => setCurrentPage('knowledge-base')}
                />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeConversationId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <MessageList messages={activeConversation.messages} />
                    <ChatInput onSend={sendMessage} onStop={stopGenerating} isLoading={isLoading} />
                  </motion.div>
                </AnimatePresence>
              </>
            )}

            {currentPage === 'knowledge-base' && (
              <>
                <ChatHeader
                  title=""
                  activeModel={activeModel}
                  onModelChange={setActiveModel}
                  onNavigateToKnowledgeBase={() => setCurrentPage('knowledge-base')}
                  showBackButton
                  onBack={() => setCurrentPage('chat')}
                  pageTitle="知识库维护"
                />
                <KnowledgeBasePage onCreate={() => setCurrentPage('knowledge-base-create')} />
              </>
            )}

            {currentPage === 'knowledge-base-create' && (
              <KnowledgeBaseCreatePage
                onBack={() => setCurrentPage('knowledge-base')}
                onFinish={() => setCurrentPage('knowledge-base')}
              />
            )}
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
