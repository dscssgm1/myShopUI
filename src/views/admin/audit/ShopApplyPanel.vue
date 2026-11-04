<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="applyStatus" size="small" @change="searchApplies">
        <el-radio-button value="PENDING">待审核</el-radio-button>
        <el-radio-button value="APPROVED">已通过</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="">全部</el-radio-button>
      </el-radio-group>
      <el-input v-model="applyKeyword" placeholder="店铺 / 联系人 / 申请人" size="small" clearable style="width: 200px" @keyup.enter="searchApplies" @clear="searchApplies" />
      <el-button type="primary" size="small" @click="searchApplies">查询</el-button>
    </div>

    <el-table :data="applyRows" size="small" v-loading="applyLoading">
      <el-table-column label="申请人" width="130">
        <template #default="{ row }">
          <div>{{ row.nickname || row.username }}</div>
          <div class="sub">@{{ row.username }}</div>
        </template>
      </el-table-column>
      <el-table-column label="店铺名称" min-width="150">
        <template #default="{ row }">
          <div>{{ row.shopName }}</div>
          <div class="tags">
            <el-tag v-for="c in row.categories || []" :key="c" size="small" style="margin: 2px 4px 0 0">{{ c }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="联系方式" width="150">
        <template #default="{ row }">
          <div>{{ row.contact }}</div>
          <div class="sub">{{ row.phone }}</div>
        </template>
      </el-table-column>
      <el-table-column label="区域 / 地址" min-width="180">
        <template #default="{ row }">
          <div>{{ row.region || '-' }}</div>
          <div class="sub">{{ row.address || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="applyStatusMeta(row.status).tag">{{ applyStatusMeta(row.status).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="viewApply(row)">资料</el-button>
          <template v-if="row.status === 'PENDING'">
            <el-button v-perm="'admin:audit:shopApply'" link type="success" size="small" @click="approve(row)">通过</el-button>
            <el-button v-perm="'admin:audit:shopApply'" link type="danger" size="small" @click="reject(row)">驳回</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="applyTotal > applySize" v-model:current-page="applyPage" :page-size="applySize" :total="applyTotal"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="loadApplies"
    />

    <!-- 入驻申请资料 -->
    <el-dialog v-model="applyDialog" title="入驻申请资料" width="560px">
      <template v-if="currentApply">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="申请人">
            {{ currentApply.nickname || currentApply.username }}
            <span class="sub">（@{{ currentApply.username }}<template v-if="currentApply.email"> · {{ currentApply.email }}</template>）</span>
          </el-descriptions-item>
          <el-descriptions-item label="店铺名称">{{ currentApply.shopName }}</el-descriptions-item>
          <el-descriptions-item label="经营类目">
            <el-tag v-for="c in currentApply.categories || []" :key="c" size="small" style="margin-right: 4px">{{ c }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentApply.contact }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentApply.phone }}</el-descriptions-item>
          <el-descriptions-item label="所在区域">{{ currentApply.region || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺地址">{{ currentApply.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺介绍">{{ currentApply.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="法定代表人">{{ currentApply.legalPerson || '-' }}</el-descriptions-item>
          <el-descriptions-item label="许可证号">{{ currentApply.licenseNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="营业期限">{{ currentApply.businessTerm || '-' }}</el-descriptions-item>
          <el-descriptions-item label="注册地址">{{ currentApply.registeredAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经营范围">{{ currentApply.businessScope || '-' }}</el-descriptions-item>
          <el-descriptions-item label="许可证照片">
            <el-image
              v-if="currentApply.licenseImage"
              :src="currentApply.licenseImage"
              :preview-src-list="[currentApply.licenseImage]"
              preview-teleported fit="cover"
              style="width: 120px; height: 90px; border-radius: 6px"
            />
            <span v-else>未上传</span>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(currentApply.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag size="small" :type="applyStatusMeta(currentApply.status).tag">{{ applyStatusMeta(currentApply.status).label }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核意见">{{ currentApply.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ formatTime(currentApply.auditedAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="applyDialog = false">关闭</el-button>
        <template v-if="currentApply?.status === 'PENDING'">
          <el-button v-perm="'admin:audit:shopApply'" type="danger" @click="reject(currentApply)">驳回</el-button>
          <el-button v-perm="'admin:audit:shopApply'" type="success" @click="approve(currentApply)">审核通过</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 入驻驳回：原因预设来自配置中心 audit-reject-reason -->
    <ReasonInputDialog
      v-model="rejectDialog" title="驳回入驻申请" label="驳回原因"
      group="audit-reject-reason" :defaults="DEFAULT_REJECT_REASONS"
      @confirm="confirmReject"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveShopApply, fetchShopApplies, rejectShopApply } from '../../../api/admin'
import ReasonInputDialog from '../../../components/ReasonInputDialog.vue'

const DEFAULT_REJECT_REASONS = ['资料不完整', '资质不符合要求', '信息与实际不符', '图片或文案违规', '其他']

// 审核动作完成后通知壳子刷新各 Tab 角标
const emit = defineEmits(['changed'])

const applyRows = ref([])
const applyTotal = ref(0)
const applyPage = ref(1)
const applySize = 10
const applyStatus = ref('PENDING')
const applyKeyword = ref('')
const applyLoading = ref(false)

const applyDialog = ref(false)
const currentApply = ref(null)
const rejectDialog = ref(false)

onMounted(loadApplies)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-')

function applyStatusMeta(status) {
  return {
    PENDING: { label: '待审核', tag: 'warning' },
    APPROVED: { label: '已通过', tag: 'success' },
    REJECTED: { label: '已驳回', tag: 'danger' }
  }[status] || { label: status || '-', tag: 'info' }
}

function searchApplies() {
  applyPage.value = 1
  loadApplies()
}

async function loadApplies() {
  applyLoading.value = true
  try {
    const res = await fetchShopApplies({
      status: applyStatus.value || undefined,
      keyword: applyKeyword.value || undefined,
      page: applyPage.value,
      size: applySize
    })
    applyRows.value = res.data?.list || []
    applyTotal.value = res.data?.total || 0
  } catch {
    applyRows.value = []
  } finally {
    applyLoading.value = false
  }
}

function viewApply(row) {
  currentApply.value = row
  applyDialog.value = true
}

async function approve(row) {
  try {
    await ElMessageBox.confirm(
      `审核通过后将自动创建店铺「${row.shopName}」，并把申请人 ${row.nickname || row.username} 升级为商家。确认通过？`,
      '审核通过',
      { type: 'warning', confirmButtonText: '通过', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await approveShopApply(row.id, '')
    ElMessage.success('已通过，店铺已创建，申请人需重新登录')
    applyDialog.value = false
    loadApplies()
    emit('changed')
  } catch { /* 错误提示由拦截器处理 */ }
}

function reject(row) {
  // 列表行直接驳回时也先落位目标申请，弹窗内驳回则已是当前申请
  if (row) currentApply.value = row
  rejectDialog.value = true
}

async function confirmReject(reason) {
  try {
    await rejectShopApply(currentApply.value.id, reason)
    ElMessage.success('已驳回')
    rejectDialog.value = false
    applyDialog.value = false
    loadApplies()
    emit('changed')
  } catch { /* 错误提示由拦截器处理 */ }
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
.sub {
  font-size: 12px;
  color: #999;
}
.tags {
  margin-top: 2px;
}
</style>
