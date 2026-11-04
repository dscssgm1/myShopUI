import request from './request'
import { fetchPlatformAfterSales } from './afterSale'
import { fetchReviewStats } from './review'

// ==================== 数据看板 ====================

export function fetchDashboard() {
  return request.get('/dashboard/overview')
}

// ==================== 审核中心 ====================

export function fetchAudits(params, config = {}) {
  return request.get('/audit', { params, ...config })
}

/**
 * 审核中心各入口的待审核数汇总，菜单角标与页内 Tab 角标共用。
 * 全部静默请求，单项失败按 0 计，不影响其余入口。
 */
export async function fetchAuditPendingSummary() {
  const [product, shopApply, recordPending, recordFinal, review, asPlatform, asAppeal] =
    await Promise.allSettled([
      fetchPendingAuditCount({ silent: true }),
      fetchPendingShopApplyCount({ silent: true }),
      fetchAudits({ status: 'PENDING', page: 1, size: 1 }, { silent: true }),
      fetchAudits({ status: 'FIRST_APPROVED', page: 1, size: 1 }, { silent: true }),
      fetchReviewStats({ silent: true }),
      fetchPlatformAfterSales({ status: 'PENDING_PLATFORM', page: 1, size: 1 }, { silent: true }),
      fetchPlatformAfterSales({ status: 'APPEALING', page: 1, size: 1 }, { silent: true })
    ])
  const pageTotal = (r) => (r.status === 'fulfilled' ? r.value.data?.total || 0 : 0)
  const stat = (r, key) => (r.status === 'fulfilled' ? r.value.data?.[key] || 0 : 0)
  return {
    /** 商品审核：新发布待审 + 修改待审核 */
    product: pageTotal(product),
    /** 商家入驻审核 */
    shopApply: pageTotal(shopApply),
    /** 物流入驻两级 + 通用审核：待初审 + 待终审 */
    record: pageTotal(recordPending) + pageTotal(recordFinal),
    /** 评价审核：待审核 + 被举报 */
    review: stat(review, 'pending') + stat(review, 'reported'),
    /** 售后仲裁：待平台审核 + 待处理申诉 */
    afterSale: pageTotal(asPlatform) + pageTotal(asAppeal)
  }
}

export function approveAudit(id, reason) {
  return request.put(`/audit/${id}/approve`, { reason })
}

export function rejectAudit(id, reason) {
  return request.put(`/audit/${id}/reject`, { reason })
}

/** 第一级审核（平台业务员）：物流入驻初审 */
export function firstApproveAudit(id, reason) {
  return request.put(`/audit/${id}/first-approve`, { reason })
}

// ==================== 物流入驻申请（用户端） ====================

export function submitLogisticsApply(data) {
  return request.post('/platform/logistics-apply', data)
}

export function fetchMyLogisticsApplies() {
  return request.get('/platform/logistics-apply/mine')
}

// ==================== 运营配置 ====================

export function fetchConfig(group) {
  return request.get(`/config/${group}`)
}

export function saveConfig(group, items) {
  return request.put(`/config/${group}`, { items })
}

export function deleteConfig(group, key) {
  return request.delete(`/config/${group}/${key}`)
}

// ==================== 日志 ====================

export function fetchOperationLogs(params) {
  return request.get('/logs/operation', { params })
}

export function fetchLoginLogs(params) {
  return request.get('/logs/login', { params })
}

export function fetchSystemLogs(params) {
  return request.get('/logs/system', { params })
}

// ==================== 订单管理 ====================

export function fetchAdminOrders(params) {
  return request.get('/orders/admin', { params })
}

// ==================== 商品佣金（平台账单） ====================

export function fetchCommissionAdminSummary() {
  return request.get('/orders/commission/admin/summary')
}

export function fetchCommissionRecords(params) {
  return request.get('/orders/commission/admin/page', { params })
}

export function fetchMerchantOrders(params) {
  return request.get('/orders/merchant', { params })
}

export function shipOrder(orderNo, companyId) {
  return request.post(`/orders/${orderNo}/ship`, { companyId })
}

// ==================== 商品管理 ====================

export function fetchAdminProducts(params) {
  return request.get('/products', { params })
}

/** 待审核商品数（新发布待审 + 修改待审核），菜单角标用 */
export function fetchPendingAuditCount(config = {}) {
  return request.get('/products/pending-audit-count', config)
}

export function auditProduct(id, approved, reason) {
  return request.put(`/products/${id}/audit`, null, { params: { approved, reason } })
}

export function onSaleProduct(id) {
  return request.put(`/products/${id}/on-sale`)
}

export function offSaleProduct(id, reason) {
  return request.put(`/products/${id}/off-sale`, null, { params: { reason } })
}

// ==================== 分类管理 ====================

export function createCategory(data) {
  return request.post('/categories', data)
}

export function updateCategory(id, data) {
  return request.put(`/categories/${id}`, data)
}

export function deleteCategory(id) {
  return request.delete(`/categories/${id}`)
}

// ==================== 品牌管理 ====================

export function createBrand(data) {
  return request.post('/brands', data)
}

export function updateBrand(id, data) {
  return request.put(`/brands/${id}`, data)
}

export function deleteBrand(id) {
  return request.delete(`/brands/${id}`)
}

// ==================== 规格模板 ====================

export function fetchSpecs() {
  return request.get('/specs')
}

export function createSpec(data) {
  return request.post('/specs', data)
}

export function updateSpec(id, data) {
  return request.put(`/specs/${id}`, data)
}

export function deleteSpec(id) {
  return request.delete(`/specs/${id}`)
}

// ==================== 会员等级 ====================

export function fetchMemberLevels() {
  return request.get('/system/member/levels')
}

export function createMemberLevel(data) {
  return request.post('/system/member/levels', data)
}

export function updateMemberLevel(id, data) {
  return request.put(`/system/member/levels/${id}`, data)
}

export function deleteMemberLevel(id) {
  return request.delete(`/system/member/levels/${id}`)
}

// ==================== 用户管理 ====================

export function fetchAdminUsers(params) {
  return request.get('/system/users', { params })
}

export function updateUserStatus(id, status) {
  return request.put(`/system/users/${id}/status`, { status })
}

export function updateUserRole(id, roleCode) {
  return request.put(`/system/users/${id}/role`, { roleCode })
}

export function fetchRoles() {
  return request.get('/system/roles')
}

// 平台管理员：查看用户在线登录设备
export function fetchUserSessions(id) {
  return request.get(`/system/users/${id}/sessions`)
}

// 平台管理员：单点下线用户的指定设备
export function kickUserSession(id, sessionId) {
  return request.delete(`/system/users/${id}/sessions/${sessionId}`)
}

// ==================== 商家管理 ====================

export function fetchAdminShops(params) {
  return request.get('/platform/shops', { params })
}

export function updateShopStatus(id, status, reason) {
  return request.put(`/platform/shops/${id}/status`, null, { params: { status, reason } })
}

// ==================== 商家入驻审核 ====================

export function fetchShopApplies(params) {
  return request.get('/platform/shops/applies', { params })
}

export function fetchPendingShopApplyCount(config = {}) {
  return request.get('/platform/shops/applies/pending-count', config)
}

export function approveShopApply(id, reason) {
  return request.put(`/platform/shops/applies/${id}/approve`, { reason })
}

export function rejectShopApply(id, reason) {
  return request.put(`/platform/shops/applies/${id}/reject`, { reason })
}

// ==================== 促销管理 ====================

export function fetchAdminPromotions(status = 'all') {
  return request.get('/promotions', { params: { status } })
}

export function createPromotion(data) {
  return request.post('/promotions', data)
}

export function updatePromotion(id, data) {
  return request.put(`/promotions/${id}`, data)
}

export function endPromotion(id) {
  return request.post(`/promotions/${id}/end`)
}

// ==================== 活动报名审核 ====================

export function fetchEnrollments(params) {
  return request.get('/promotions/enrollments', { params })
}

export function approveEnrollment(id) {
  return request.post(`/promotions/enrollments/${id}/approve`)
}

export function rejectEnrollment(id, reason) {
  return request.post(`/promotions/enrollments/${id}/reject`, { reason })
}

// ==================== 平台优惠券 ====================

export function fetchAdminCouponTemplates() {
  return request.get('/coupons/templates')
}

export function createCouponTemplate(data) {
  return request.post('/coupons/templates', data)
}

export function endCouponTemplate(id) {
  return request.post(`/coupons/templates/${id}/end`)
}
