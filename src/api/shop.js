import request from './request'

// 店铺详情
export function fetchShop(id) {
  return request.get(`/shops/${id}`)
}

// 店铺商品
export function fetchShopProducts(shopId, page = 1, size = 12) {
  return request.get('/products', { params: { shopId, page, size } })
}
