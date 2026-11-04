import request from './request'

const BASE = '/system/staff'

// 员工列表：平台=平台员工，商家=本店员工（后端按登录端/店铺过滤）
export function fetchStaff() {
  return request.get(BASE)
}

// 新增员工（真实登录账号，初始密码）
export function createStaff(data) {
  return request.post(BASE, data)
}

// 编辑员工：姓名/角色/手机/邮箱
export function updateStaff(id, data) {
  return request.put(`${BASE}/${id}`, data)
}

// 禁用/启用（1 启用 0 禁用，禁用即下线）
export function updateStaffStatus(id, status) {
  return request.put(`${BASE}/${id}/status`, null, { params: { status } })
}

// 重置密码（该员工全部会话下线）
export function resetStaffPassword(id, newPassword) {
  return request.put(`${BASE}/${id}/password`, { newPassword })
}

// 删除员工
export function deleteStaff(id) {
  return request.delete(`${BASE}/${id}`)
}
