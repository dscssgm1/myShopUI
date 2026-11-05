import request from './request'

// ==================== 买家 ====================

export function createReview(data) {
  return request.post('/reviews', data)
}

export function fetchProductReviews(productId, params) {
  return request.get(`/reviews/product/${productId}`, { params })
}

export function fetchReviewSummary(productId) {
  return request.get(`/reviews/product/${productId}/summary`)
}

/** 已完成订单中可评价的商品 */
export function fetchReviewable(orderNo) {
  return request.get(`/reviews/order/${orderNo}/reviewable`)
}

export function fetchMyReviews(params) {
  return request.get('/reviews/mine', { params })
}

/** 删除自己的评价（会扣回评价奖励积分，删除后不可再评价该商品） */
export function deleteReview(id) {
  return request.delete(`/reviews/${id}`)
}

// ==================== 商家 ====================

/** 本店全部评价（含待审核 / 已隐藏） */
export function fetchMerchantReviews(params) {
  return request.get('/reviews/merchant', { params })
}

export function reportReview(id, reason) {
  return request.post(`/reviews/${id}/report`, { reason })
}

/** 商家回复本店评价 */
export function replyReview(id, reply) {
  return request.put(`/reviews/${id}/reply`, { reply })
}

// ==================== 平台 ====================

export function fetchAdminReviews(params, config = {}) {
  return request.get('/reviews/admin', { params, ...config })
}

export function fetchReviewStats(config = {}) {
  return request.get('/reviews/admin/stats', config)
}

/** action: APPROVE 通过 / HIDE 隐藏 */
export function moderateReview(id, action, reason) {
  return request.put(`/reviews/admin/${id}`, { action, reason })
}
