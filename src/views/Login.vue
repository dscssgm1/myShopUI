<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <div class="logo">🛒 myShop</div>
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
      <div class="demo">
        <el-button size="small" @click="quickLogin('buyer')">🙋 买家</el-button>
        <el-button size="small" @click="quickLogin('merchant')">🏪 商家</el-button>
        <el-button size="small" @click="quickLogin('admin')">🛠️ 管理员</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'

const router = useRouter()
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
    router.push('/home')
  } finally {
    loading.value = false
  }
}

function submit() {
  formRef.value.validate((ok) => {
    if (ok) {
      doLogin(form.username, form.password)
    }
  })
}

function quickLogin(username) {
  doLogin(username, '123456')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
}
.auth-card {
  width: 400px;
}
.logo {
  font-size: 26px;
  font-weight: 700;
  color: #ff4b2b;
  text-align: center;
  margin-bottom: 4px;
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
  color: #396afc;
}
.demo {
  display: flex;
  justify-content: center;
  gap: 8px;
}
</style>
