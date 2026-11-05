<template>
  <div class="my-reviews">
    <h3>⭐ 我的评价 <span class="sub">仅限已完成订单中的商品</span></h3>

    <div v-loading="loading">
      <el-empty v-if="!loading && !items.length" description="暂无评价，确认收货后即可评价" />

      <div v-for="r in items" :key="r.id" class="review-card">
        <div class="head">
          <router-link :to="`/product/${r.productId}`" class="pname">{{ r.productName }}</router-link>
          <el-tag size="small" :type="statusType(r.status)">{{ statusText(r) }}</el-tag>
          <el-button link type="danger" size="small" class="del" @click="onDelete(r)">删除</el-button>
          <span class="time">{{ formatTime(r.createdAt) }}</span>
        </div>
        <div class="rate-line">
          <el-rate :model-value="overall(r)" disabled size="small" allow-half />
          <span class="overall-num">{{ overall(r) }} 分</span>
        </div>
        <p class="dims">质量 {{ dimText(r.qualityRating) }} · 服务 {{ dimText(r.serviceRating) }} · 物流 {{ dimText(r.logisticsRating) }}</p>
        <p class="content">{{ r.content }}</p>
        <div v-if="r.images?.length" class="images">
          <el-image
            v-for="(img, i) in r.images" :key="i"
            :src="img" :preview-src-list="r.images" :initial-index="i"
            fit="cover" preview-teleported class="thumb"
          />
        </div>
        <div v-if="r.reply" class="reply">
          <div class="reply-text"><b>商家回复：</b>{{ r.reply }}</div>
          <div v-if="r.replyAt" class="reply-time">{{ formatTime(r.replyAt) }}</div>
        </div>
        <p v-if="r.status === 'PENDING'" class="hint">新账号或消费较少的账号，评价需平台审核后公开展示</p>
        <p v-if="r.status === 'HIDDEN'" class="hint danger">
          该评价已被平台隐藏{{ r.auditReason ? '：' + r.auditReason : '' }}
        </p>
      </div>

      <el-pagination
        v-if="total > size"
        v-model:current-page="page" :page-size="size" :total="total"
        layout="prev, pager, next" style="justify-content: center; margin-top: 20px"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteReview, fetchMyReviews } from '../api/review'

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const loading = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchMyReviews({ page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

/** 删除评价：会扣回评价奖励积分，删除后不可再评价该商品 */
async function onDelete(r) {
  try {
    await ElMessageBox.confirm(
      '删除后评价不再展示，已发放的评价奖励积分将被扣回，且不能再次评价该商品。确认删除？',
      '删除评价',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }
  try {
    await deleteReview(r.id)
    ElMessage.success('评价已删除')
    // 删掉当前页最后一条时回退一页，避免停在空白页
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    load()
  } catch {
    // 失败提示由请求拦截器统一弹出
  }
}

const statusText = (s) => ({
  VISIBLE: '已展示', PENDING: '待平台审核', HIDDEN: '已隐藏'
}[s] || s)
const statusType = (s) => ({ VISIBLE: 'success', PENDING: 'warning', HIDDEN: 'danger' }[s] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

/** 综合分 = 三维度平均（半星），存量数据无维度时回退综合分 */
const overall = (r) => {
  const dims = [r.qualityRating, r.serviceRating, r.logisticsRating].filter((v) => v != null)
  if (!dims.length) return r.rating
  return (dims.reduce((sum, v) => sum + Number(v), 0) / dims.length).toFixed(1)
}
/** 维度展示：无值时显示 -（正常不会出现，迁移已回填） */
const dimText = (v) => (v != null ? Number(v) : '-')
</script>

<style scoped>
.my-reviews {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 12px;
}
.sub {
  font-size: 13px;
  color: #999;
  font-weight: 400;
  margin-left: 8px;
}
.review-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 12px;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.pname {
  font-weight: 600;
  color: #333;
}
.pname:hover {
  color: #ff4b2b;
}
.time {
  margin-left: auto;
  font-size: 12px;
  color: #bbb;
}
.del {
  padding: 0;
  font-size: 12px;
}
.rate-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.overall-num {
  color: #ff4b2b;
  font-size: 13px;
  font-weight: 600;
}
.dims {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}
.content {
  margin-top: 8px;
  color: #444;
  line-height: 1.8;
}
.images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.thumb {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  cursor: pointer;
}
.reply {
  margin-top: 10px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 6px;
}
.reply-text {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  word-break: break-word;
}
.reply-time {
  margin-top: 4px;
  font-size: 12px;
  color: #bbb;
  text-align: right;
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: #e6a23c;
}
.hint.danger {
  color: #f56c6c;
}
</style>
