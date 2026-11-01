import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api/system',
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
    if (status === 401) {
      ElMessage.error(message || '登录已过期，请重新登录')
    } else {
      ElMessage.error(message || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
