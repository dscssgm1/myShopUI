<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="auditFilter" size="small" @change="search">
        <el-radio-button value="PENDING">待审核</el-radio-button>
        <el-radio-button value="PENDING_EDIT">修改待审核</el-radio-button>
        <el-radio-button value="APPROVED">已通过</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="">全部</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="商品 / 店铺名称" size="small" clearable style="width: 200px" @keyup.enter="search" @clear="search" />
      <el-button type="primary" size="small" @click="search">查询</el-button>
    </div>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column label="商品" min-width="240">
        <template #default="{ row }">
          <img v-if="row.coverImage" :src="row.coverImage" class="p-thumb" alt="" />
          <span v-else class="p-icon">{{ row.emoji }}</span>
          <span>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="shopName" label="店铺" width="130" />
      <el-table-column prop="categoryName" label="分类" width="110" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }">
          <span class="price">¥{{ row.discountPrice ?? row.price }}</span>
          <span v-if="row.discountPrice" class="origin">¥{{ row.price }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80" />
      <el-table-column label="审核" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.pendingData" size="small" type="warning">修改待审核</el-tag>
          <el-tag v-else size="small" :type="auditTagType(row.auditStatus)">{{ auditText(row.auditStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上架" width="90">
        <template #default="{ row }">
          <!-- 待审核商品从未上架过，不展示上架状态 -->
          <el-tag v-if="row.auditStatus !== 'PENDING'" size="small" :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '上架中' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openAudit(row)">
            {{ row.pendingData ? '审核修改' : row.auditStatus === 'PENDING' ? '审核' : '查看' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <!-- 审核弹窗：上架中商品的修改展示「修改后 vs 当前线上」对比 -->
    <el-dialog v-model="auditDialog" :title="auditRow?.pendingData ? '商品修改审核' : '商品审核'" width="680px">
      <template v-if="auditRow">
        <div class="audit-head">
          <b>{{ auditRow.pendingData?.name || auditRow.name }}</b>
          <el-tag v-if="auditRow.pendingData" size="small" type="warning">修改待审核</el-tag>
          <el-tag v-else size="small" :type="auditTagType(auditRow.auditStatus)">{{ auditText(auditRow.auditStatus) }}</el-tag>
        </div>

        <template v-if="auditRow.pendingData">
          <div class="img-title">修改后内容（审核通过后对买家生效）</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item v-for="f in pendingFields" :key="f.label" :label="f.label" :span="f.span || 1">{{ f.value }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="pendingImages.length" class="img-list" style="margin-top: 10px">
            <el-image
              v-for="(img, i) in pendingImages" :key="img"
              :src="img" fit="cover" class="audit-img"
              :preview-src-list="pendingImages" :initial-index="i" preview-teleported
            />
          </div>
          <div class="img-title">当前线上内容（驳回后买家继续看到这部分）</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item v-for="f in currentFields" :key="f.label" :label="f.label" :span="f.span || 1">{{ f.value }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="auditImages.length" class="img-list" style="margin-top: 10px">
            <el-image
              v-for="(img, i) in auditImages" :key="img"
              :src="img" fit="cover" class="audit-img"
              :preview-src-list="auditImages" :initial-index="i" preview-teleported
            />
          </div>
        </template>
        <template v-else>
          <p class="audit-meta">
            店铺：{{ auditRow.shopName || '自营' }} ｜ 分类：{{ auditRow.categoryName || '-' }}
            ｜ 价格：¥{{ auditRow.discountPrice ?? auditRow.price }} ｜ 库存：{{ auditRow.stock }}
          </p>
          <div v-if="rowDetailHtml" class="rich-detail audit-desc" v-html="rowDetailHtml"></div>
          <p v-else class="audit-desc muted">暂无商品详情</p>

          <div class="img-title">商品图片（{{ auditImages.length }}）</div>
          <div v-if="auditImages.length" class="img-list">
            <el-image
              v-for="(img, i) in auditImages" :key="img"
              :src="img" fit="cover" class="audit-img"
              :preview-src-list="auditImages" :initial-index="i" preview-teleported
            />
          </div>
          <el-empty v-else description="该商品未上传图片" :image-size="60" />
        </template>

        <div v-if="rejecting" class="reject-box">
          <div class="img-title">驳回原因（必填，商家将据此修改后重新提交）</div>
          <el-select
            v-model="rejectCategory" filterable allow-create default-first-option
            placeholder="选择驳回原因类别，也可输入自定义类别" style="width: 100%; margin-bottom: 8px"
          >
            <el-option v-for="r in rejectPresets" :key="r" :label="r" :value="r" />
          </el-select>
          <el-input
            v-model="rejectDetail" type="textarea" :rows="2"
            maxlength="200" show-word-limit placeholder="请填写具体原因"
          />
        </div>
      </template>
      <template #footer>
        <el-button @click="auditDialog = false">关闭</el-button>
        <template v-if="canAudit && !rejecting">
          <el-button v-perm="'admin:audit:product'" type="danger" @click="startReject">驳回</el-button>
          <el-button v-perm="'admin:audit:product'" type="success" :loading="auditing" @click="doAudit(true)">
            {{ auditRow?.pendingData ? '通过修改' : '通过' }}
          </el-button>
        </template>
        <template v-if="rejecting">
          <el-button @click="rejecting = false">返回</el-button>
          <el-button v-perm="'admin:audit:product'" type="danger" :loading="auditing" @click="doAudit(false)">确认驳回</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { auditProduct, fetchAdminProducts } from '../../../api/admin'
import { fetchPublicConfig, parseConfigJson } from '../../../api/config'
import { sanitizeRichText, textToParagraph } from '../../../utils/richtext'

// 审核动作完成后通知壳子刷新各 Tab 角标
const emit = defineEmits(['changed'])

const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const keyword = ref('')
/** PENDING 新发布待审 / PENDING_EDIT 修改待审核 / APPROVED / REJECTED / '' 全部 */
const auditFilter = ref('PENDING')
const loading = ref(false)

const auditDialog = ref(false)
const auditRow = ref(null)
const auditing = ref(false)
const rejecting = ref(false)
// 驳回原因 = 类别（配置中心 audit-reject-reason 组快选）+ 详细原因
const rejectCategory = ref('')
const rejectDetail = ref('')
const rejectPresets = ref([])
const auditImages = computed(() => auditRow.value
  ? [...new Set([auditRow.value.coverImage, ...(auditRow.value.images || [])].filter(Boolean))]
  : [])

/** 审核弹窗中的详情富文本（优先 detail，存量商品回退旧 description） */
const rowDetailHtml = computed(() => {
  const src = auditRow.value
  if (!src) return ''
  return sanitizeRichText(src.detail || textToParagraph(src.description))
})

// 待审核修改与当前线上内容的对比展示
const pendingImages = computed(() => {
  const p = auditRow.value?.pendingData
  if (!p) return []
  return [...new Set([p.coverImage, ...(p.images || [])].filter(Boolean))]
})
const pendingFields = computed(() => diffFields(auditRow.value?.pendingData))
const currentFields = computed(() => diffFields(auditRow.value))
const canAudit = computed(() =>
  auditRow.value?.auditStatus === 'PENDING' || !!auditRow.value?.pendingData)

function diffFields(src) {
  return [
    { label: '名称', value: src?.name || '—' },
    { label: '售价', value: src?.price != null ? `¥${src.price}` : '—' },
    { label: '促销价', value: src?.discountPrice != null ? `¥${src.discountPrice}` : '无' },
    { label: '库存', value: src?.stock ?? '—' },
    { label: '服务保障', value: (src?.serviceKeys || []).join('、') || '无' },
    { label: '规格', value: formatSpecs(src?.specs), span: 2 },
    { label: '详情', value: detailText(src) || '无', span: 2 }
  ]
}

function formatSpecs(specs) {
  return (specs || []).map((g) => `${g.name}：${(g.options || []).join('/')}`).join(' ｜ ')
}

/** 详情富文本转纯文本摘要，供对比表格展示 */
function detailText(src) {
  const html = src?.detail || textToParagraph(src?.description)
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

onMounted(() => {
  load()
  loadRejectPresets()
})

const auditText = (s) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }[s] || s)
const auditTagType = (s) => ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }[s] || 'info')

function buildParams() {
  const params = {
    includeAll: true,
    keyword: keyword.value || undefined,
    page: page.value,
    size
  }
  if (auditFilter.value === 'PENDING_EDIT') params.pendingEdit = true
  else if (auditFilter.value) params.auditStatus = auditFilter.value
  return params
}

function search() {
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminProducts(buildParams())
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { rows.value = [] } finally { loading.value = false }
}

async function loadRejectPresets() {
  try {
    const res = await fetchPublicConfig('audit-reject-reason', { silent: true })
    const parsed = parseConfigJson((res.data || []).find((i) => i.key === 'default')?.value, [])
    rejectPresets.value = Array.isArray(parsed) ? parsed : []
  } catch { /* 快选项加载失败不影响审核 */ }
}

function openAudit(row) {
  auditRow.value = row
  rejecting.value = false
  rejectCategory.value = ''
  rejectDetail.value = ''
  auditDialog.value = true
}

function startReject() {
  rejecting.value = true
  rejectCategory.value = ''
  rejectDetail.value = ''
}

async function doAudit(approved) {
  const row = auditRow.value
  const category = rejectCategory.value.trim()
  const detail = rejectDetail.value.trim()
  if (!approved) {
    if (rejectPresets.value.length && !category) {
      ElMessage.warning('请选择驳回原因类别')
      return
    }
    if (!detail) {
      ElMessage.warning('请填写驳回原因')
      return
    }
  }
  const reason = category ? `【${category}】${detail}` : detail
  auditing.value = true
  try {
    await auditProduct(row.id, approved, reason || undefined)
    ElMessage.success(approved
      ? (row.pendingData ? '修改已通过，商品内容已更新' : '审核已通过，商品已上架')
      : '已驳回')
    auditDialog.value = false
    load()
    emit('changed')
  } catch { /* ignore */ } finally {
    auditing.value = false
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.p-icon {
  margin-right: 6px;
}
.p-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 6px;
  vertical-align: middle;
}
.audit-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}
.audit-meta {
  color: #666;
  font-size: 13px;
  margin-top: 8px;
}
.audit-desc {
  color: #444;
  font-size: 13px;
  line-height: 1.8;
  background: #fafafa;
  border-radius: 6px;
  padding: 10px 12px;
  max-height: 260px;
  overflow-y: auto;
  margin-top: 8px;
}
.img-title {
  font-size: 13px;
  color: #666;
  margin: 14px 0 8px;
}
.reject-box {
  margin-top: 16px;
  border-top: 1px dashed #eee;
  padding-top: 4px;
}
.img-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.audit-img {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid #eee;
}
.price {
  color: #ff4b2b;
  font-weight: 600;
}
.origin {
  color: #bbb;
  text-decoration: line-through;
  font-size: 12px;
  margin-left: 4px;
}
</style>
