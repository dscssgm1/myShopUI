import request from './request'

// ==================== 用户端 ====================

/** 发起售后。客服代用户发起时，额外传 userId */
export function createAfterSale(data) {
  return request.post('/orders/after-sales', data)
}

export function fetchMyAfterSales(params) {
  return request.get('/orders/after-sales', { params })
}

export function fetchAfterSale(afterSaleNo) {
  return request.get(`/orders/after-sales/${afterSaleNo}`)
}

/** 商家拒绝后申请平台介入 */
export function escalateAfterSale(afterSaleNo) {
  return request.post(`/orders/after-sales/${afterSaleNo}/escalate`)
}

/** 商家审核超时（倒计时结束）触发转平台，服务端会校验截止时间确实已过 */
export function timeoutEscalateAfterSale(afterSaleNo) {
  return request.post(`/orders/after-sales/${afterSaleNo}/timeout-escalate`)
}

/** 预约退货上门取件时间（两天以内） */
export function appointAfterSale(afterSaleNo, appointmentTime) {
  return request.post(`/orders/after-sales/${afterSaleNo}/appointment`, { appointmentTime })
}

// ==================== 商家端 ====================

export function fetchMerchantAfterSales(params) {
  return request.get('/orders/after-sales/merchant', { params })
}

export function reviewAfterSale(afterSaleNo, approved, reason) {
  return request.post(`/orders/after-sales/${afterSaleNo}/merchant-review`, { approved, reason })
}

/** 商家触发退款 */
export function refundAfterSale(afterSaleNo) {
  return request.post(`/orders/after-sales/${afterSaleNo}/refund`)
}

/** 商家退款后申诉 */
export function appealAfterSale(afterSaleNo, reason) {
  return request.post(`/orders/after-sales/${afterSaleNo}/appeal`, { reason })
}

// ==================== 平台端 ====================

export function fetchPlatformAfterSales(params, config = {}) {
  return request.get('/orders/after-sales/platform', { params, ...config })
}

export function platformReviewAfterSale(afterSaleNo, approved, reason) {
  return request.post(`/orders/after-sales/${afterSaleNo}/platform-review`, { approved, reason })
}

export function appealReviewAfterSale(afterSaleNo, approved, reason) {
  return request.post(`/orders/after-sales/${afterSaleNo}/appeal-review`, { approved, reason })
}
