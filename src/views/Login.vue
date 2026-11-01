<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <h2>账号登录</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div class="links">
        <router-link to="/register">注册账号</router-link>
        <router-link to="/forgot">忘记密码？</router-link>
      </div>

      <el-divider>演示账号（密码 123456）</el-divider>
      <div class="quick">
        <div class="q-row"><span class="q-label">用户端</span><el-button size="small" @click="quick('buyer')">🙋 买家</el-button></div>
        <div class="q-row">
          <span class="q-label">商家端</span>
          <el-button size="small" @click="quick('merchant')">🏪 店长</el-button>
          <el-button size="small" @click="quick('sales')">👔 业务员</el-button>
          <el-button size="small" @click="quick('shopcs')">🎧 客服</el-button>
        </div>
        <div class="q-row">
          <span class="q-label">物流端</span>
          <el-button size="small" @click="quick('logistics')">🚚 管理员</el-button>
          <el-button size="small" @click="quick('ltops')">📦 调度员</el-button>
          <el-button size="small" @click="quick('courier')">🛵 快递员</el-button>
        </div>
        <div class="q-row">
          <span class="q-label">平台端</span>
          <el-button size="small" @click="quick('admin')">🛠️ 管理员</el-button>
          <el-button size="small" @click="quick('ops')">📋 业务员</el-button>
          <el-button size="small" @click="quick('ptcs')">🛡️ 客服</el-button>
          <el-button size="small" @click="quick('devops')">🔧 运维员</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function doLogin(username, password) {
  loading.value = true
  try {
    await userStore.login(username, password)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/')
  } finally {
    loading.value = false
  }
}

function submit() {
  formRef.value.validate((ok) => {
    if (ok) doLogin(form.username, form.password)
  })
}

function quick(username) {
  doLogin(username, '123456')
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
.links {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
  color: #ff4b2b;
}
.quick {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.q-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.q-label {
  width: 52px;
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
}
</style>
