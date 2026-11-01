<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <h2>注册账号</h2>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-32 位字母、数字或下划线" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="展示昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="用于接收验证码" />
        </el-form-item>
        <el-form-item label="邮箱验证码" prop="emailCode">
          <div class="code-row">
            <el-input v-model="form.emailCode" placeholder="6 位验证码" maxlength="6" />
            <el-button :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入密码" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          注 册
        </el-button>
      </el-form>

      <p class="to-login">已有账号？<router-link to="/login">去登录</router-link></p>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register as registerApi, sendEmailCode } from '../api/auth'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const countdown = ref(0)
let timer = null

const form = reactive({
  username: '', nickname: '', email: '', emailCode: '', password: '', confirm: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,32}$/, message: '3-32 位字母、数字或下划线', trigger: 'blur' }
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确', trigger: 'blur' }
  ],
  emailCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: (r, v, cb) => (v === form.password ? cb() : cb(new Error('两次密码不一致'))), trigger: 'blur' }
  ]
}

function sendCode() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    ElMessage.warning('请先输入正确的邮箱')
    return
  }
  sendEmailCode(form.email, 'REGISTER')
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
    registerApi({
      username: form.username,
      nickname: form.nickname,
      email: form.email,
      emailCode: form.emailCode,
      password: form.password
    })
      .then(() => {
        ElMessage.success('注册成功，请登录')
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
