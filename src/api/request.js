import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getDeviceId, getDeviceName } from '../utils/device'

/**
 * 统一请求封装：baseURL 指向网关 /api，
 * 各业务 API 在自己的模块里拼接服务前缀（如 /system、/products）。
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

/**
 * 接口首段路径 → 后端服务名称。
 * 网关本身不可达（请求没有响应）时，据此推断是哪个服务出了问题，
 * 避免所有页面都只提示笼统的「网络异常」。
 */
const SERVICE_BY_PREFIX = {
  system: '用户服务',
  products: '商品服务',
  categories: '商品服务',
  brands: '商品服务',
  specs: '商品服务',
  cart: '订单服务',
  orders: '订单服务',
  payments: '支付服务',
  promotions: '营销服务',
  coupons: '营销服务',
  discounts: '营销服务',
  recommendations: '营销服务',
  push: '营销服务',
  shops: '商家服务',
  merchant: '商家服务',
  logistics: '物流服务',
  messages: '消息服务',
  audit: '平台服务',
  config: '平台服务',
  logs: '平台服务',
  dashboard: '平台服务',
  platform: '平台服务',
  reviews: '评价服务',
  files: '文件服务'
}

function serviceName(url) {
  const path = String(url || '').split('?')[0].replace(/^\/+/, '')
  return SERVICE_BY_PREFIX[path.split('/')[0]]
}

function unavailableMessage(url) {
  const name = serviceName(url)
  return name ? `${name}异常，请联系客服` : '服务暂不可用，请联系客服'
}

/** 相同文案短时间内合并，避免首页并发请求同时失败时刷屏 */
function notify(message) {
  ElMessage({ message, type: 'error', grouping: true })
}

// 请求拦截：携带令牌与设备标识（登录记录、信任设备用）
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('myshop_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Device-Id'] = getDeviceId()
  config.headers['X-Device-Name'] = getDeviceName()
  return config
})

// 响应拦截：统一处理 Result{code, message, data}；
// 配置 silent: true 的请求（角标、未读数等后台刷新）失败时不弹提示
request.interceptors.response.use(
  (response) => {
    const result = response.data
    if (result.code === 200) {
      return result
    }
    if (!response.config?.silent) notify(result.message || '操作失败')
    return Promise.reject(new Error(result.message || '操作失败'))
  },
  (error) => {
    const status = error.response?.status
    const backendMessage = error.response?.data?.message
    const url = error.config?.url || ''
    // 商品/分类/品牌等公开浏览接口：未登录不应被强制跳转登录页
    const isPublic = url.startsWith('/products') || url.startsWith('/categories')
      || url.startsWith('/brands') || url.startsWith('/config/public')

    if (status === 401) {
      if (!isPublic) {
        notify(backendMessage || '登录已过期，请重新登录')
        localStorage.removeItem('myshop_token')
        localStorage.removeItem('myshop_user')
        if (!location.pathname.startsWith(`${import.meta.env.BASE_URL}login`)) {
          location.href = `${import.meta.env.BASE_URL}login`
        }
      }
      return Promise.reject(error)
    }

    // 后台刷新类请求失败不打扰用户（页面自己的数据请求仍会提示）
    if (error.config?.silent) return Promise.reject(error)

    if (!error.response) {
      // 网关/代理不可达，没有拿到任何响应
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        notify('网络连接已断开，请检查网络')
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        notify(`${serviceName(url) || '服务'}响应超时，请稍后重试`)
      } else {
        notify(unavailableMessage(url))
      }
    } else if (status >= 500) {
      // 网关返回的服务专属提示（如「订单服务异常，请联系客服」）优先展示；
      // 若是代理层/框架返回的通用 5xx 文案，则按接口路径推断服务名
      const generic = !backendMessage || /^(Service Unavailable|Internal Server Error|Bad Gateway|Gateway Timeout)$/i.test(backendMessage)
      notify(generic ? unavailableMessage(url) : backendMessage)
    } else {
      notify(backendMessage || '操作失败，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
