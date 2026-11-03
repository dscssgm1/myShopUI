<template>
  <div class="code-field">
    <el-input
      :model-value="code" placeholder="6 位验证码" maxlength="6"
      @update:model-value="$emit('update:code', $event)"
    />
    <el-button :disabled="countdown > 0" :loading="sending" @click="send">
      {{ countdown > 0 ? `${countdown}s 后重发` : buttonText }}
    </el-button>
  </div>
</template>

<script setup>
/**
 * 公共邮箱验证码输入组件：
 * - mode="identity"：向当前账号邮箱发送身份验证码（登录态，邮箱由后端解析）
 * - mode="email"：向 props.email 发送指定用途验证码（注册/新邮箱/找回密码）
 * 验证码校验通过后的「是否信任此设备」提示由 utils/trust.js 的
 * promptTrustDevice 统一处理，各页面验证成功后调用即可。
 */
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { sendEmailCode } from '../api/auth'
import { sendIdentityCode } from '../api/user'

const props = defineProps({
  code: { type: String, default: '' },
  mode: { type: String, default: 'email' },
  email: { type: String, default: '' },
  purpose: { type: String, default: 'CHANGE_EMAIL' },
  buttonText: { type: String, default: '获取验证码' }
})
const emit = defineEmits(['update:code'])

const sending = ref(false)
const countdown = ref(0)
let timer = null

onBeforeUnmount(() => timer && clearInterval(timer))

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function send() {
  if (props.mode === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) {
      ElMessage.warning('请先输入正确的邮箱地址')
      return
    }
    sending.value = true
    try {
      const res = await sendEmailCode(props.email, props.purpose)
      ElMessage.success(res.data?.code
        ? `验证码已发送（联调模式）：${res.data.code}`
        : '验证码已发送，请查收邮件')
      startCountdown()
    } catch { /* 后端已提示 */ } finally {
      sending.value = false
    }
  } else {
    sending.value = true
    try {
      const res = await sendIdentityCode()
      ElMessage.success(res.data?.code
        ? `验证码已发送（联调模式）：${res.data.code}`
        : '验证码已发送，请查收邮件')
      startCountdown()
    } catch { /* 后端已提示 */ } finally {
      sending.value = false
    }
  }
}
</script>

<style scoped>
.code-field {
  display: flex;
  gap: 10px;
  width: 100%;
}
.code-field .el-button {
  flex-shrink: 0;
}
</style>
