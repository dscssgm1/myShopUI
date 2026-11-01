import { defineStore } from 'pinia'
import { login as loginApi } from '../api/auth'

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
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('myshop_token')
      localStorage.removeItem('myshop_user')
    }
  }
})
