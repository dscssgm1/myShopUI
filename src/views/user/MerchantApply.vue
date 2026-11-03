<template>
  <div class="page-card" v-loading="loading">
    <div class="head">
      <div>
        <el-button link @click="$router.push('/user/more')">← 返回更多功能</el-button>
        <h3>🏪 商家入驻</h3>
      </div>
      <el-tag v-if="alreadyMerchant" type="success">已入驻</el-tag>
    </div>

    <!-- 已是商家 -->
    <el-alert v-if="alreadyMerchant" type="success" :closable="false" show-icon style="margin-bottom: 16px">
      <template #title>您已经是平台商家</template>
      店铺已创建，可直接进入商家中心管理商品与订单。
      <el-button size="small" type="success" style="margin-left: 8px" @click="$router.push('/merchant/orders')">进入商家中心</el-button>
    </el-alert>

    <!-- 当前申请状态 -->
    <el-alert
      v-else-if="latest"
      :type="statusMeta(latest.status).alert"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        最近一次申请：{{ statusMeta(latest.status).label }}
        <span v-if="latest.createdAt" class="alert-time">（提交于 {{ formatTime(latest.createdAt) }}）</span>
      </template>
      <template v-if="latest.status === 'PENDING'">资料已提交，平台将在 1-3 个工作日内完成审核，请耐心等待。</template>
      <template v-else-if="latest.status === 'APPROVED'">
        审核已通过，店铺「{{ latest.shopName }}」已创建。请重新登录后进入「商家中心」。
        <el-button size="small" type="success" style="margin-left: 8px" @click="relogin">退出并重新登录</el-button>
      </template>
      <template v-else-if="latest.status === 'REJECTED'">
        驳回原因：{{ latest.reason || '未填写' }}。修改资料后可重新提交申请。
      </template>
    </el-alert>

    <el-alert v-else type="info" :closable="false" show-icon style="margin-bottom: 16px">
      <template #title>开店流程</template>
      填写店铺资料 → 平台审核 → 审核通过后账号升级为商家，重新登录即可进入商家中心。
    </el-alert>

    <!-- 入驻表单 -->
    <template v-if="canApply">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="apply-form">
        <el-form-item label="店铺名称" prop="shopName">
          <el-input v-model="form.shopName" maxlength="30" show-word-limit placeholder="如：星野数码旗舰店" />
        </el-form-item>
        <el-form-item label="经营类目" prop="categories">
          <el-select v-model="form.categories" multiple placeholder="请选择经营类目" style="width: 100%">
            <el-option v-for="c in categories" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" maxlength="20" placeholder="店铺负责人姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" maxlength="11" placeholder="11 位手机号" />
        </el-form-item>
        <el-form-item label="所在区域" prop="region">
          <el-select v-model="form.region" placeholder="请选择所在区域" style="width: 100%">
            <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="店铺地址" prop="address">
          <el-input v-model="form.address" maxlength="100" show-word-limit placeholder="详细地址，用于快递揽收" />
        </el-form-item>
        <el-form-item label="店铺介绍" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="简单介绍店铺经营内容、优势等（选填）"
          />
        </el-form-item>

        <el-divider content-position="left">工商资质信息</el-divider>
        <el-alert
          type="info" :closable="false" show-icon style="margin-bottom: 14px"
          title="资质将随店铺对外公示，请确保与证照原件一致；平台审核通过后即可开店"
        />
        <el-form-item label="法定代表人" prop="legalPerson">
          <el-input v-model="form.legalPerson" maxlength="20" placeholder="营业执照上的法定代表人姓名" />
        </el-form-item>
        <el-form-item label="许可证号" prop="licenseNo">
          <el-input v-model="form.licenseNo" maxlength="30" placeholder="统一社会信用代码或经营许可证号" />
        </el-form-item>
        <el-form-item label="营业期限" prop="businessTerm">
          <el-date-picker
            v-model="businessTermRange"
            type="daterange" range-separator="至"
            start-placeholder="开始日期" end-placeholder="结束日期"
            value-format="YYYY-MM-DD" style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="注册地址" prop="registeredAddress">
          <el-input v-model="form.registeredAddress" maxlength="100" show-word-limit placeholder="营业执照上的注册地址" />
        </el-form-item>
        <el-form-item label="经营范围" prop="businessScope">
          <el-input
            v-model="form.businessScope"
            type="textarea" :rows="2" maxlength="100" show-word-limit
            placeholder="与证照记载的经营范围一致"
          />
        </el-form-item>
        <el-form-item label="许可证照片" prop="licenseImage">
          <ImageUpload v-model="licenseImageList" :limit="1" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">提交入驻申请</el-button>
        </el-form-item>
      </el-form>
    </template>

    <el-alert v-else-if="!alreadyMerchant" type="warning" :closable="false" show-icon>
      <template #title>当前不可提交新申请</template>
      {{ latest?.status === 'PENDING' ? '已有申请正在审核中，请等待审核结果。' : '您的入驻申请已通过，无需重复申请。' }}
    </el-alert>

    <!-- 申请记录 -->
    <template v-if="applies.length">
      <el-divider content-position="left">我的申请记录</el-divider>
      <el-table :data="applies" size="small">
        <el-table-column prop="shopName" label="店铺名称" min-width="140" />
        <el-table-column label="经营类目" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="c in row.categories || []" :key="c" size="small" style="margin-right: 4px">{{ c }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="150">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusMeta(row.status).tag">{{ statusMeta(row.status).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="180">
          <template #default="{ row }">{{ row.reason || '-' }}</template>
        </el-table-column>
        <el-table-column label="审核时间" width="150">
          <template #default="{ row }">{{ formatTime(row.auditedAt) }}</template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ImageUpload from '../../components/ImageUpload.vue'
import { fetchMyMerchantApplies, submitMerchantApply } from '../../api/merchant'
import { fetchCategoryTree } from '../../api/product'
import { useUserStore } from '../../store/user'

const REGIONS = [
  '北京市 · 海淀区', '北京市 · 朝阳区', '上海市 · 浦东新区', '广州市 · 天河区',
  '深圳市 · 南山区', '杭州市 · 西湖区', '成都市 · 武侯区'
]

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const applies = ref([])
const categories = ref([])

const formRef = ref()
const form = reactive({
  shopName: '',
  categories: [],
  contact: '',
  phone: '',
  region: '',
  address: '',
  description: '',
  legalPerson: '',
  licenseNo: '',
  businessTerm: '',
  registeredAddress: '',
  businessScope: '',
  licenseImage: ''
})

// 许可证照片单图上传
const licenseImageList = computed({
  get: () => (form.licenseImage ? [form.licenseImage] : []),
  set: (list) => { form.licenseImage = list[0] || '' }
})

// 营业期限：日期区间选择，存储为「开始 至 结束」字符串
const businessTermRange = computed({
  get: () => {
    const parts = (form.businessTerm || '').split(' 至 ')
    return parts.length === 2 && parts[0] && parts[1] ? parts : null
  },
  set: (range) => { form.businessTerm = range?.length === 2 ? `${range[0]} 至 ${range[1]}` : '' }
})

const rules = {
  shopName: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
  categories: [{ type: 'array', required: true, min: 1, message: '请至少选择一个经营类目', trigger: 'change' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号需为 11 位', trigger: 'blur' }
  ],
  region: [{ required: true, message: '请选择所在区域', trigger: 'change' }],
  address: [{ required: true, message: '请填写店铺地址', trigger: 'blur' }],
  legalPerson: [{ required: true, message: '请输入法定代表人姓名', trigger: 'blur' }],
  licenseNo: [{ required: true, message: '请输入经营许可证号', trigger: 'blur' }],
  businessTerm: [{ required: true, message: '请选择营业期限', trigger: 'change' }],
  registeredAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  businessScope: [{ required: true, message: '请输入经营范围', trigger: 'blur' }],
  licenseImage: [{ required: true, message: '请上传经营许可证照片', trigger: 'change' }]
}

const alreadyMerchant = computed(() => userStore.user?.groupCode === 'MERCHANT')
const latest = computed(() => applies.value[0] || null)
const canApply = computed(() => {
  if (alreadyMerchant.value) return false
  const status = latest.value?.status
  return status !== 'PENDING' && status !== 'APPROVED'
})

function statusMeta(status) {
  return {
    PENDING: { label: '待审核', tag: 'warning', alert: 'warning' },
    APPROVED: { label: '已通过', tag: 'success', alert: 'success' },
    REJECTED: { label: '已驳回', tag: 'danger', alert: 'error' }
  }[status] || { label: status || '-', tag: 'info', alert: 'info' }
}

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-')

onMounted(load)

async function load() {
  loading.value = true
  try {
    await Promise.all([loadApplies(), loadCategories()])
    if (latest.value?.status === 'REJECTED') {
      // 驳回后允许修改上一次填写的内容，减少重复录入
      const last = latest.value
      form.shopName = last.shopName || ''
      form.categories = last.categories || []
      form.contact = last.contact || ''
      form.phone = last.phone || ''
      form.region = last.region || ''
      form.address = last.address || ''
      form.description = last.description || ''
      form.legalPerson = last.legalPerson || ''
      form.licenseNo = last.licenseNo || ''
      form.businessTerm = last.businessTerm || ''
      form.registeredAddress = last.registeredAddress || ''
      form.businessScope = last.businessScope || ''
      form.licenseImage = last.licenseImage || ''
    }
  } finally {
    loading.value = false
  }
}

async function loadApplies() {
  try {
    const res = await fetchMyMerchantApplies()
    applies.value = res.data || []
  } catch {
    applies.value = []
  }
}

async function loadCategories() {
  try {
    const res = await fetchCategoryTree()
    categories.value = (res.data || []).map((c) => ({ name: c.name }))
  } catch {
    categories.value = []
  }
}

// 审核通过后 JWT 里仍是旧角色，需重新登录才能进入商家中心
async function relogin() {
  await userStore.logout()
  router.push({ path: '/login', query: { redirect: '/merchant/orders' } })
}

function submit() {
  formRef.value.validate(async (ok) => {
    if (!ok) return
    submitting.value = true
    try {
      await submitMerchantApply({ ...form })
      ElMessage.success('入驻申请已提交，请等待平台审核')
      applies.value = []
      Object.assign(form, {
        shopName: '', categories: [], contact: '', phone: '', region: '', address: '', description: '',
        legalPerson: '', licenseNo: '', businessTerm: '', registeredAddress: '', businessScope: '', licenseImage: ''
      })
      await loadApplies()
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
h3 {
  margin: 4px 0 0;
}
.alert-time {
  font-weight: normal;
  font-size: 12px;
  opacity: 0.75;
  margin-left: 4px;
}
.apply-form {
  max-width: 640px;
  margin-top: 8px;
}
</style>
