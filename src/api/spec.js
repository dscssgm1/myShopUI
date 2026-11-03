import request from './request'

// 我的规格库（商家自建规格，按店铺隔离）
export function fetchMerchantSpecs(config = {}) {
  return request.get('/specs/merchant', config)
}

export function createMerchantSpec(data) {
  return request.post('/specs/merchant', data)
}

export function updateMerchantSpec(id, data) {
  return request.put(`/specs/merchant/${id}`, data)
}

export function deleteMerchantSpec(id) {
  return request.delete(`/specs/merchant/${id}`)
}
