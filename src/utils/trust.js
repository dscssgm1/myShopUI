import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchSecurityOverview, trustCurrentDevice } from '../api/user'
import { getDeviceId, getDeviceName } from './device'

const VERIFY_TOKEN_KEY = 'ms_verify_token'

/** 暂存身份验证凭证（注册/找回密码时还未登录，登录后再提示信任） */
export function rememberVerifyToken(token) {
  sessionStorage.setItem(VERIFY_TOKEN_KEY, token)
}

export function peekVerifyToken() {
  return sessionStorage.getItem(VERIFY_TOKEN_KEY) || ''
}

export function takeVerifyToken() {
  const token = sessionStorage.getItem(VERIFY_TOKEN_KEY) || ''
  sessionStorage.removeItem(VERIFY_TOKEN_KEY)
  return token
}

/**
 * 任一邮箱验证码验证成功后调用：若当前设备未被信任，
 * 弹窗询问「是否信任此设备」，同意则调用接口标记。
 */
export async function promptTrustDevice(verifyToken) {
  if (!verifyToken) return
  try {
    const overview = await fetchSecurityOverview()
    if (overview.data?.currentDeviceTrusted) return
    try {
      await ElMessageBox.confirm(
        '信任后，本机修改密码、修改邮箱将无需再进行邮箱身份验证。',
        '是否信任此设备？',
        { confirmButtonText: '信任此设备', cancelButtonText: '暂不信任', type: 'info' }
      )
    } catch {
      return
    }
    await trustCurrentDevice({
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      verifyToken
    })
    ElMessage.success('已信任此设备')
  } catch { /* 已信任或网络失败时静默 */ }
}
