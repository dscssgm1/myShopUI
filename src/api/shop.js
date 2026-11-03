import request from './request'

// 店铺列表（关键词/经营类目/最低评分），搜索页「店铺」tab 用
export function fetchShops(params, config = {}) {
  return request.get('/shops', { params, ...config })
}

// 店铺详情
export function fetchShop(id) {
  return request.get(`/shops/${id}`)
}

// 店铺商品
export function fetchShopProducts(shopId, page = 1, size = 12) {
  return request.get('/products', { params: { shopId, page, size } })
}
