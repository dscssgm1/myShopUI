<template>
  <div class="page-card">
    <div class="head"><h3>📧 修改邮箱</h3></div>
    <el-form label-width="90px" style="max-width: 420px">
      <el-form-item label="当前邮箱">
        <el-input :model-value="overview.maskedEmail || '—'" disabled />
      </el-form-item>
      <el-form-item label="新邮箱">
        <el-input v-model="email" placeholder="请输入新邮箱地址" />
      </el-form-item>
      <el-form-item label="邮箱验证码">
        <!-- 无论设备是否信任，新邮箱都需验证码确认归属 -->
        <EmailCodeField v-model:code="code" mode="email" :email="email" purpose="CHANGE_EMAIL" />
      </el-form-item>
      <el-form-item>
        <el-button type="danger" :loading="loading" @click="submit">绑定新邮箱</el-button>
        <el-button @click="router.replace('/user/security')">返回</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EmailCodeField from '../../components/EmailCodeField.vue'
import { changeEmail, fetchSecurityOverview } from '../../api/user'
import { peekVerifyToken, takeVerifyToken } from '../../utils/trust'
import { useUserStore } from '../../store/user'

const router = useRouter()
const userStore = useUserStore()
const overview = ref({})
const trusted = ref(true)
const verifyToken = ref('')
const email = ref('')
const code = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const res = await fetchSecurityOverview()
    overview.value = res.data || {}
    trusted.value = !!res.data?.currentDeviceTrusted
  } catch {
    trusted.value = false
  }
  // 未信任设备必须先完成身份验证（向当前邮箱发码）
  verifyToken.value = peekVerifyToken()
  if (!trusted.value && !verifyToken.value) {
    router.replace('/user/security/verify?redirect=email')
  }
})

async function submit() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    ElMessage.warning('请输入正确的新邮箱地址')
    return
  }
  if (!code.value) {
    ElMessage.warning('请输入新邮箱验证码')
    return
  }
  loading.value = true
  try {
    await changeEmail({
      email: email.value,
      code: code.value,
      verifyToken: verifyToken.value || undefined
    })
    takeVerifyToken()
    ElMessage.success('邮箱修改成功')
    if (userStore.user) {
      userStore.user.email = email.value
      localStorage.setItem('myshop_user', JSON.stringify(userStore.user))
    }
    router.replace('/user/security')
  } catch (e) {
    if (e?.response?.data?.code === 40005) {
      router.replace('/user/security/verify?redirect=email')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
.head {
  margin-bottom: 14px;
}
h3 {
  margin: 0;
}
</style>
