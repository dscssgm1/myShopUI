<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="status" size="small">
        <el-radio-button value="PENDING">待审核</el-radio-button>
        <el-radio-button value="FIRST_APPROVED">待终审</el-radio-button>
        <el-radio-button value="APPROVED">已通过</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column label="类型" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'LOGISTICS_APPLY' ? 'warning' : ''">{{ typeText(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="申请事项" min-width="180" />
      <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip />
      <el-table-column prop="applicantName" label="申请人" width="100" />
      <el-table-column label="提交时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <template v-if="row.type === 'LOGISTICS_APPLY'">
            <el-button link size="small" @click="showDetail(row)">资料</el-button>
            <!-- 初审阶段：仅业务员可审 -->
            <template v-if="row.status === 'PENDING'">
              <template v-if="role === 'admin-sales'">
                <el-button link type="primary" size="small" @click="first(row)">初审通过</el-button>
                <el-button link type="danger" size="small" @click="reject(row)">驳回</el-button>
              </template>
              <span v-else-if="role === 'admin'" class="wait">待业务员初审</span>
            </template>
            <!-- 终审阶段：仅管理员可审 -->
            <template v-else-if="row.status === 'FIRST_APPROVED'">
              <template v-if="role === 'admin'">
                <el-button link type="success" size="small" @click="final(row)">终审通过</el-button>
                <el-button link type="danger" size="small" @click="reject(row)">驳回</el-button>
              </template>
              <span v-else class="wait">已初审，待管理员终审</span>
            </template>
            <span v-else class="done">已处理</span>
          </template>
          <template v-else-if="row.status === 'PENDING'">
            <el-button link type="primary" size="small" @click="handle(row, true)">通过</el-button>
            <el-button link type="danger" size="small" @click="handle(row, false)">驳回</el-button>
          </template>
          <span v-else class="done">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <el-dialog v-model="detailDialog" title="入驻申请资料" width="480px">
      <template v-if="detail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="公司名称">{{ payload.name }}</el-descriptions-item>
          <el-descriptions-item label="公司编码">{{ payload.code }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ payload.contact }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ payload.phone }}</el-descriptions-item>
          <el-descriptions-item label="公司介绍">{{ payload.description || '无' }}</el-descriptions-item>
        </el-descriptions>
        <p v-if="detail.reason" class="reason">审核意见：{{ detail.reason }}</p>
      </template>
    </el-dialog>

    <!-- 驳回：原因预设来自配置中心 audit-reject-reason -->
    <ReasonInputDialog
      v-model="rejectDialog" title="驳回申请" label="驳回原因"
      group="audit-reject-reason" :defaults="DEFAULT_REJECT_REASONS"
      @confirm="confirmReject"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../../store/user'
import { approveAudit, fetchAudits, firstApproveAudit, rejectAudit } from '../../../api/admin'
import ReasonInputDialog from '../../../components/ReasonInputDialog.vue'

// 审核动作完成后通知壳子刷新各 Tab 角标
const emit = defineEmits(['changed'])

const userStore = useUserStore()
const role = computed(() => userStore.user?.roleCode)

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('PENDING')
const loading = ref(false)
const detailDialog = ref(false)
const detail = ref(null)
const payload = ref({})

onMounted(load)
watch(status, () => { page.value = 1; load() })

const typeText = (t) => ({ LOGISTICS_APPLY: '物流入驻·两级' }[t] || t)
const statusText = (row) => ({
  PENDING: row.type === 'LOGISTICS_APPLY' ? '待业务员初审' : '待审核',
  FIRST_APPROVED: '待管理员终审',
  APPROVED: '已通过',
  REJECTED: '已驳回'
}[row.status] || row.status)
const statusTag = (s) => ({ PENDING: 'warning', FIRST_APPROVED: 'primary', APPROVED: 'success', REJECTED: 'danger' }[s] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchAudits({ status: status.value || undefined, page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { items.value = [] } finally { loading.value = false }
}

function promptReason(title) {
  return ElMessageBox.prompt('请输入审核备注（可留空）', title, {
    inputPlaceholder: '选填'
  })
}

/** 业务员初审 */
function first(row) {
  promptReason('初审通过').then(async ({ value }) => {
    await firstApproveAudit(row.id, value)
    ElMessage.success('初审已通过，转平台管理员终审')
    load()
    emit('changed')
  }).catch(() => {})
}

/** 管理员终审（通过即入驻） */
function final(row) {
  ElMessageBox.confirm('终审通过后该物流公司将正式入驻，确认通过？', '终审', { type: 'warning' }).then(async () => {
    await approveAudit(row.id, '')
    ElMessage.success('已终审通过，物流公司入驻成功')
    load()
    emit('changed')
  }).catch(() => {})
}

const DEFAULT_REJECT_REASONS = ['资料不完整', '资质不符合要求', '信息与实际不符', '图片或文案违规', '其他']
const rejectDialog = ref(false)
const rejectTarget = ref(null)

function reject(row) {
  rejectTarget.value = row
  rejectDialog.value = true
}

async function confirmReject(reason) {
  try {
    await rejectAudit(rejectTarget.value.id, reason)
    ElMessage.success('已驳回')
    rejectDialog.value = false
    load()
    emit('changed')
  } catch { /* 提示由拦截器统一处理 */ }
}

function handle(row, pass) {
  if (!pass) return reject(row)
  promptReason('通过审核').then(async ({ value }) => {
    await approveAudit(row.id, value)
    ElMessage.success('已通过')
    load()
    emit('changed')
  }).catch(() => {})
}

function showDetail(row) {
  detail.value = row
  try {
    payload.value = JSON.parse(row.payload || '{}')
  } catch {
    payload.value = {}
  }
  detailDialog.value = true
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
.done,
.wait {
  font-size: 12px;
  color: #bbb;
}
.reason {
  margin-top: 12px;
  color: #e6a23c;
  font-size: 13px;
}
</style>
