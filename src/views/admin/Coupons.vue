<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>平台优惠券</b>
        <span class="tip">平台券优惠全额由平台承担；商家券在商家端「店铺营销」发放</span>
        <el-button v-perm="'admin:coupons:create'" type="primary" size="small" @click="openAdd">+ 发放优惠券</el-button>
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
      <el-table-column label="积分价" width="90">
        <template #default="{ row }">
          <span v-if="Number(row.pointsPrice) > 0" class="points">{{ row.pointsPrice }} 积分</span>
          <span v-else class="sub">免费领取</span>
        </template>
      </el-table-column>
      <el-table-column label="叠加规则" width="150">
        <template #default="{ row }">
          <template v-if="row.couponStackable === false || row.stackable === false">
            <el-tag v-if="row.couponStackable === false" size="small" type="warning" class="mr6">不可与活动同用</el-tag>
            <el-tag v-if="row.stackable === false" size="small" type="warning">不可叠加</el-tag>
          </template>
          <span v-else class="sub">可与活动、多券同用</span>
        </template>
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
          <el-button v-if="row.status === 'ACTIVE' && row.shopId === 0" v-perm="'admin:coupons:end'" link type="danger" size="small" @click="end(row)">
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
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scopeType === 'CATEGORY'" label="选择分类">
          <el-select v-model="form.scopeIds" multiple filterable placeholder="选择适用分类（大类）" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发放总量" required>
          <el-input-number v-model="form.totalStock" :min="1" /> 张
        </el-form-item>
        <el-form-item label="每人限领" required>
          <el-input-number v-model="form.perUserLimit" :min="1" /> 张
        </el-form-item>
        <el-form-item label="积分价">
          <el-input-number v-model="form.pointsPrice" :min="0" :step="100" />
          积分
          <div class="tip-block">填 0 为免费领取的普通券；大于 0 则不上领券中心，只在积分商城用积分兑换</div>
        </el-form-item>
        <el-form-item label="与活动同用">
          <el-switch v-model="form.couponStackable" />
          <span class="tip-inline">关闭后此券不能与任何促销活动叠加</span>
        </el-form-item>
        <el-form-item label="与其他券叠加">
          <el-switch v-model="form.stackable" />
          <span class="tip-inline">关闭后此券一单只能单独使用</span>
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
import { categoryNames, loadTopCategories } from '../../utils/categoryOptions'

const rows = ref([])
const loading = ref(false)
const dialog = ref(false)
const categoryOptions = ref([])
const form = reactive({
  title: '', thresholdAmount: 0, discountAmount: 10,
  scopeType: 'ALL', scopeIds: [],
  totalStock: 100, perUserLimit: 1, pointsPrice: 0, couponStackable: true, stackable: true,
  validStart: '', validEnd: ''
})

onMounted(() => {
  load()
  loadTopCategories().then((list) => (categoryOptions.value = list))
})

const shortTime = (t) => (t ? String(t).replace('T', ' ').slice(5, 16) : '不限')

function scopeText(row) {
  if (row.scopeType === 'CATEGORY') return `指定分类：${categoryNames(row.scopeIds, categoryOptions.value).join('、')}`
  return { ALL: '全品类', SHOP: '本店商品', PRODUCT: '指定商品' }[row.scopeType] || row.scopeType
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
    scopeType: 'ALL', scopeIds: [],
    totalStock: 100, perUserLimit: 1, pointsPrice: 0, couponStackable: true, stackable: true,
    validStart: '', validEnd: ''
  })
  dialog.value = true
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写券名称')
    return
  }
  if (form.scopeType === 'CATEGORY' && !form.scopeIds.length) {
    ElMessage.warning('请选择适用分类')
    return
  }
  await createCouponTemplate({
    title: form.title,
    thresholdAmount: form.thresholdAmount,
    discountAmount: form.discountAmount,
    scopeType: form.scopeType,
    scopeIds: form.scopeType === 'CATEGORY' ? form.scopeIds : [],
    totalStock: form.totalStock,
    perUserLimit: form.perUserLimit,
    pointsPrice: form.pointsPrice > 0 ? form.pointsPrice : null,
    couponStackable: form.couponStackable,
    stackable: form.stackable,
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
.tip-inline {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}
.tip-block {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}
.points {
  color: #ff4b2b;
  font-weight: 600;
}
.mr6 {
  margin-right: 6px;
}
</style>
