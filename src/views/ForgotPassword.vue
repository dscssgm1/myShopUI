<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <h2>找回密码</h2>
      <p class="desc">输入注册时绑定的邮箱，通过验证码重置密码</p>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="注册邮箱" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="6 位验证码" maxlength="6" />
            <el-button :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          重置密码
        </el-button>
      </el-form>

      <p class="to-login">想起密码了？<router-link to="/login">去登录</router-link></p>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { forgotPassword, resetPassword } from '../api/auth'
import { rememberVerifyToken } from '../utils/trust'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const countdown = ref(0)
let timer = null

const form = reactive({ email: '', code: '', newPassword: '', confirm: '' })

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: (r, v, cb) => (v === form.newPassword ? cb() : cb(new Error('两次密码不一致'))), trigger: 'blur' }
  ]
}

function sendCode() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    ElMessage.warning('请先输入正确的邮箱')
    return
  }
  forgotPassword(form.email)
    .then((result) => {
      ElMessage.success(result.data?.code ? `验证码已发送（调试）：${result.data.code}` : '验证码已发送，请查收邮件')
      startCountdown()
    })
    .catch(() => {})
}

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

function submit() {
  formRef.value.validate((ok) => {
    if (!ok) return
    loading.value = true
    resetPassword({
      email: form.email,
      code: form.code,
      newPassword: form.newPassword
    })
      .then((result) => {
        // 验证码已验证：暂存凭证，登录后提示「是否信任此设备」
        const token = result.data?.verifyToken
        if (token) rememberVerifyToken(token)
        ElMessage.success('密码已重置，请重新登录')
        router.push('/login')
      })
      .catch(() => {})
      .finally(() => (loading.value = false))
  })
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.auth-card {
  width: 420px;
}
h2 {
  text-align: center;
  margin-bottom: 8px;
}
.desc {
  text-align: center;
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
}
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.code-row .el-button {
  flex-shrink: 0;
}
.to-login {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}
.to-login a {
  color: #ff4b2b;
}
</style>
