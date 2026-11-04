<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>商品管理</b>
        <div class="filters">
          <el-input v-model="keyword" placeholder="商品 / 店铺名称" size="small" clearable style="width: 200px" @keyup.enter="search" @clear="search" />
          <el-select v-model="status" size="small" style="width: 120px" @change="search">
            <el-option label="全部状态" :value="null" />
            <el-option label="已上架" :value="1" />
            <el-option label="已下架" :value="0" />
          </el-select>
          <el-button type="primary" size="small" @click="search">查询</el-button>
        </div>
      </div>
    </template>

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
      <el-table-column prop="sales" label="销量" width="90" />
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
          <el-button v-if="row.auditStatus === 'APPROVED'" v-perm="'admin:products:status'" link :type="row.status === 1 ? 'warning' : 'success'" size="small" @click="row.status === 1 ? off(row) : on(row)">
            {{ row.status === 1 ? '下架' : '上架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <!-- 下架：原因预设来自配置中心 off-shelf-reason -->
    <ReasonInputDialog
      v-model="offDialog" title="下架商品" label="下架原因"
      group="off-shelf-reason" :defaults="DEFAULT_OFF_SHELF_REASONS"
      @confirm="confirmOff"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminProducts, offSaleProduct, onSaleProduct } from '../../api/admin'
import ReasonInputDialog from '../../components/ReasonInputDialog.vue'

const DEFAULT_OFF_SHELF_REASONS = ['库存不足', '商品信息待完善', '换季/清仓临时下架', '违规整改', '其他']

const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const keyword = ref('')
const status = ref(null)
const loading = ref(false)

onMounted(load)

// 审核状态仅作展示；审核操作在「商品审核」页处理
const auditText = (s) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }[s] || s)
const auditTagType = (s) => ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }[s] || 'info')

function search() {
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminProducts({
      includeAll: true,
      keyword: keyword.value || undefined,
      status: status.value === null ? undefined : status.value,
      page: page.value,
      size
    })
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { rows.value = [] } finally { loading.value = false }
}

function on(row) {
  ElMessageBox.confirm(`确认上架「${row.name}」？`, '上架', { type: 'info' }).then(async () => {
    await onSaleProduct(row.id)
    ElMessage.success('已上架')
    load()
  }).catch(() => {})
}

const offDialog = ref(false)
const offTarget = ref(null)

function off(row) {
  offTarget.value = row
  offDialog.value = true
}

async function confirmOff(reason) {
  try {
    await offSaleProduct(offTarget.value.id, reason)
    ElMessage.success('已下架')
    offDialog.value = false
    load()
  } catch { /* ignore */ }
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
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
