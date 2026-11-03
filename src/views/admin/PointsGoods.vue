<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="head">
        <div>
          <b>积分商城</b>
          <span class="tip">从商品库挑选商品上架积分商城；积分价 = 上架时原价 × 兑换倍率（运营配置 points-rule/mall-rate），兑换生成免支付真实订单。</span>
        </div>
        <el-button type="primary" @click="openPicker">添加商品</el-button>
      </div>
    </template>

    <el-table :data="items" size="small">
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div class="p-cell">
            <span class="p-img" :style="{ background: row.productColor }">{{ row.productEmoji }}</span>
            <span>{{ row.productName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="shopName" label="店铺" min-width="140" />
      <el-table-column label="原价快照" width="110">
        <template #default="{ row }">¥{{ row.productPrice }}</template>
      </el-table-column>
      <el-table-column label="积分价" width="110">
        <template #default="{ row }">
          <span class="points">{{ row.pointsPrice }} 积分</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '上架中' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170">
        <template #default="{ row }">
          <el-button v-if="row.status === 1" link type="warning" @click="toggle(row, 0)">下架</el-button>
          <el-button v-else link type="success" @click="toggle(row, 1)">上架</el-button>
          <el-button link type="danger" @click="remove(row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 从商品库挑选上架 -->
    <el-dialog v-model="picker.visible" title="从商品库挑选商品" width="720px">
      <div class="picker-bar">
        <el-input v-model="picker.keyword" placeholder="搜索商品名称" clearable @keyup.enter="loadProducts" />
        <el-button type="primary" @click="loadProducts">搜索</el-button>
      </div>
      <el-table :data="picker.rows" size="small" v-loading="picker.loading" max-height="420">
        <el-table-column label="商品" min-width="240">
          <template #default="{ row }">
            <div class="p-cell">
              <span class="p-img" :style="{ background: row.color }">{{ row.emoji }}</span>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="shopName" label="店铺" min-width="130" />
        <el-table-column label="售价" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              link type="primary"
              :disabled="row.status !== 1 || pickedIds.has(row.id)"
              @click="add(row)"
            >{{ pickedIds.has(row.id) ? '已上架' : row.status !== 1 ? '已下架' : '上架' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="picker.page"
        :page-size="picker.size"
        :total="picker.total"
        layout="total, prev, pager, next"
        style="margin-top: 12px"
        @current-change="loadProducts"
      />
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminProducts, createPointsMallItem, deletePointsMallItem, fetchPointsMallAdminItems, setPointsMallItemStatus } from '../../api/admin'

const items = ref([])
const loading = ref(false)

const picker = reactive({ visible: false, keyword: '', rows: [], total: 0, page: 1, size: 10, loading: false })

// 已上架商品 id 集合，挑选弹窗里置灰防重复
const pickedIds = computed(() => new Set(items.value.map((i) => i.productId)))

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchPointsMallAdminItems()
    items.value = res.data || []
  } catch { items.value = [] } finally { loading.value = false }
}

function openPicker() {
  picker.visible = true
  picker.page = 1
  loadProducts()
}

async function loadProducts() {
  picker.loading = true
  try {
    // 只挑在售商品：下架商品兑换时会下单失败
    const res = await fetchAdminProducts({
      includeAll: true,
      keyword: picker.keyword || undefined,
      status: 1,
      page: picker.page,
      size: picker.size
    })
    picker.rows = res.data?.list || []
    picker.total = res.data?.total || 0
  } catch { picker.rows = [] } finally { picker.loading = false }
}

async function add(row) {
  await createPointsMallItem(row.id)
  ElMessage.success(`「${row.name}」已上架积分商城`)
  await load()
}

async function toggle(row, status) {
  await setPointsMallItemStatus(row.id, status)
  ElMessage.success(status === 1 ? '已上架' : '已下架')
  await load()
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定从积分商城移除「${row.productName}」？历史兑换记录不受影响。`, '提示', { type: 'warning' })
  } catch { return }
  await deletePointsMallItem(row.id)
  ElMessage.success('已移除')
  await load()
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.tip {
  color: #999;
  font-size: 13px;
  font-weight: 400;
  margin-left: 8px;
}
.p-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.p-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.points {
  color: #ff4b2b;
  font-weight: 600;
}
.picker-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
