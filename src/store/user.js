import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi } from '../api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('myshop_token') || '',
    user: JSON.parse(localStorage.getItem('myshop_user') || 'null')
  }),
  getters: {
    isLogin: (s) => !!s.token
  },
  actions: {
    async login(username, password) {
      const result = await loginApi({ username, password })
      this.token = result.data.token
      this.user = result.data.user
      localStorage.setItem('myshop_token', this.token)
      localStorage.setItem('myshop_user', JSON.stringify(this.user))
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
      localStorage.removeItem('myshop_token')
      localStorage.removeItem('myshop_user')
    }
  }
})
