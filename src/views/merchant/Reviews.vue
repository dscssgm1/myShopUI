<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>评价管理</b>
        <span class="tip">对违规或不合理的评价可发起举报，由平台业务员审核是否隐藏</span>
      </div>
    </template>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column prop="productName" label="商品" min-width="200" show-overflow-tooltip />
      <el-table-column prop="nickname" label="买家" width="110" />
      <el-table-column label="评分" width="140">
        <template #default="{ row }">
          <el-rate :model-value="row.rating" disabled size="small" />
        </template>
      </el-table-column>
      <el-table-column label="评价内容" min-width="300">
        <template #default="{ row }">
          <div class="r-content">{{ row.content }}</div>
          <div v-if="row.images?.length" class="r-images">
            <el-image
              v-for="(img, i) in row.images" :key="i"
              :src="img" :preview-src-list="row.images" :initial-index="i"
              fit="cover" preview-teleported class="r-thumb"
            />
          </div>
          <div v-if="row.reply" class="r-reply">
            <b>商家回复：</b>{{ row.reply }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.reported && row.status === 'VISIBLE'" size="small" type="warning">举报待审</el-tag>
          <el-tag v-else size="small" :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'VISIBLE'">
            <el-button v-perm="'merchant:reviews:reply'" link type="primary" size="small" @click="openReply(row)">
              {{ row.reply ? '修改回复' : '回复' }}
            </el-button>
            <el-button v-if="!row.reported" v-perm="'merchant:reviews:report'" link type="danger" size="small" @click="report(row)">举报</el-button>
          </template>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="replyDialog" title="回复评价" width="480px">
      <div v-if="replyTarget" class="reply-target">
        买家「{{ replyTarget.nickname }}」：{{ replyTarget.content }}
      </div>
      <el-input
        v-model="replyText" type="textarea" :rows="4" maxlength="500" show-word-limit
        placeholder="请填写回复内容（最多 500 字），所有买家可见"
      />
      <template #footer>
        <el-button @click="replyDialog = false">取消</el-button>
        <el-button type="primary" :loading="replySubmitting" @click="submitReply">发布回复</el-button>
      </template>
    </el-dialog>

    <el-pagination
      v-if="total > size"
      v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchMerchantReviews, replyReview, reportReview } from '../../api/review'

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const loading = ref(false)

onMounted(load)

const statusText = (s) => ({ VISIBLE: '已展示', PENDING: '待审核', HIDDEN: '已隐藏' }[s] || s)
const statusType = (s) => ({ VISIBLE: 'success', PENDING: 'warning', HIDDEN: 'danger' }[s] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchMerchantReviews({ page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function report(row) {
  ElMessageBox.prompt('请说明该评价的问题（如辱骂、广告、与商品无关）：', '举报评价', {
    inputPlaceholder: '举报原因',
    inputValidator: (v) => !!v || '请填写举报原因'
  }).then(async ({ value }) => {
    await reportReview(row.id, value)
    ElMessage.success('举报已提交，等待平台业务员审核')
    load()
  }).catch(() => {})
}

// ==================== 商家回复 ====================

const replyDialog = ref(false)
const replySubmitting = ref(false)
const replyTarget = ref(null)
const replyText = ref('')

function openReply(row) {
  replyTarget.value = row
  replyText.value = row.reply || ''
  replyDialog.value = true
}

async function submitReply() {
  const text = replyText.value.trim()
  if (!text) {
    ElMessage.warning('请填写回复内容')
    return
  }
  replySubmitting.value = true
  try {
    await replyReview(replyTarget.value.id, text)
    replyDialog.value = false
    ElMessage.success('回复已发布')
    load()
  } catch { /* 后端已提示具体原因 */ } finally {
    replySubmitting.value = false
  }
}
</script>

<style scoped>
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
.muted {
  font-size: 12px;
  color: #bbb;
}
.r-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  color: #333;
}
.r-images {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.r-thumb {
  width: 48px;
  height: 48px;
  border-radius: 4px;
}
.r-reply {
  margin-top: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}
.reply-target {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  word-break: break-word;
}
</style>
