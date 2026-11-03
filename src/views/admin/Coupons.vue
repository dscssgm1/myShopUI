<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>平台优惠券</b>
        <span class="tip">平台券优惠全额由平台承担；商家券在商家端「店铺营销」发放</span>
        <el-button type="primary" size="small" @click="openAdd">+ 发放优惠券</el-button>
      </div>
    </template>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column label="优惠券" min-width="200">
        <template #default="{ row }">
          <b>{{ row.title }}</b>
          <div class="sub">{{ row.shopId > 0 ? `商家券 · ${row.shopName}` : '平台券' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="面额" width="110">
        <template #default="{ row }">满 {{ row.thresholdAmount }} 减 {{ row.discountAmount }}</template>
      </el-table-column>
      <el-table-column label="适用范围" width="120">
        <template #default="{ row }">{{ scopeText(row) }}</template>
      </el-table-column>
      <el-table-column label="库存" width="110">
        <template #default="{ row }">已领 {{ row.claimedCount }} / {{ row.totalStock }}</template>
      </el-table-column>
      <el-table-column label="每人限领" width="90">
        <template #default="{ row }">{{ row.perUserLimit }} 张</template>
      </el-table-column>
      <el-table-column label="有效期" width="210">
        <template #default="{ row }">{{ shortTime(row.validStart) }} ~ {{ shortTime(row.validEnd) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">
            {{ row.status === 'ACTIVE' ? '发放中' : '已结束' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'ACTIVE' && row.shopId === 0" link type="danger" size="small" @click="end(row)">
            下架
          </el-button>
          <span v-else class="sub">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" title="发放优惠券" width="560px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="券名称" required>
          <el-input v-model="form.title" placeholder="如：双 11 全品类立减券" />
        </el-form-item>
        <el-form-item label="使用门槛" required>
          <el-input-number v-model="form.thresholdAmount" :min="0" :precision="2" /> 元（0 表示无门槛）
        </el-form-item>
        <el-form-item label="优惠金额" required>
          <el-input-number v-model="form.discountAmount" :min="0.01" :precision="2" /> 元
        </el-form-item>
        <el-form-item label="适用范围">
          <el-radio-group v-model="form.scopeType">
            <el-radio-button value="ALL">全品类</el-radio-button>
            <el-radio-button value="CATEGORY">指定分类</el-radio-button>
            <el-radio-button value="PRODUCT">指定商品</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scopeType !== 'ALL'" label="范围 ID">
          <el-input v-model="form.scopeIdsText" placeholder="多个 ID 用英文逗号分隔，如：1,2,3" />
        </el-form-item>
        <el-form-item label="发放总量" required>
          <el-input-number v-model="form.totalStock" :min="1" /> 张
        </el-form-item>
        <el-form-item label="每人限领" required>
          <el-input-number v-model="form.perUserLimit" :min="1" /> 张
        </el-form-item>
        <el-form-item label="可领时间">
          <el-date-picker v-model="form.validStart" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="form.validEnd" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">发放</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createCouponTemplate, endCouponTemplate, fetchAdminCouponTemplates } from '../../api/admin'

const rows = ref([])
const loading = ref(false)
const dialog = ref(false)
const form = reactive({
  title: '', thresholdAmount: 0, discountAmount: 10,
  scopeType: 'ALL', scopeIdsText: '',
  totalStock: 100, perUserLimit: 1, validStart: '', validEnd: ''
})

onMounted(load)

const shortTime = (t) => (t ? String(t).replace('T', ' ').slice(5, 16) : '不限')

function scopeText(row) {
  const label = { ALL: '全品类', CATEGORY: '指定分类', PRODUCT: '指定商品', SHOP: '本店商品' }[row.scopeType] || row.scopeType
  return row.scopeType === 'ALL' || row.scopeType === 'SHOP' ? label
    : `${label} #${(row.scopeIds || []).join(', #')}`
}

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminCouponTemplates()
    rows.value = res.data || []
  } catch { rows.value = [] } finally { loading.value = false }
}

function openAdd() {
  Object.assign(form, {
    title: '', thresholdAmount: 0, discountAmount: 10,
    scopeType: 'ALL', scopeIdsText: '',
    totalStock: 100, perUserLimit: 1, validStart: '', validEnd: ''
  })
  dialog.value = true
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写券名称')
    return
  }
  await createCouponTemplate({
    title: form.title,
    thresholdAmount: form.thresholdAmount,
    discountAmount: form.discountAmount,
    scopeType: form.scopeType,
    scopeIds: form.scopeIdsText
      ? form.scopeIdsText.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
      : [],
    totalStock: form.totalStock,
    perUserLimit: form.perUserLimit,
    validStart: form.validStart || null,
    validEnd: form.validEnd || null,
    status: 'ACTIVE'
  })
  dialog.value = false
  ElMessage.success('已发放')
  load()
}

function end(row) {
  ElMessageBox.confirm(`确认下架优惠券「${row.title}」？已领取的仍可在有效期内使用。`, '提示', { type: 'warning' })
    .then(async () => {
      await endCouponTemplate(row.id)
      ElMessage.success('已下架')
      load()
    }).catch(() => {})
}
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head .tip {
  flex: 1;
  font-size: 12px;
  color: #999;
}
.sub {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
