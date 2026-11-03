import request from './request'

// 运单列表（物流公司视角）
export function fetchShipments(params) {
  return request.get('/logistics/shipments', { params })
}

export function fetchShipment(id) {
  return request.get(`/logistics/shipments/${id}`)
}

// 买家查询订单对应的运单（脱敏，不含取件码）
export function fetchShipmentByOrder(orderNo) {
  return request.get(`/logistics/shipments/order/${orderNo}`)
}

// 快递员任务：type=pickup / delivery
export function fetchCourierTasks(type) {
  return request.get('/logistics/couriers/tasks', { params: { type } })
}

// 揽收 / 运输 / 派送 / 签收
// 退货件需校验取件码
export function pickupShipment(id, courierId, pickupCode) {
  return request.put(`/logistics/shipments/${id}/pickup`, { courierId, pickupCode })
}

export function transitShipment(id, content) {
  return request.put(`/logistics/shipments/${id}/transit`, { content })
}

export function outForDelivery(id) {
  return request.put(`/logistics/shipments/${id}/out-for-delivery`)
}

export function deliverShipment(id, signer) {
  return request.put(`/logistics/shipments/${id}/deliver`, { signer })
}

// 快递员
export function fetchCouriers(companyId) {
  return request.get('/logistics/couriers', { params: { companyId } })
}

export function createCourier(data) {
  return request.post('/logistics/couriers', data)
}

export function updateCourier(id, data) {
  return request.put(`/logistics/couriers/${id}`, data)
}

export function deleteCourier(id) {
  return request.delete(`/logistics/couriers/${id}`)
}

// 物流公司
export function fetchCompanies(all = false) {
  return request.get('/logistics/companies', { params: { all } })
}

// 平台管理员：新增 / 编辑 / 启停物流公司
export function createCompany(data) {
  return request.post('/logistics/companies', data)
}

export function updateCompany(id, data) {
  return request.put(`/logistics/companies/${id}`, data)
}

export function updateCompanyStatus(id, status) {
  return request.put(`/logistics/companies/${id}/status`, null, { params: { status } })
}

// ==================== 分红 ====================

// 物流公司视角：余额与累计分成
export function fetchDividendSummary(config = {}) {
  return request.get('/logistics/dividend/summary', config)
}

// 物流公司视角：本公司分红流水
export function fetchDividendPage(params, config = {}) {
  return request.get('/logistics/dividend/page', { params, ...config })
}

// 平台视角：整体汇总与各公司账户
export function fetchDividendAdminSummary(config = {}) {
  return request.get('/logistics/dividend/admin/summary', config)
}

// 平台视角：全部公司分红流水
export function fetchDividendAdminPage(params, config = {}) {
  return request.get('/logistics/dividend/admin/page', { params, ...config })
}

// 平台调账：amount 正为入账、负为扣减
export function adjustDividend(data) {
  return request.post('/logistics/dividend/admin/adjust', data)
}
