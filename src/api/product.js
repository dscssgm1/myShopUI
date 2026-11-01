import request from './request'

// 分类树（大类 + 小类）
export function fetchCategoryTree() {
  return request.get('/categories')
}

// 品牌列表
export function fetchBrands() {
  return request.get('/brands')
}

// 商品分页搜索
export function fetchProducts(params) {
  return request.get('/products', { params })
}

// 热门商品
export function fetchHotProducts(limit = 8) {
  return request.get('/products/hot', { params: { limit } })
}

// 商品详情
export function fetchProductDetail(id) {
  return request.get(`/products/${id}`)
}
