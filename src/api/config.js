import request from './request'

/**
 * 买家端公开配置：banner / pay-method / aftersale-reason / report-type / service-guarantee / system
 * 网关白名单放行，未登录也能读取。
 */
export function fetchPublicConfig(group, config = {}) {
  return request.get(`/config/public/${group}`, config)
}

/** 公开配置组转成 key → value 的 Map */
export async function fetchPublicConfigMap(group, config = {}) {
  const res = await fetchPublicConfig(group, config)
  return Object.fromEntries((res.data || []).map((item) => [item.key, item.value]))
}

/** 安全解析 JSON 配置值 */
export function parseConfigJson(raw, fallback) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

// ==================== 行政区划（省/市/县三级） ====================

/** 公开区域树：地址选择器用，仅启用节点（网关 /api/config/public/ 白名单放行） */
export function fetchRegionPublicTree(config = {}) {
  return request.get('/config/public/regions/tree', config)
}

/** 管理端：完整区域树（含停用节点） */
export function fetchRegionAdminTree() {
  return request.get('/config/regions/tree')
}

export function createRegion(data) {
  return request.post('/config/regions', data)
}

export function renameRegion(id, data) {
  return request.put(`/config/regions/${id}`, data)
}

export function setRegionStatus(id, status) {
  return request.put(`/config/regions/${id}/status`, null, { params: { status } })
}

export function deleteRegion(id) {
  return request.delete(`/config/regions/${id}`)
}
