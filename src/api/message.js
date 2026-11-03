import request from './request'

// 买家会话
export function fetchSessions(config = {}) {
  return request.get('/messages/sessions', config)
}

// 获取/创建店铺客服会话
export function openShopSession(shopId, shopName, shopIcon) {
  return request.post(`/messages/sessions/shop/${shopId}`, null, {
    params: { shopName, shopIcon }
  })
}

// 获取/创建平台客服会话
export function openPlatformSession() {
  return request.post('/messages/sessions/platform')
}

// 会话详情
export function fetchSessionDetail(id, config = {}) {
  return request.get(`/messages/sessions/${id}`, config)
}

// 买家发送
export function sendMessage(id, content) {
  return request.post(`/messages/sessions/${id}/messages`, { content })
}

// 买家已读
export function readSession(id) {
  return request.post(`/messages/sessions/${id}/read`)
}

// 客服：会话列表（type=SHOP / PLATFORM）
export function fetchCsSessions(type, shopId, config = {}) {
  return request.get('/messages/cs/sessions', { params: { type, shopId }, ...config })
}

// 客服回复
export function csReply(id, content) {
  return request.post(`/messages/cs/sessions/${id}/reply`, { content })
}

// 客服已读
export function csRead(id) {
  return request.post(`/messages/cs/sessions/${id}/read`)
}

// 系统通知
export function fetchNotices(config = {}) {
  return request.get('/messages/notices', config)
}

export function readNotice(id) {
  return request.put(`/messages/notices/${id}/read`)
}
