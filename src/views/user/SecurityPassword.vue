<template>
  <div class="page-card">
    <div class="head"><h3>🔑 修改密码</h3></div>
    <el-alert
      v-if="!trusted" type="warning" :closable="false" style="margin-bottom: 14px"
      title="本机为未信任设备，本次修改已通过邮箱身份验证。"
    />

    <el-form
      ref="formRef" :model="form" :rules="rules"
      label-width="90px" style="max-width: 420px"
    >
      <el-form-item label="当前密码" prop="oldPassword">
        <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入当前密码" />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" show-password placeholder="6-64 位新密码" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirm">
        <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入新密码" />
      </el-form-item>
      <el-form-item>
        <el-button type="danger" :loading="loading" @click="submit">保存新密码</el-button>
        <el-button @click="router.replace('/user/security')">返回</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword, fetchSecurityOverview } from '../../api/user'
import { peekVerifyToken, takeVerifyToken } from '../../utils/trust'

const router = useRouter()
const formRef = ref()
const trusted = ref(true)
const verifyToken = ref('')
const loading = ref(false)
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const rules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码长度 6-64 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_r, v, cb) => (v === form.newPassword ? cb() : cb(new Error('两次输入的密码不一致'))),
      trigger: 'blur'
    }
  ]
}

onMounted(async () => {
  try {
    const res = await fetchSecurityOverview()
    trusted.value = !!res.data?.currentDeviceTrusted
  } catch {
    trusted.value = false
  }
  // 未信任设备必须持有身份验证凭证，否则退回验证页
  verifyToken.value = peekVerifyToken()
  if (!trusted.value && !verifyToken.value) {
    router.replace('/user/security/verify?redirect=password')
  }
})

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    await changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
      verifyToken: verifyToken.value || undefined
    })
    takeVerifyToken()
    ElMessage.success('密码修改成功')
    router.replace('/user/security')
  } catch (e) {
    // 凭证过期：退回验证页重新走一遍
    if (e?.response?.data?.code === 40005) {
      router.replace('/user/security/verify?redirect=password')
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
