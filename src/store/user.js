import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi } from '../api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('myshop_token') || '',
    user: JSON.parse(localStorage.getItem('myshop_user') || 'null'),
    /** 角色勾选的菜单/按钮权限码（登录响应下发，前端渲染侧边菜单与按钮显隐） */
    perms: JSON.parse(localStorage.getItem('myshop_perms') || '[]')
  }),
  getters: {
    isLogin: (s) => !!s.token
  },
  actions: {
    hasPerm(key) {
      return this.perms.includes(key)
    },
    async login(username, password) {
      const result = await loginApi({ username, password })
      this.token = result.data.token
      this.user = result.data.user
      this.perms = result.data.perms || []
      localStorage.setItem('myshop_token', this.token)
      localStorage.setItem('myshop_user', JSON.stringify(this.user))
      localStorage.setItem('myshop_perms', JSON.stringify(this.perms))
      return this.user
    },
    /** 退出登录：先通知服务端销毁会话（令牌立即失效），再清理本地状态 */
    async logout() {
      try {
        if (this.token) await logoutApi()
      } catch {
        // 令牌已过期 / 会话已被下线时同样清理本地状态
      }
      this.token = ''
      this.user = null
      this.perms = []
      localStorage.removeItem('myshop_token')
      localStorage.removeItem('myshop_user')
      localStorage.removeItem('myshop_perms')
    }
  }
})
