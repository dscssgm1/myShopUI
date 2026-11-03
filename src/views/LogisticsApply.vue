<template>
  <div class="apply-page">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="head">
          <b>🚚 物流入驻申请</b>
          <span class="tip">提交后由平台业务员初审，再由平台管理员终审，结果将通过站内消息通知</span>
        </div>
      </template>

      <el-steps :active="1" align-center class="steps" finish-status="success">
        <el-step title="提交申请" description="填写公司资料" />
        <el-step title="业务员初审" description="平台业务员审核" />
        <el-step title="管理员终审" description="平台管理员审核" />
        <el-step title="入驻成功" description="开通物流账号" />
      </el-steps>

      <el-form :model="form" label-width="90px" class="form">
        <el-form-item label="公司名称" required>
          <el-input v-model="form.name" placeholder="营业执照上的公司全称" maxlength="50" />
        </el-form-item>
        <el-form-item label="公司编码" required>
          <el-input v-model="form.code" placeholder="英文缩写，如 SF / ZTO / YD" maxlength="16" />
        </el-form-item>
        <el-form-item label="联系人" required>
          <el-input v-model="form.contact" placeholder="负责人姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="联系电话" required>
          <el-input v-model="form.phone" placeholder="手机号或座机" maxlength="20" />
        </el-form-item>
        <el-form-item label="公司介绍">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="经营范围、覆盖区域等（选填）" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="list-card">
      <template #header><b>我的申请记录（{{ items.length }}）</b></template>
      <el-empty v-if="!items.length" description="暂无入驻申请" />
      <div v-for="it in items" :key="it.id" class="record">
        <div class="main">
          <div class="title">
            <b>{{ it.title }}</b>
            <el-tag size="small" :type="statusTag(it.status)">{{ statusText(it.status) }}</el-tag>
          </div>
          <div class="detail">{{ it.detail }}</div>
          <div v-if="it.reason" class="reason">审核意见：{{ it.reason }}</div>
          <div class="time">提交于 {{ formatTime(it.createdAt) }}</div>
        </div>
        <el-progress
          :percentage="progress(it.status)" :status="progressStatus(it.status)"
          :stroke-width="8" class="progress" :show-text="false"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMyLogisticsApplies, submitLogisticsApply } from '../api/admin'

const form = reactive({ name: '', code: '', contact: '', phone: '', description: '' })
const items = ref([])
const submitting = ref(false)

onMounted(loadMine)

const statusText = (s) => ({
  PENDING: '待业务员初审', FIRST_APPROVED: '待管理员终审', APPROVED: '已入驻', REJECTED: '已驳回'
}[s] || s)
const statusTag = (s) => ({ PENDING: 'warning', FIRST_APPROVED: 'primary', APPROVED: 'success', REJECTED: 'danger' }[s] || 'info')

function progress(s) {
  return { PENDING: 33, FIRST_APPROVED: 66, APPROVED: 100, REJECTED: 100 }[s] || 0
}
function progressStatus(s) {
  return s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'exception' : undefined
}

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function loadMine() {
  try {
    const res = await fetchMyLogisticsApplies()
    items.value = res.data || []
  } catch { items.value = [] }
}

async function submit() {
  if (!form.name.trim() || !form.code.trim() || !form.contact.trim() || !form.phone.trim()) {
    ElMessage.warning('请完整填写公司名称、编码、联系人和电话')
    return
  }
  submitting.value = true
  try {
    await submitLogisticsApply({
      name: form.name.trim(),
      code: form.code.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim(),
      description: form.description.trim()
    })
    ElMessage.success('入驻申请已提交，等待平台业务员初审')
    Object.assign(form, { name: '', code: '', contact: '', phone: '', description: '' })
    loadMine()
  } catch { /* ignore */ } finally { submitting.value = false }
}
</script>

<style scoped>
.apply-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.tip {
  font-size: 12px;
  color: #999;
}
.steps {
  margin-bottom: 20px;
}
.form {
  max-width: 560px;
}
.record {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}
.reason {
  font-size: 13px;
  color: #e6a23c;
  margin-top: 4px;
}
.time {
  font-size: 12px;
  color: #bbb;
  margin-top: 6px;
}
.progress {
  margin-top: 10px;
}
</style>
