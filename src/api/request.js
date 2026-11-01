import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 统一请求封装：baseURL 指向网关 /api，
 * 各业务 API 在自己的模块里拼接服务前缀（如 /system、/products）。
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截：携带令牌
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('myshop_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一处理 Result{code, message, data}
request.interceptors.response.use(
  (response) => {
    const result = response.data
    if (result.code === 200) {
      return result
    }
    ElMessage.error(result.message || '操作失败')
    return Promise.reject(new Error(result.message || '操作失败'))
  },
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message
    const url = error.config?.url || ''
    // 商品/分类/品牌等公开浏览接口：未登录不应被强制跳转登录页
    const isPublic = url.startsWith('/products') || url.startsWith('/categories') || url.startsWith('/brands')

    if (status === 401) {
      if (!isPublic) {
        ElMessage.error(message || '登录已过期，请重新登录')
        localStorage.removeItem('myshop_token')
        localStorage.removeItem('myshop_user')
        if (!location.pathname.startsWith('/login')) {
          location.href = '/login'
        }
      }
    } else {
      ElMessage.error(message || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
