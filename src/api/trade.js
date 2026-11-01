import request from './request'

// ==================== 购物车 ====================

export function fetchCart() {
  return request.get('/cart')
}

export function addToCart(productId, quantity = 1, skuId = null) {
  return request.post('/cart/items', { productId, quantity, skuId })
}

export function updateCartItem(id, quantity) {
  return request.put(`/cart/items/${id}`, { quantity })
}

export function removeCartItem(id) {
  return request.delete(`/cart/items/${id}`)
}

export function clearCart() {
  return request.delete('/cart')
}

// ==================== 订单 ====================

export function previewOrder(data) {
  return request.post('/orders/preview', data)
}

export function createOrder(data) {
  return request.post('/orders', data)
}

export function fetchOrders(params) {
  return request.get('/orders', { params })
}

export function fetchOrderDetail(orderNo) {
  return request.get(`/orders/${orderNo}`)
}

export function cancelOrder(orderNo) {
  return request.post(`/orders/${orderNo}/cancel`)
}

export function confirmShopOrder(orderNo) {
  return request.post(`/orders/${orderNo}/confirm`)
}

// ==================== 支付 ====================

export function createPayment(orderNo, channel) {
  return request.post('/payments', { orderNo, channel })
}

export function payOrder(paymentNo) {
  return request.post(`/payments/${paymentNo}/pay`)
}

// ==================== 个人资产 ====================

export function fetchAddresses() {
  return request.get('/system/addresses')
}

export function fetchMemberProfile() {
  return request.get('/system/member/profile')
}
