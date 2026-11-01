<template>
  <div class="home">
    <div class="topbar">
      <span>🛒 myShop</span>
      <div class="user">
        <span>👤 {{ userStore.user?.nickname || userStore.user?.username }}</span>
        <el-button size="small" @click="logout">退出登录</el-button>
      </div>
    </div>
    <div class="content">
      <el-empty description="登录成功，商城首页建设中" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()

function logout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #f5f5f5;
}
.topbar {
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 16px;
  font-weight: 600;
}
.user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 400;
  font-size: 14px;
}
.content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
}
</style>
