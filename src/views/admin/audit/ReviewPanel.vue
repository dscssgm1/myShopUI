<template>
  <div>
    <div class="toolbar">
      <div class="stats">
        <el-tag type="warning" size="small">待审核 {{ stats.pending }}</el-tag>
        <el-tag type="danger" size="small">被举报 {{ stats.reported }}</el-tag>
        <el-tag type="success" size="small">已展示 {{ stats.visible }}</el-tag>
        <el-tag type="info" size="small">已隐藏 {{ stats.hidden }}</el-tag>
      </div>
      <el-radio-group v-model="status" size="small" class="filter">
        <el-radio-button value="PENDING">待审核</el-radio-button>
        <el-radio-button value="REPORTED">被举报</el-radio-button>
        <el-radio-button value="HIDDEN">已隐藏</el-radio-button>
        <el-radio-button value="VISIBLE">已展示</el-radio-button>
        <el-radio-button value="">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column prop="productName" label="商品" min-width="200" show-overflow-tooltip />
      <el-table-column prop="nickname" label="用户" width="110" />
      <el-table-column label="评分" width="140">
        <template #default="{ row }">
          <el-rate :model-value="row.rating" disabled size="small" />
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="240" show-overflow-tooltip />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.reported && row.status === 'VISIBLE'" size="small" type="danger">被举报</el-tag>
          <el-tag v-else size="small" :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reportReason" label="举报原因" width="160" show-overflow-tooltip />
      <el-table-column label="提交时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING' || (row.reported && row.status === 'VISIBLE')">
            <el-button v-perm="'admin:audit:review'" link type="primary" size="small" @click="approve(row)">通过</el-button>
            <el-button v-perm="'admin:audit:review'" link type="danger" size="small" @click="hide(row)">隐藏</el-button>
          </template>
          <el-button v-else-if="row.status === 'HIDDEN'" v-perm="'admin:audit:review'" link type="primary" size="small" @click="approve(row)">
            恢复展示
          </el-button>
          <span v-else class="muted">已展示</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size"
      v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminReviews, fetchReviewStats, moderateReview } from '../../../api/review'

// 审核动作完成后通知壳子刷新各 Tab 角标
const emit = defineEmits(['changed'])

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('PENDING')
const loading = ref(false)
const stats = ref({ pending: 0, reported: 0, visible: 0, hidden: 0 })

onMounted(() => {
  load()
  loadStats()
})
watch(status, () => { page.value = 1; load() })

const statusText = (s) => ({ VISIBLE: '已展示', PENDING: '待审核', HIDDEN: '已隐藏' }[s] || s)
const statusType = (s) => ({ VISIBLE: 'success', PENDING: 'warning', HIDDEN: 'danger' }[s] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminReviews({ status: status.value || undefined, page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await fetchReviewStats()
    stats.value = res.data || { pending: 0, reported: 0, visible: 0, hidden: 0 }
  } catch { /* ignore */ }
}

function approve(row) {
  ElMessageBox.confirm(
    row.reported ? '通过后该评价继续公开展示，举报不成立。' : '通过后该评价将公开展示并计入商品与店铺评分。',
    '审核通过', { type: 'info' }
  ).then(async () => {
    await moderateReview(row.id, 'APPROVE', '')
    ElMessage.success('已通过')
    load()
    loadStats()
    emit('changed')
  }).catch(() => {})
}

function hide(row) {
  ElMessageBox.prompt('隐藏后该评价不再展示，也不计入商品与店铺评分。请填写原因：', '隐藏评价', {
    inputPlaceholder: '例如：含辱骂、广告或与商品无关的内容',
    inputValidator: (v) => !!v || '请填写原因'
  }).then(async ({ value }) => {
    await moderateReview(row.id, 'HIDE', value)
    ElMessage.success('已隐藏')
    load()
    loadStats()
    emit('changed')
  }).catch(() => {})
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.stats {
  display: flex;
  gap: 6px;
}
.filter {
  margin-left: auto;
}
.muted {
  font-size: 12px;
  color: #bbb;
}
</style>
