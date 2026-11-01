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
