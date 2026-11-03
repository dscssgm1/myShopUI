import request from './request'

const BASE = '/system/auth'

// 登录
export function login(data) {
  return request.post(`${BASE}/login`, data)
}

// 注册（需邮箱验证码）
export function register(data) {
  return request.post(`${BASE}/register`, data)
}

// 发送邮箱验证码（purpose: REGISTER / CHANGE_EMAIL / RESET_PASSWORD）
export function sendEmailCode(email, purpose = 'REGISTER') {
  return request.post(`${BASE}/email-code`, { email, purpose })
}

// 忘记密码：发送验证码
export function forgotPassword(email) {
  return request.post(`${BASE}/password/forgot`, { email })
}

// 重置密码
export function resetPassword(data) {
  return request.post(`${BASE}/password/reset`, data)
}

// 当前登录用户
export function fetchMe() {
  return request.get(`${BASE}/me`)
}

// 退出登录：服务端销毁当前会话，令牌立即失效
export function logout() {
  return request.post(`${BASE}/logout`)
}

// ==================== 在线登录设备 ====================

// 当前账号的在线设备（一个会话对应一次登录）
export function fetchLoginSessions() {
  return request.get(`${BASE}/sessions`)
}

// 单点下线：踢掉当前账号的一台设备
export function kickLoginSession(sessionId) {
  return request.delete(`${BASE}/sessions/${sessionId}`)
}

// 下线当前账号的全部设备
export function kickAllLoginSessions() {
  return request.delete(`${BASE}/sessions`)
}
