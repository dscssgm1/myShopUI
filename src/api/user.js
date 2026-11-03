import request from './request'

// 地址与会员接口此前在 trade.js 中，这里统一转出口，个人中心页面只引 user.js
export { fetchAddresses, fetchMemberProfile } from './trade'

// ==================== 个人信息 ====================

export function fetchMe() {
  return request.get('/system/users/me')
}

export function updateProfile(data) {
  return request.put('/system/users/me', data)
}

export function fetchPointsLogs(limit = 20) {
  return request.get('/system/member/points/logs', { params: { limit } })
}

// ==================== 积分商城 ====================

export function fetchPointsMallItems() {
  return request.get('/system/points-mall/items')
}

/** 兑换：{ itemId, receiverName, receiverPhone, receiverAddress }，返回兑换记录（含订单号） */
export function exchangePointsItem(data) {
  return request.post('/system/points-mall/exchange', data)
}

export function fetchMyExchanges() {
  return request.get('/system/points-mall/exchanges')
}

// ==================== 优惠券 ====================

/** status: UNUSED / USED / EXPIRED，不传返回全部 */
export function fetchMyCoupons(status) {
  return request.get('/coupons/mine', { params: { status: status || undefined } })
}

// ==================== 收藏 ====================

export function fetchFavorites() {
  return request.get('/system/favorites')
}

export function addFavorite(productId) {
  return request.post('/system/favorites', { productId })
}

export function removeFavorite(productId) {
  return request.delete(`/system/favorites/${productId}`)
}

// ==================== 浏览足迹 ====================

export function fetchFootprints(limit = 50) {
  return request.get('/system/footprints', { params: { limit } })
}

export function recordFootprint(productId) {
  return request.post('/system/footprints', { productId })
}

export function clearFootprints() {
  return request.delete('/system/footprints')
}

// ==================== 收货地址 ====================

export function createAddress(data) {
  return request.post('/system/addresses', data)
}

export function updateAddress(id, data) {
  return request.put(`/system/addresses/${id}`, data)
}

export function setDefaultAddress(id) {
  return request.put(`/system/addresses/${id}/default`)
}

export function deleteAddress(id) {
  return request.delete(`/system/addresses/${id}`)
}

export function fetchFavoriteExists(productId) {
  return request.get(`/system/favorites/${productId}/exists`)
}

export function fetchCouponTemplates() {
  return request.get('/coupons/templates')
}

export function claimCoupon(templateId) {
  return request.post(`/coupons/${templateId}/claim`)
}

export function changePassword(data) {
  return request.put('/system/users/me/password', data)
}

export function changeEmail(data) {
  return request.put('/system/users/me/email', data)
}

// ==================== 账号安全 ====================

export function fetchSecurityOverview() {
  return request.get('/system/users/me/security')
}

/** 向当前账号邮箱发送身份验证码 */
export function sendIdentityCode() {
  return request.post('/system/users/me/verify-identity/code')
}

/** 校验身份验证码，返回短时效 verifyToken */
export function verifyIdentity(code) {
  return request.post('/system/users/me/verify-identity', { code })
}

export function trustCurrentDevice(data) {
  return request.post('/system/users/me/trusted-devices', data)
}

export function removeTrustedDevice(id) {
  return request.delete(`/system/users/me/trusted-devices/${id}`)
}

export function fetchBankCards() {
  return request.get('/system/cards')
}

export function addBankCard(data) {
  return request.post('/system/cards', data)
}

export function removeBankCard(id) {
  return request.delete(`/system/cards/${id}`)
}
