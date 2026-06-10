/**
 * 认证页面组件
 * 包含登录和注册两个标签页，整体采用与聊天界面一致的暗色玻璃拟态风格
 * 新增：动态粒子背景特效
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Eye, EyeOff, RefreshCw, ShieldCheck, Factory, Smartphone } from 'lucide-react';
import { getCaptcha, login, register, type CaptchaData, type User } from '../services/auth';

/** 用户类型选项 */
const USER_TYPES = [
  { value: 'manufacturer', label: '厂商用户', icon: Factory },
  { value: 'mobile', label: '移动用户', icon: Smartphone },
] as const;

interface AuthPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

// ===== 动态粒子背景组件 =====
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 粒子配置：数量、颜色（紫/蓝/白）、速度、连线距离
    const PARTICLE_COUNT = 70;
    const CONNECT_DISTANCE = 120;
    const COLORS = [
      { r: 139, g: 92, b: 246 },  // violet-500
      { r: 59, g: 130, b: 246 },  // blue-500
      { r: 168, g: 162, b: 158 }, // stone-400
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: typeof COLORS[number];
      alpha: number;
    }

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 更新并绘制粒子
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // 边缘反弹
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // 绘制粒子光晕
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
        ctx.fill();

        // 绘制粒子外发光
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        gradient.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 连线
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            const lineAlpha = (1 - dist / CONNECT_DISTANCE) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  // ===== 标签页状态 =====
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // ===== 表单字段状态 =====
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<string>('manufacturer');
  const [captchaText, setCaptchaText] = useState('');

  // ===== UI 状态 =====
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== 加载验证码 =====
  const refreshCaptcha = useCallback(async () => {
    try {
      const data = await getCaptcha();
      setCaptcha(data);
      setCaptchaText('');
    } catch {
      setError('验证码加载失败，请刷新页面重试');
    }
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  // ===== 切换标签页时重置表单 =====
  useEffect(() => {
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setCaptchaText('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    refreshCaptcha();
  }, [activeTab, refreshCaptcha]);

  // ===== 表单校验 =====
  const validate = (): boolean => {
    if (!username.trim()) {
      setError('请输入用户名');
      return false;
    }
    if (!password) {
      setError('请输入密码');
      return false;
    }
    if (activeTab === 'register') {
      if (password.length < 6) {
        setError('密码长度至少为 6 位');
        return false;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return false;
      }
      if (!userType) {
        setError('请选择用户类型');
        return false;
      }
    }
    if (!captchaText.trim()) {
      setError('请输入验证码');
      return false;
    }
    if (!captcha) {
      setError('验证码未加载，请刷新重试');
      return false;
    }
    return true;
  };

  // ===== 清除错误提示 =====
  const clearError = useCallback(() => {
    setError('');
  }, []);

  // ===== 提交处理 =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const res = await login(username, password, captcha!.captcha_id, captchaText);
        // 登录成功，保存 Token 并通知父组件
        localStorage.setItem('access_token', res.access_token);
        onLoginSuccess(res.user, res.access_token);
      } else {
        await register(username, password, userType, captcha!.captcha_id, captchaText);
        // 注册成功后自动切换到登录页
        setActiveTab('login');
        setError('');
        // 清空密码，保留用户名方便登录
        setPassword('');
        setConfirmPassword('');
        setCaptchaText('');
        refreshCaptcha();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请稍后重试';
      setError(msg);
      // 错误发生后刷新验证码，防止暴力枚举
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-surface-950 overflow-hidden">
      {/* 动态粒子背景 */}
      <ParticleBackground />

      {/* 背景装饰：紫色径向渐变光晕 */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-500/8 blur-[120px]" />
      </div>

      {/* 主卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md mx-4"
        style={{ zIndex: 10 }}
      >
        <div className="glass-panel rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg shadow-primary-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-100 tracking-tight">
              灵犀智能助手
            </h1>
            <p className="text-sm text-surface-400 mt-1">安全、智能的对话体验</p>
          </div>

          {/* 标签切换 */}
          <div className="flex relative mb-6 bg-surface-900/80 rounded-xl p-1 border border-surface-700/30">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab ? 'text-white' : 'text-surface-400 hover:text-surface-200'
                }`}
              >
                {tab === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {tab === 'login' ? '登录' : '注册'}
                {activeTab === tab && (
                  <motion.div
                    layoutId="auth-tab-indicator"
                    className="absolute inset-0 bg-primary-600/90 rounded-lg shadow-sm"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* 错误提示 */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: activeTab === 'login' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeTab === 'login' ? 10 : -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* 用户名 */}
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5 ml-1">
                    用户名
                  </label>
                  <div className="input-glow rounded-xl bg-surface-900/60 border border-surface-700/40 transition-all duration-200 focus-within:border-primary-500/40">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={clearError}
                      placeholder="请输入用户名"
                      maxLength={32}
                      className="w-full bg-transparent px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5 ml-1">
                    密码
                  </label>
                  <div className="input-glow rounded-xl bg-surface-900/60 border border-surface-700/40 transition-all duration-200 focus-within:border-primary-500/40 flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={clearError}
                      placeholder="请输入密码"
                      maxLength={64}
                      className="flex-1 bg-transparent px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none"
                      autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="px-3 text-surface-500 hover:text-surface-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 确认密码（仅注册） */}
                {activeTab === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-medium text-surface-400 mb-1.5 ml-1">
                      确认密码
                    </label>
                    <div className="input-glow rounded-xl bg-surface-900/60 border border-surface-700/40 transition-all duration-200 focus-within:border-primary-500/40 flex items-center">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={clearError}
                        placeholder="请再次输入密码"
                        maxLength={64}
                        className="flex-1 bg-transparent px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="px-3 text-surface-500 hover:text-surface-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 用户类型（仅注册） */}
                {activeTab === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-medium text-surface-400 mb-1.5 ml-1">
                      用户类型
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {USER_TYPES.map((ut) => {
                        const Icon = ut.icon;
                        const selected = userType === ut.value;
                        return (
                          <button
                            key={ut.value}
                            type="button"
                            onClick={() => setUserType(ut.value)}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                              selected
                                ? 'border-primary-500/50 bg-primary-600/15 text-primary-300'
                                : 'border-surface-700/40 bg-surface-900/40 text-surface-400 hover:text-surface-200 hover:border-surface-600/50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${selected ? 'text-primary-400' : ''}`} />
                            {ut.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* 验证码 */}
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5 ml-1">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="input-glow flex-1 rounded-xl bg-surface-900/60 border border-surface-700/40 transition-all duration-200 focus-within:border-primary-500/40">
                      <input
                        type="text"
                        value={captchaText}
                        onChange={(e) => setCaptchaText(e.target.value)}
                        onFocus={clearError}
                        placeholder="请输入验证码"
                        maxLength={10}
                        className="w-full bg-transparent px-4 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="shrink-0 w-[120px] h-[42px] rounded-xl overflow-hidden border border-surface-700/40 bg-white hover:border-primary-500/30 transition-colors flex items-center justify-center"
                      title="点击刷新验证码"
                    >
                      {captcha ? (
                        <img
                          src={captcha.image_url}
                          alt="验证码"
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-surface-500 animate-spin" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 提交按钮 */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all duration-200 ${
                loading
                  ? 'bg-primary-700/60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 hover:shadow-primary-500/30'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {activeTab === 'login' ? '登录中...' : '注册中...'}
                </span>
              ) : activeTab === 'login' ? (
                '立即登录'
              ) : (
                '创建账号'
              )}
            </motion.button>
          </form>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-surface-600 mt-6">
          灵犀智能助手 · 安全认证系统
        </p>
      </motion.div>
    </div>
  );
}
