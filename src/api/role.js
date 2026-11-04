import request from './request'

const BASE = '/system/roles'

// 角色列表（员工管理角色下拉、角色管理页共用；groupCode 过滤本端角色）
export function fetchRoles(params) {
  return request.get(BASE, { params })
}

// 新建角色（groupCode 由后端强制为当前登录端）
export function createRole(data) {
  return request.post(BASE, data)
}

// 编辑角色基本信息
export function updateRole(id, data) {
  return request.put(`${BASE}/${id}`, data)
}

// 删除角色（内置角色/仍有员工的角色会被拒绝）
export function deleteRole(id) {
  return request.delete(`${BASE}/${id}`)
}

// 角色已勾选的菜单/按钮权限码（配置弹窗回显）
export function fetchRoleMenus(code) {
  return request.get(`${BASE}/${code}/menus`)
}

// 保存角色勾选的菜单/按钮，在线员工下一次请求即按新权限生效
export function saveRoleMenus(code, keys) {
  return request.put(`${BASE}/${code}/menus`, { keys })
}
