<template>
  <el-card shadow="never">
    <template #header>
      <div class="head"><b>商家管理</b></div>
    </template>

    <!-- 入驻审核已并入「审核中心」 -->
    <div class="filters">
      <el-input v-model="keyword" placeholder="店铺名 / 联系人" size="small" clearable style="width: 200px" @keyup.enter="searchShops" @clear="searchShops" />
      <el-select v-model="status" size="small" style="width: 120px" @change="searchShops">
        <el-option label="全部状态" :value="null" />
        <el-option label="营业中" :value="1" />
        <el-option label="已停用" :value="0" />
      </el-select>
      <el-button type="primary" size="small" @click="searchShops">查询</el-button>
    </div>

    <el-table :data="shops" size="small" v-loading="shopLoading">
      <el-table-column label="店铺" min-width="180">
        <template #default="{ row }">
          <img
            v-if="isIconUrl(row.icon)" :src="row.icon" alt=""
            style="width: 22px; height: 22px; border-radius: 6px; object-fit: cover; margin-right: 6px; vertical-align: -6px"
          />
          <span v-else style="margin-right: 6px">{{ row.icon || '🏪' }}</span>{{ row.name }}
        </template>
      </el-table-column>
      <el-table-column label="经营类目" min-width="160">
        <template #default="{ row }">
          <el-tag v-for="c in parseCategories(row.categories)" :key="c" size="small" style="margin-right: 4px">{{ c }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="联系人" width="150">
        <template #default="{ row }">{{ row.contact }}（{{ row.phone }}）</template>
      </el-table-column>
      <el-table-column prop="region" label="所在区域" width="140" />
      <el-table-column label="累计销量" width="90">
        <template #default="{ row }">{{ row.sales }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '营业中' : '已停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="入驻时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="viewShop(row)">详情</el-button>
          <el-button v-perm="'admin:shops:status'" link :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggleShop(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="shopTotal > shopSize" v-model:current-page="shopPage" :page-size="shopSize" :total="shopTotal"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="loadShops"
    />

    <!-- 店铺详情 -->
    <el-drawer v-model="shopDrawer" title="店铺详情" size="420px">
      <template v-if="currentShop">
        <div class="shop-brief">
          <img
            v-if="isIconUrl(currentShop.icon)" :src="currentShop.icon" alt="" class="shop-icon-img"
          />
          <span v-else class="shop-icon">{{ currentShop.icon || '🏪' }}</span>
          <div>
            <div class="shop-name">{{ currentShop.name }}</div>
            <el-tag size="small" :type="currentShop.status === 1 ? 'success' : 'danger'">
              {{ currentShop.status === 1 ? '营业中' : '已停用' }}
            </el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="经营类目">
            <el-tag v-for="c in parseCategories(currentShop.categories)" :key="c" size="small" style="margin-right: 4px">{{ c }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentShop.contact || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentShop.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所在区域">{{ currentShop.region || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺地址">{{ currentShop.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="法定代表人">{{ currentShop.legalPerson || '-' }}</el-descriptions-item>
          <el-descriptions-item label="许可证号">{{ currentShop.licenseNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="营业期限">{{ currentShop.businessTerm || '-' }}</el-descriptions-item>
          <el-descriptions-item label="注册地址">{{ currentShop.registeredAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经营范围">{{ currentShop.businessScope || '-' }}</el-descriptions-item>
          <el-descriptions-item label="许可证照片">
            <el-image
              v-if="currentShop.licenseImage"
              :src="currentShop.licenseImage"
              :preview-src-list="[currentShop.licenseImage]"
              preview-teleported fit="cover"
              style="width: 120px; height: 90px; border-radius: 6px"
            />
            <span v-else>未上传</span>
          </el-descriptions-item>
          <el-descriptions-item label="累计销量">{{ currentShop.sales ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="店铺评分">{{ currentShop.rating ?? '暂无评分' }}</el-descriptions-item>
          <el-descriptions-item label="店铺介绍">{{ currentShop.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态说明">{{ currentShop.statusReason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入驻时间">{{ formatTime(currentShop.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-actions">
          <el-button v-perm="'admin:shops:status'" :type="currentShop.status === 1 ? 'danger' : 'success'" @click="toggleShop(currentShop)">
            {{ currentShop.status === 1 ? '停用店铺' : '启用店铺' }}
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 停用店铺：原因预设来自配置中心 shop-disable-reason -->
    <ReasonInputDialog
      v-model="disableDialog" title="停用店铺" label="停用原因"
      group="shop-disable-reason" :defaults="DEFAULT_DISABLE_REASONS"
      @confirm="confirmDisable"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminShops, updateShopStatus } from '../../api/admin'
import ReasonInputDialog from '../../components/ReasonInputDialog.vue'

const DEFAULT_DISABLE_REASONS = ['售假/发布违禁商品', '服务质量差、投诉集中', '违规经营', '长时间未经营', '其他']

// ---------------- 店铺列表 ----------------
const shops = ref([])
const shopTotal = ref(0)
const shopPage = ref(1)
const shopSize = 10
const keyword = ref('')
const status = ref(null)
const shopLoading = ref(false)

// ---------------- 弹层 ----------------
const shopDrawer = ref(false)
const currentShop = ref(null)

onMounted(loadShops)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-')

// 店铺标识：图片 URL 直接展示，旧 emoji 数据回退为文字
const isIconUrl = (v) => /^https?:\/\/|^\//.test(v || '')

function parseCategories(json) {
  try {
    const list = JSON.parse(json || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function searchShops() {
  shopPage.value = 1
  loadShops()
}

async function loadShops() {
  shopLoading.value = true
  try {
    const res = await fetchAdminShops({
      keyword: keyword.value || undefined,
      status: status.value === null ? undefined : status.value,
      page: shopPage.value,
      size: shopSize
    })
    shops.value = res.data?.list || []
    shopTotal.value = res.data?.total || 0
  } catch {
    shops.value = []
  } finally {
    shopLoading.value = false
  }
}

function viewShop(row) {
  currentShop.value = row
  shopDrawer.value = true
}

async function toggleShop(row) {
  const target = row.status === 1 ? 0 : 1
  if (target === 0) {
    // 停用：原因必填，走配置中心预设快选
    disableTarget.value = row
    disableDialog.value = true
    return
  }
  let reason = ''
  try {
    const result = await ElMessageBox.prompt(
      `确认启用店铺「${row.name}」？可填写备注：`,
      '启用店铺',
      { type: 'warning', inputType: 'textarea', inputPlaceholder: '备注（选填）' }
    )
    reason = result.value || ''
  } catch {
    return
  }

  await updateShopStatus(row.id, target, reason || undefined)
  ElMessage.success('已启用')
  shopDrawer.value = false
  loadShops()
}

const disableDialog = ref(false)
const disableTarget = ref(null)

async function confirmDisable(reason) {
  try {
    await updateShopStatus(disableTarget.value.id, 0, reason)
    ElMessage.success('已停用')
    disableDialog.value = false
    shopDrawer.value = false
    loadShops()
  } catch { /* 错误提示由拦截器处理 */ }
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
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.shop-brief {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.shop-icon {
  font-size: 40px;
}
.shop-icon-img {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}
.shop-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.drawer-actions {
  margin-top: 16px;
  text-align: right;
}
</style>
