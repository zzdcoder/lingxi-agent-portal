/**
 * 认证服务模块
 * 封装与后端 /api/auth 相关的所有 HTTP 请求，包括验证码、注册、登录和用户信息查询
 */

const API_BASE = '/api';

/** 验证码响应数据结构 */
export interface CaptchaData {
  captcha_id: string;
  image_url: string;
}

/** 用户基础信息 */
export interface User {
  id: string;
  username: string;
  user_type: string;
  created_at: string;
}

/** 登录成功响应数据结构 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/**
 * 获取新的验证码
 * 后端返回 Base64 Data URL 格式的 PNG 图片和验证码唯一 ID
 */
export async function getCaptcha(): Promise<CaptchaData> {
  const res = await fetch(`${API_BASE}/auth/captcha`);
  if (!res.ok) throw new Error('获取验证码失败，请刷新重试');
  return res.json();
}

/**
 * 用户登录
 * @param username 用户名
 * @param password 密码
 * @param captcha_id 验证码 ID
 * @param captcha_text 用户输入的验证码
 */
export async function login(
  username: string,
  password: string,
  captcha_id: string,
  captcha_text: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, captcha_id, captcha_text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || '登录失败，请检查用户名和密码');
  }
  return res.json();
}

/**
 * 用户注册
 * @param username 用户名
 * @param password 密码
 * @param user_type 用户类型：manufacturer（厂商用户）或 mobile（移动用户）
 * @param captcha_id 验证码 ID
 * @param captcha_text 用户输入的验证码
 */
export async function register(
  username: string,
  password: string,
  user_type: string,
  captcha_id: string,
  captcha_text: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, user_type, captcha_id, captcha_text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || '注册失败，请稍后重试');
  }
  return res.json();
}

/**
 * 获取当前登录用户信息
 * @param token JWT Access Token
 */
export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('获取用户信息失败');
  return res.json();
}
