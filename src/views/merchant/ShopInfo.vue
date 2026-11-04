<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="head">
        <b>店铺信息</b>
        <el-tag v-if="shop.status === 0" type="danger">店铺已被平台停用</el-tag>
      </div>
    </template>

    <el-alert v-if="shop.status === 0" type="warning" :closable="false" show-icon style="margin-bottom: 16px">
      <template #title>店铺当前处于停用状态</template>
      买家暂时无法浏览店铺与商品，请联系平台了解原因并申请恢复。
    </el-alert>

    <el-form ref="formRef" :model="shop" :rules="rules" label-width="100px" class="shop-form">
      <el-form-item label="店铺名称" prop="name">
        <el-input v-model="shop.name" maxlength="30" show-word-limit />
      </el-form-item>

      <el-form-item label="店铺标识" prop="icon">
        <ImageUpload v-model="iconList" :limit="1" />
      </el-form-item>

      <el-form-item label="经营类目" prop="categories">
        <el-select v-model="shop.categories" multiple placeholder="请选择经营类目" style="width: 100%">
          <el-option v-for="c in categories" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </el-form-item>

      <el-form-item label="店铺介绍">
        <el-input v-model="shop.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
      </el-form-item>

      <el-divider content-position="left">联系与地址</el-divider>

      <el-form-item label="联系人">
        <el-input v-model="shop.contact" maxlength="20" />
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="shop.phone" maxlength="11" placeholder="11 位手机号" />
      </el-form-item>
      <el-form-item label="所在区域">
        <el-select v-model="shop.region" placeholder="请选择所在区域" style="width: 100%">
          <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
        </el-select>
      </el-form-item>
      <el-form-item label="店铺地址" prop="address">
        <el-input v-model="shop.address" maxlength="100" show-word-limit placeholder="快递揽收地址" />
      </el-form-item>

      <el-divider content-position="left">工商资质信息</el-divider>
      <el-alert
        type="info" :closable="false" show-icon style="margin-bottom: 14px"
        title="资质信息对买家公示且为必填项，请确保与证照原件一致；修改后保存即生效"
      />
      <el-form-item label="法定代表人" prop="legalPerson">
        <el-input v-model="shop.legalPerson" maxlength="20" placeholder="营业执照上的法定代表人姓名" />
      </el-form-item>
      <el-form-item label="许可证号" prop="licenseNo">
        <el-input v-model="shop.licenseNo" maxlength="30" placeholder="统一社会信用代码或经营许可证号" />
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
        <el-input v-model="shop.registeredAddress" maxlength="100" show-word-limit placeholder="营业执照上的注册地址" />
      </el-form-item>
      <el-form-item label="经营范围" prop="businessScope">
        <el-input
          v-model="shop.businessScope"
          type="textarea" :rows="2" maxlength="100" show-word-limit
          placeholder="与证照记载的经营范围一致"
        />
      </el-form-item>
      <el-form-item label="许可证照片" prop="licenseImage">
        <ImageUpload v-model="licenseImageList" :limit="1" />
      </el-form-item>

      <el-form-item label="店铺数据">
        <div class="stats">
          <span>累计销量：{{ shop.sales ?? 0 }}</span>
          <span>店铺评分：{{ shop.rating ?? '暂无评分' }}</span>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button v-perm="'merchant:shop:edit'" type="primary" :loading="saving" @click="save">保存修改</el-button>
        <el-button @click="load">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUpload from '../../components/ImageUpload.vue'
import { fetchMyShop, updateMyShop } from '../../api/merchant'
import { fetchCategoryTree } from '../../api/product'

const REGIONS = [
  '北京市 · 海淀区', '北京市 · 朝阳区', '上海市 · 浦东新区', '广州市 · 天河区',
  '深圳市 · 南山区', '杭州市 · 西湖区', '成都市 · 武侯区'
]

const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const formRef = ref()

const shop = reactive({
  name: '',
  icon: '',
  color: '',
  description: '',
  contact: '',
  phone: '',
  region: '',
  address: '',
  categories: [],
  legalPerson: '',
  licenseNo: '',
  businessTerm: '',
  registeredAddress: '',
  businessScope: '',
  licenseImage: '',
  sales: 0,
  rating: null,
  status: 1
})

const licenseImageList = computed({
  get: () => (shop.licenseImage ? [shop.licenseImage] : []),
  set: (list) => { shop.licenseImage = list[0] || '' }
})

// 店铺标识：新数据为图片 URL，旧数据为 emoji（回退展示）
const iconIsImage = computed(() => /^https?:\/\/|^\//.test(shop.icon || ''))
const iconList = computed({
  get: () => (iconIsImage.value ? [shop.icon] : []),
  set: (list) => { shop.icon = list[0] || '🏪' }
})

// 营业期限：日期区间选择，存储为「开始 至 结束」字符串
const businessTermRange = computed({
  get: () => {
    const parts = (shop.businessTerm || '').split(' 至 ')
    return parts.length === 2 && parts[0] && parts[1] ? parts : null
  },
  set: (range) => { shop.businessTerm = range?.length === 2 ? `${range[0]} 至 ${range[1]}` : '' }
})

const rules = {
  name: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
  categories: [{ type: 'array', required: true, min: 1, message: '请至少选择一个经营类目', trigger: 'change' }],
  phone: [{ pattern: /^1\d{10}$/, message: '手机号需为 11 位', trigger: 'blur' }],
  address: [{ required: true, message: '请填写店铺地址', trigger: 'blur' }],
  icon: [{
    required: true, validator: (rule, value, callback) => {
      if (!value) return callback(new Error('请上传店铺标识图片'))
      if (!/^https?:\/\/|^\//.test(value)) return callback(new Error('当前标识为历史 emoji 数据，请上传图片替换'))
      callback()
    }, trigger: 'change'
  }],
  legalPerson: [{ required: true, message: '请输入法定代表人姓名', trigger: 'blur' }],
  licenseNo: [{ required: true, message: '请输入经营许可证号', trigger: 'blur' }],
  businessTerm: [{ required: true, message: '请选择营业期限', trigger: 'change' }],
  registeredAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  businessScope: [{ required: true, message: '请输入经营范围', trigger: 'blur' }],
  licenseImage: [{ required: true, message: '请上传经营许可证照片', trigger: 'change' }]
}

onMounted(() => {
  load()
  loadCategories()
})

async function load() {
  loading.value = true
  try {
    const res = await fetchMyShop()
    const data = res.data || {}
    Object.assign(shop, {
      name: data.name || '',
      icon: data.icon || '',
      color: data.color || '',
      description: data.description || '',
      contact: data.contact || '',
      phone: data.phone || '',
      region: data.region || '',
      address: data.address || '',
      categories: data.categories || [],
      legalPerson: data.legalPerson || '',
      licenseNo: data.licenseNo || '',
      businessTerm: data.businessTerm || '',
      registeredAddress: data.registeredAddress || '',
      businessScope: data.businessScope || '',
      licenseImage: data.licenseImage || '',
      sales: data.sales ?? 0,
      rating: data.rating ?? null,
      status: data.status ?? 1
    })
  } catch { /* 错误提示由拦截器处理 */ } finally {
    loading.value = false
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

function save() {
  formRef.value.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const res = await updateMyShop({
        name: shop.name,
        icon: shop.icon,
        color: shop.color,
        description: shop.description,
        contact: shop.contact,
        phone: shop.phone,
        region: shop.region,
        address: shop.address,
        categories: shop.categories,
        legalPerson: shop.legalPerson,
        licenseNo: shop.licenseNo,
        businessTerm: shop.businessTerm,
        registeredAddress: shop.registeredAddress,
        businessScope: shop.businessScope,
        licenseImage: shop.licenseImage
      })
      Object.assign(shop, res.data || {})
      ElMessage.success('店铺信息已保存')
    } finally {
      saving.value = false
    }
  })
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.shop-form {
  max-width: 720px;
}
.stats {
  display: flex;
  gap: 24px;
  color: #666;
}
</style>
