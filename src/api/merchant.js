import request from './request'

// ==================== 商家入驻（买家端） ====================

export function submitMerchantApply(data) {
  return request.post('/merchant/apply', data)
}

export function fetchMyMerchantApplies() {
  return request.get('/merchant/apply/mine')
}

// ==================== 商家中心：店铺信息 ====================

export function fetchMyShop() {
  return request.get('/merchant/shop')
}

export function updateMyShop(data) {
  return request.put('/merchant/shop', data)
}
