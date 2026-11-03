import request from './request'

/**
 * 促销活动：/promotions 公开接口（网关白名单，匿名可读）。
 * 商品角标不再由商家维护，前端实时根据进行中的活动拼装。
 */

/** 进行中的活动列表 */
export function fetchActivePromotions(config = {}) {
  return request.get('/promotions', { params: { status: 'active' }, ...config })
}

const RULE_TEXT = { FULL_REDUCTION: '满减', DISCOUNT: '折扣' }
const PROMO_TTL = 30_000

let promoPromise = null
let promoAt = 0

function activePromotions() {
  if (promoPromise && Date.now() - promoAt < PROMO_TTL) return promoPromise
  promoAt = Date.now()
  promoPromise = fetchActivePromotions({ silent: true })
    .then((res) => res.data || [])
    .catch(() => {
      // 拉取失败不缓存，下次调用立即重试
      promoAt = 0
      return []
    })
  return promoPromise
}

function matchPromotion(promotion, product) {
  const scopeIds = (promotion.scopeIds || []).map(Number)
  switch (promotion.scopeType) {
    case 'CATEGORY':
      return scopeIds.includes(Number(product.categoryId))
    case 'PRODUCT':
      return scopeIds.includes(Number(product.id))
    case 'SHOP':
      // 商家活动：只作用于该店铺的商品（报名制活动的 scopeIds 是审核通过商品，同样按商品匹配）
      return Number(promotion.shopId) === Number(product.shopId)
    default:
      return true // ALL 全平台
  }
}

/**
 * 商品参加的进行中活动标签：活动类型优先（如「平台大促」），
 * 未填类型时按规则类型显示「满减 / 折扣」；同类型多个活动只显示一个角标。
 */
export async function productActivityTags(product) {
  if (!product?.id) return []
  const list = await activePromotions()
  return list
    // 报名制活动的实际生效商品以平台审核为准（公开列表不暴露审核结果），不打角标
    .filter((p) => !p.enrollRequired && matchPromotion(p, product))
    .map((p) => p.type || RULE_TEXT[p.ruleType] || '促销')
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 2)
}

// ==================== 商家自建活动 ====================

/** 商家自己的活动列表（含已结束） */
export function fetchMerchantPromotions() {
  return request.get('/promotions/merchant')
}

export function createMerchantPromotion(data) {
  return request.post('/promotions/merchant', data)
}

export function updateMerchantPromotion(id, data) {
  return request.put(`/promotions/merchant/${id}`, data)
}

export function endMerchantPromotion(id) {
  return request.post(`/promotions/merchant/${id}/end`)
}

// ==================== 活动报名（商家） ====================

/** 可报名的平台招商活动 */
export function fetchEnrollablePromotions() {
  return request.get('/promotions/enrollments/available')
}

/** 批量报名商品：{ promotionId, productIds } */
export function applyEnrollment(promotionId, productIds) {
  return request.post('/promotions/enrollments', { promotionId, productIds })
}

/** 我的报名记录 */
export function fetchMyEnrollments() {
  return request.get('/promotions/enrollments/mine')
}

// ==================== 结算可用优惠券 ====================

/** 按商品明细计算每张券实际可抵扣金额：items = [{ productId, categoryId, shopId, price, quantity }] */
export function fetchAvailableCoupons(items) {
  return request.post('/discounts/available-coupons', { items })
}

// ==================== 商家优惠券 ====================

/** 商家自己发放的券（含已结束） */
export function fetchMerchantCouponTemplates() {
  return request.get('/coupons/templates/mine')
}

/** 商家发券：范围限本店商品（SHOP / PRODUCT） */
export function createMerchantCouponTemplate(data) {
  return request.post('/coupons/templates', data)
}

export function endMerchantCouponTemplate(id) {
  return request.post(`/coupons/templates/${id}/end`)
}
