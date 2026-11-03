<template>
  <div class="page-card">
    <div class="head"><h3>🔐 身份验证</h3></div>
    <p class="desc">
      当前设备未被信任。为保护账号安全，请先验证身份：验证码将发送至
      <b>{{ overview.maskedEmail || '当前账号邮箱' }}</b>，验证通过后即可继续操作。
    </p>

    <el-form label-width="90px" style="max-width: 420px">
      <el-form-item label="验证码">
        <EmailCodeField v-model:code="code" mode="identity" />
      </el-form-item>
      <el-form-item>
        <el-button type="danger" :loading="submitting" @click="submit">验证身份</el-button>
        <el-button @click="back">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EmailCodeField from '../../components/EmailCodeField.vue'
import { fetchSecurityOverview, verifyIdentity } from '../../api/user'
import { rememberVerifyToken, promptTrustDevice } from '../../utils/trust'

const route = useRoute()
const router = useRouter()
const overview = ref({})
const code = ref('')
const submitting = ref(false)

onMounted(() => {
  fetchSecurityOverview()
    .then((res) => (overview.value = res.data || {}))
    .catch(() => {})
})

function target() {
  return route.query.redirect === 'email' ? '/user/security/email' : '/user/security/password'
}

async function submit() {
  if (!code.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  submitting.value = true
  try {
    const res = await verifyIdentity(code.value)
    const token = res.data?.verifyToken
    // 凭证暂存供目标页使用；同时按规则询问是否信任此设备
    rememberVerifyToken(token)
    await promptTrustDevice(token)
    ElMessage.success('身份验证通过')
    router.replace(target())
  } catch { /* 后端已提示 */ } finally {
    submitting.value = false
  }
}

function back() {
  router.replace('/user/security')
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
  margin-bottom: 8px;
}
h3 {
  margin: 0;
}
.desc {
  color: #666;
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 20px;
}
</style>
