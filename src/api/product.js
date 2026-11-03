import request from './request'

// 分类树（大类 + 小类）
export function fetchCategoryTree(config = {}) {
  return request.get('/categories', config)
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

// 按 id 批量查询商品（收藏 / 足迹展示用）
export function fetchProductBatch(ids) {
  return request.get('/products/batch', { params: { ids: ids.join(',') } })
}

// ==================== 商家管理 ====================

// 发布商品（提交平台审核）
export function createProduct(data) {
  return request.post('/products', data)
}

// 修改商品（保留原有规格/SKU 由调用方回传）
export function updateProduct(id, data) {
  return request.put(`/products/${id}`, data)
}

export function deleteProduct(id) {
  return request.delete(`/products/${id}`)
}

export function restockProduct(id, quantity) {
  return request.put(`/products/${id}/stock`, { quantity })
}

export function setProductPrice(id, price) {
  return request.put(`/products/${id}/price`, null, { params: { price } })
}

export function onSaleProduct(id) {
  return request.put(`/products/${id}/on-sale`)
}

export function offSaleProduct(id, reason) {
  return request.put(`/products/${id}/off-sale`, null, { params: { reason } })
}
