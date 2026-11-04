<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>我店铺的商品</b>
        <div class="filters">
          <el-input
            v-model="keyword" placeholder="商品名称" size="small" clearable style="width: 180px"
            @keyup.enter="search" @clear="search"
          />
          <el-select v-model="auditStatus" size="small" style="width: 120px" @change="search">
            <el-option label="全部审核状态" value="" />
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
          <el-select v-model="status" size="small" style="width: 110px" @change="search">
            <el-option label="全部状态" value="" />
            <el-option label="已上架" :value="1" />
            <el-option label="已下架" :value="0" />
          </el-select>
          <el-button v-perm="'merchant:products:create'" type="primary" size="small" @click="openCreate">+ 发布商品</el-button>
        </div>
      </div>
    </template>

    <el-empty v-if="!shopId" description="当前账号未绑定店铺，无法管理商品" />

    <template v-else>
      <el-table :data="rows" size="small" v-loading="loading">
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="goods">
              <img v-if="row.coverImage" :src="row.coverImage" class="g-img" alt="" />
              <div v-else class="g-img g-emoji" :style="{ background: row.color }">{{ row.emoji }}</div>
              <div class="g-text">
                <div class="g-name">{{ row.name }}</div>
                <div class="g-sub">{{ row.categoryName }}<span v-if="row.brandName"> · {{ row.brandName }}</span></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="售价" width="110">
          <template #default="{ row }">
            <span class="price">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column label="审核" width="150">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.auditStatus === 'REJECTED' && row.auditReason"
              :content="`驳回原因：${row.auditReason}`" placement="top"
            >
              <el-tag size="small" type="danger">已驳回（悬看原因）</el-tag>
            </el-tooltip>
            <el-tag v-else size="small" :type="auditTagType(row.auditStatus)">{{ auditText(row.auditStatus) }}</el-tag>
            <el-tag v-if="row.pendingData" size="small" type="warning" style="margin-left: 4px">修改待审核</el-tag>
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-perm="'merchant:products:edit'" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'merchant:products:edit'" link type="primary" size="small" @click="openRestock(row)">补货</el-button>
            <el-button v-perm="'merchant:products:price'" link type="primary" size="small" @click="openPrice(row)">售价</el-button>
            <el-button v-if="row.status === 1" v-perm="'merchant:products:status'" link type="info" size="small" @click="doOffSale(row)">下架</el-button>
            <el-button v-else v-perm="'merchant:products:status'" link type="success" size="small" @click="doOnSale(row)">上架</el-button>
            <el-button v-perm="'merchant:products:delete'" link type="danger" size="small" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
        layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
        @current-change="load"
      />
    </template>

    <!-- 发布 / 编辑商品 -->
    <el-dialog
      v-model="dialog" :title="form.id ? '编辑商品' : '发布新商品'"
      width="min(1240px, 94vw)" destroy-on-close class="product-edit-dialog"
    >
      <el-alert
        v-if="editTip.text" :title="editTip.text" :type="editTip.type"
        :closable="false" show-icon style="margin-bottom: 14px"
      />
      <el-form :model="form" label-width="90px">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="请输入商品名称" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="主分类" required>
              <el-select v-model="form.categoryId" style="width: 100%" placeholder="选择大类" @change="onCategoryChange">
                <el-option v-for="c in categories" :key="c.id" :label="`${c.icon || ''} ${c.name}`" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="小类">
              <el-select v-model="form.subCategoryId" style="width: 100%" clearable placeholder="可不选">
                <el-option v-for="c in subCategories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-select v-model="form.brandId" style="width: 100%" clearable placeholder="可不选">
                <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存" required>
              <el-input-number v-if="!hasSkuMatrix" v-model="form.stock" :min="0" :max="99999999" style="width: 100%" />
              <div v-else class="auto-field">{{ matrixTotalStock }} 件<span class="tip">（= 各规格库存之和，自动计算）</span></div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="售价" required>
          <el-input-number v-if="!hasSkuMatrix" v-model="form.price" :min="0.01" :precision="2" style="width: 100%" />
          <div v-else class="auto-field">¥{{ matrixMinPrice }}<span class="tip">（= 最低规格价，自动计算）</span></div>
        </el-form-item>
        <el-form-item label="商品主图">
          <ImageUpload v-model="coverList" :limit="1" />
        </el-form-item>
        <el-form-item label="商品图集">
          <ImageUpload v-model="form.images" :limit="5" />
        </el-form-item>
        <el-form-item label="服务保障">
          <el-select
            v-model="form.serviceKeys" multiple collapse-tags collapse-tags-tooltip
            placeholder="选择平台配置的服务保障" style="width: 100%"
          >
            <el-option
              v-for="g in guarantees" :key="g.key"
              :label="`${g.icon} ${g.name}`" :value="g.key"
            />
          </el-select>
          <div v-if="!guarantees.length" class="tip">平台暂未配置可用的服务保障</div>
        </el-form-item>
        <el-form-item label="商品规格">
          <div class="spec-editor">
            <div v-for="(g, gi) in specDraft" :key="gi" class="spec-row">
              <el-select
                v-model="g.name" filterable allow-create default-first-option
                placeholder="选择规格" style="width: 150px" @change="rebuildSkus"
              >
                <el-option v-for="s in specLib" :key="s.id" :label="s.name" :value="s.name" />
              </el-select>
              <el-select
                v-model="g.options" multiple filterable allow-create default-first-option
                :reserve-keyword="false" placeholder="选择/输入规格值" style="flex: 1" @change="rebuildSkus"
              >
                <el-option v-for="o in optionsFor(g.name)" :key="o" :label="o" :value="o" />
              </el-select>
              <el-button link type="danger" @click="removeSpecGroup(gi)">删除</el-button>
            </div>
            <div class="spec-foot">
              <el-button v-if="specDraft.length < 3" link type="primary" @click="addSpecGroup">+ 添加规格（最多 3 组）</el-button>
              <span class="tip">
                规格来自
                <router-link to="/merchant/specs">「我的规格」</router-link>
                ，也可直接输入新规格名 / 规格值（输入后回车）
              </span>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="hasSkuMatrix" label="规格价格">
          <div class="sku-matrix">
            <div class="batch-bar">
              <span class="batch-label">批量填充</span>
              价格 <el-input-number v-model="batchPrice" :min="0.01" :precision="2" size="small" style="width: 110px" />
              <el-button size="small" @click="fillPrice">应用全部价格</el-button>
              库存 <el-input-number v-model="batchStock" :min="0" size="small" style="width: 110px" />
              <el-button size="small" @click="fillStock">应用全部库存</el-button>
            </div>
            <el-table :data="skuRows" size="small" max-height="300">
              <el-table-column label="规格组合" min-width="220">
                <template #default="{ row }">
                  <el-tag v-for="(v, k) in row.specs" :key="k" size="small" type="info" class="mr6">{{ k }}：{{ v }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="价格（元）" width="160">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" :min="0.01" :precision="2" size="small" style="width: 130px" />
                </template>
              </el-table-column>
              <el-table-column label="库存（件）" width="160">
                <template #default="{ row }">
                  <el-input-number v-model="row.stock" :min="0" size="small" style="width: 130px" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
        <el-form-item label="商品详情">
          <RichTextEditor v-model="form.detail" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">
          {{ form.id ? '保存' : '发布并提交审核' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 补货 -->
    <el-dialog v-model="restockDialog" :title="`补货 - ${current?.name || ''}`" width="380px">
      <el-form label-width="90px">
        <el-form-item label="增加数量">
          <el-input-number v-model="restockQty" :min="1" :max="99999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restockDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRestock">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改售价：直接生效，无需平台审核 -->
    <el-dialog v-model="priceDialog" :title="`修改售价 - ${current?.name || ''}`" width="420px">
      <el-form label-width="90px">
        <el-form-item label="售价">
          <el-input-number v-model="newPrice" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item>
          <span class="tip">修改立即生效，无需平台审核；多规格商品成交价按所选规格价计算</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="priceDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitPrice">保存</el-button>
      </template>
    </el-dialog>

    <!-- 下架：原因预设来自配置中心 off-shelf-reason -->
    <ReasonInputDialog
      v-model="offDialog" title="下架商品" label="下架原因"
      group="off-shelf-reason" :defaults="DEFAULT_OFF_SHELF_REASONS"
      @confirm="confirmOff"
    />
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ImageUpload from '../../components/ImageUpload.vue'
import ReasonInputDialog from '../../components/ReasonInputDialog.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'

const DEFAULT_OFF_SHELF_REASONS = ['库存不足', '商品信息待完善', '换季/清仓临时下架', '违规整改', '其他']
import {
  createProduct, deleteProduct, fetchBrands, fetchCategoryTree, fetchProductDetail, fetchProducts,
  offSaleProduct, onSaleProduct, restockProduct, setProductPrice, updateProduct
} from '../../api/product'
import { fetchMerchantSpecs } from '../../api/spec'
import { fetchShop } from '../../api/shop'
import { fetchPublicConfig, parseConfigJson } from '../../api/config'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()
const shopId = computed(() => userStore.user?.shopId)
const shopName = ref('')

const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const loading = ref(false)
const keyword = ref('')
const auditStatus = ref('')
const status = ref('')

const categories = ref([])
const brands = ref([])
// 平台配置中心启用的服务保障（发布商品时选择，商品按 key 关联）
const guarantees = ref([])
const saving = ref(false)

// 我的规格库 + 编辑中的规格组合与价格矩阵
const specLib = ref([])
const specDraft = ref([])
const skuRows = ref([])
const batchPrice = ref(null)
const batchStock = ref(null)
const MAX_COMBO = 100

const dialog = ref(false)
const restockDialog = ref(false)
const priceDialog = ref(false)
const current = ref(null)
const restockQty = ref(100)
const newPrice = ref(0)

const form = reactive(resetForm())
/** 编辑时保留的规格/SKU/类目/占位信息，提交时原样回传，避免规格被清空 */
const raw = ref(null)
/** 编辑弹窗顶部提示：待审核修改 / 驳回原因 */
const editTip = reactive({ text: '', type: 'info' })

const subCategories = computed(() =>
  categories.value.find((c) => c.id === form.categoryId)?.children || [])

const coverList = computed({
  get: () => (form.coverImage ? [form.coverImage] : []),
  set: (list) => { form.coverImage = list[0] || '' }
})

// ==================== 商品规格与价格矩阵 ====================
/** 已填写完整的规格组（有名称且有规格值） */
const validGroups = computed(() =>
  specDraft.value.filter((g) => g.name?.trim() && g.options?.length))

const hasSkuMatrix = computed(() => skuRows.value.length > 0)

const matrixMinPrice = computed(() => {
  const prices = skuRows.value.map((r) => Number(r.price)).filter((p) => p > 0)
  return prices.length ? Math.min(...prices) : null
})

const matrixTotalStock = computed(() =>
  skuRows.value.reduce((sum, r) => sum + (Number(r.stock) || 0), 0))

async function loadSpecLib() {
  if (!shopId.value) return
  try {
    const res = await fetchMerchantSpecs()
    specLib.value = res.data || []
  } catch {
    specLib.value = []
  }
}

/** 某规格名在「我的规格」中的候选规格值 */
const optionsFor = (name) => specLib.value.find((s) => s.name === name)?.options || []

function addSpecGroup() {
  specDraft.value.push({ name: '', options: [] })
}

function removeSpecGroup(index) {
  specDraft.value.splice(index, 1)
  rebuildSkus()
}

/** 按当前规格组自动展开全部组合；已填过的价格/库存按组合 key 保留 */
function rebuildSkus() {
  const groups = validGroups.value
  const total = groups.reduce((acc, g) => acc * g.options.length, 1)
  if (!groups.length) {
    skuRows.value = []
    return
  }
  if (total > MAX_COMBO) {
    ElMessage.warning(`规格组合共 ${total} 个，超过上限 ${MAX_COMBO}，请精简规格值`)
    skuRows.value = []
    return
  }
  const old = new Map(skuRows.value.map((r) => [r.key, r]))
  let combos = [{}]
  for (const g of groups) {
    combos = g.options.flatMap((opt) => combos.map((c) => ({ ...c, [g.name]: opt })))
  }
  skuRows.value = combos.map((combo) => {
    const specs = {}
    for (const g of groups) specs[g.name] = combo[g.name]
    const key = groups.map((g) => combo[g.name]).join('|')
    const prev = old.get(key)
    return {
      key,
      specs,
      price: prev?.price ?? (Number(form.price) || 0.01),
      stock: prev?.stock ?? 0
    }
  })
}

/** 从已保存商品回填规格组合（含各组合已保存的价格/库存） */
function fillSpecFromProduct(specs, skus) {
  specDraft.value = (specs || []).map((g) => ({ name: g.name, options: [...(g.options || [])] }))
  const groups = specDraft.value
  const keyOf = (specsMap) => groups.map((g) => specsMap?.[g.name] ?? '').join('|')
  const saved = new Map((skus || []).map((s) => [keyOf(s.specs), s]))
  let combos = [{}]
  for (const g of groups) {
    if (!g.name?.trim() || !g.options?.length) continue
    combos = g.options.flatMap((opt) => combos.map((c) => ({ ...c, [g.name]: opt })))
  }
  skuRows.value = combos.map((combo) => {
    const specsMap = {}
    for (const g of groups) specsMap[g.name] = combo[g.name]
    const key = keyOf(specsMap)
    const hit = saved.get(key)
    return {
      key,
      specs: specsMap,
      price: Number(hit?.price ?? form.price) || 0.01,
      stock: hit?.stock ?? 0
    }
  })
}

function fillPrice() {
  if (!batchPrice.value || batchPrice.value <= 0) return ElMessage.warning('请先输入大于 0 的价格')
  skuRows.value.forEach((r) => { r.price = batchPrice.value })
}

function fillStock() {
  if (batchStock.value == null || batchStock.value < 0) return ElMessage.warning('请先输入库存数量')
  skuRows.value.forEach((r) => { r.stock = batchStock.value })
}

onMounted(async () => {
  loadDicts()
  loadGuarantees()
  loadSpecLib()
  loadShop()
  load()
})

function resetForm() {
  return {
    id: null, name: '', categoryId: null, subCategoryId: null, brandId: null,
    price: 99, stock: 100,
    coverImage: '', images: [], serviceKeys: [], detail: ''
  }
}

const auditText = (s) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }[s] || s || '')
const auditTagType = (s) => ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }[s] || 'info')

async function loadShop() {
  if (!shopId.value) return
  try {
    const res = await fetchShop(shopId.value)
    shopName.value = res.data?.name || ''
  } catch { /* ignore */ }
}

async function loadDicts() {
  try {
    const [catRes, brandRes] = await Promise.all([fetchCategoryTree(), fetchBrands()])
    categories.value = catRes.data || []
    brands.value = brandRes.data || []
  } catch { /* ignore */ }
}

async function loadGuarantees() {
  try {
    const res = await fetchPublicConfig('service-guarantee')
    guarantees.value = (res.data || [])
      .map((item) => ({ key: item.key, ...(parseConfigJson(item.value, {}) || {}) }))
      .filter((g) => g.enabled !== false && g.name)
  } catch {
    guarantees.value = []
  }
}

function search() {
  page.value = 1
  load()
}

async function load() {
  if (!shopId.value) return
  loading.value = true
  try {
    const res = await fetchProducts({
      shopId: shopId.value,
      includeAll: true,
      keyword: keyword.value || undefined,
      auditStatus: auditStatus.value || undefined,
      status: status.value === '' ? undefined : status.value,
      page: page.value,
      size
    })
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, resetForm())
  raw.value = null
  specDraft.value = []
  skuRows.value = []
  batchPrice.value = null
  batchStock.value = null
  editTip.text = ''
  dialog.value = true
}

async function openEdit(row) {
  try {
    const res = await fetchProductDetail(row.id)
    const p = res.data || {}
    // 上架中商品有待审核修改时，表单加载商家上次提交的草稿内容
    const src = p.pendingData || p
    raw.value = {
      emoji: src.emoji,
      color: src.color,
      discountPrice: src.discountPrice,
      categoryIds: src.categoryIds || []
    }
    Object.assign(form, {
      id: p.id,
      name: src.name,
      categoryId: src.categoryId,
      subCategoryId: (src.categoryIds || []).find((id) => id !== src.categoryId) || null,
      brandId: src.brandId || null,
      price: Number(src.price),
      stock: src.stock ?? 0,
      coverImage: src.coverImage || '',
      images: [...(src.images || [])],
      serviceKeys: [...(src.serviceKeys || [])],
      detail: src.detail || ''
    })
    // 规格组合与各组合价格/库存回填到编辑矩阵
    fillSpecFromProduct(src.specs, src.skus)
    if (p.pendingData) {
      editTip.text = '该商品有修改正在等待平台审核，审核通过前买家看到的仍是当前线上内容；再次保存将覆盖未审核的修改。'
      editTip.type = 'warning'
    } else if (p.auditStatus === 'REJECTED') {
      editTip.text = `驳回原因：${p.auditReason || '未填写'}。请据原因修改后保存，商品将重新提交平台审核。`
      editTip.type = 'error'
    } else {
      editTip.text = ''
    }
    dialog.value = true
  } catch (ex) {
    // 加载失败不再静默：接口错误由拦截器提示，这里兜底提示一次，避免「点了没反应」
    console.error('加载商品详情失败', ex)
    ElMessage.error('加载商品详情失败，请重试')
  }
}

function onCategoryChange() {
  form.subCategoryId = null
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning('请填写商品名称')
  if (!form.categoryId) return ElMessage.warning('请选择商品主分类')
  // 有规格但没填完整的组先拦下
  if (specDraft.value.some((g) => (g.name?.trim() ? !g.options?.length : !!g.options?.length))) {
    return ElMessage.warning('有规格组未填写完整，请补全规格值或删除该规格')
  }
  if (hasSkuMatrix.value) {
    if (!matrixMinPrice.value) return ElMessage.warning('每个规格组合都需要设置大于 0 的价格')
  } else {
    if (!form.price || form.price <= 0) return ElMessage.warning('请填写正确的售价')
    if (form.stock == null || form.stock < 0) return ElMessage.warning('请填写正确的库存')
  }

  const hasMatrix = hasSkuMatrix.value
  const payload = {
    name: form.name.trim(),
    categoryId: form.categoryId,
    categoryIds: [form.categoryId, form.subCategoryId].filter(Boolean),
    brandId: form.brandId || null,
    shopId: shopId.value,
    shopName: shopName.value,
    // 多规格商品：售价取最低规格价、库存取各规格库存之和（作为展示与下单基准）
    price: hasMatrix ? matrixMinPrice.value : form.price,
    discountPrice: raw.value?.discountPrice ?? undefined,
    stock: hasMatrix ? matrixTotalStock.value : form.stock,
    coverImage: form.coverImage || '',
    images: form.images,
    serviceKeys: form.serviceKeys,
    detail: form.detail,
    emoji: raw.value?.emoji || undefined,
    color: raw.value?.color || undefined,
    specs: hasMatrix
      ? validGroups.value.map((g) => ({ name: g.name.trim(), options: g.options }))
      : undefined,
    skus: hasMatrix
      ? skuRows.value.map((r) => ({ specs: r.specs, price: r.price, stock: r.stock ?? 0 }))
      : undefined
  }

  saving.value = true
  try {
    if (form.id) {
      await updateProduct(form.id, payload)
      ElMessage.success('修改已提交，等待平台审核')
    } else {
      await createProduct(payload)
      ElMessage.success('商品已提交，等待平台审核')
    }
    dialog.value = false
    load()
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}

function openRestock(row) {
  current.value = row
  restockQty.value = 100
  restockDialog.value = true
}

async function submitRestock() {
  if (!restockQty.value || restockQty.value < 1) return ElMessage.warning('补货数量需大于 0')
  saving.value = true
  try {
    await restockProduct(current.value.id, restockQty.value)
    ElMessage.success(`「${current.value.name}」已补货 ${restockQty.value} 件`)
    restockDialog.value = false
    load()
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}

function openPrice(row) {
  current.value = row
  newPrice.value = Number(row.price)
  priceDialog.value = true
}

async function submitPrice() {
  if (!newPrice.value || newPrice.value <= 0) {
    return ElMessage.warning('请填写正确的售价')
  }
  saving.value = true
  try {
    await setProductPrice(current.value.id, newPrice.value)
    ElMessage.success('售价已更新')
    priceDialog.value = false
    load()
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}

async function doOnSale(row) {
  try {
    await onSaleProduct(row.id)
    ElMessage.success('已上架')
    load()
  } catch { /* ignore */ }
}

const offDialog = ref(false)
const offTarget = ref(null)

function doOffSale(row) {
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

function doDelete(row) {
  ElMessageBox.confirm(`确认删除商品「${row.name}」？删除后不可恢复。`, '删除商品', { type: 'warning' })
    .then(async () => {
      await deleteProduct(row.id)
      ElMessage.success('已删除')
      load()
    })
    .catch(() => {})
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
}
.goods {
  display: flex;
  align-items: center;
  gap: 10px;
}
.g-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.g-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.g-text {
  min-width: 0;
}
.g-name {
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.g-sub {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.price {
  color: #ff4b2b;
  font-weight: 600;
}
.tip {
  font-size: 12px;
  color: #999;
}
.auto-field {
  font-size: 15px;
  font-weight: 600;
  color: #ff4b2b;
  line-height: 32px;
}
.auto-field .tip {
  font-weight: 400;
  margin-left: 6px;
}
.spec-editor {
  width: 100%;
}
.spec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.spec-foot {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sku-matrix {
  width: 100%;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.batch-label {
  font-weight: 600;
}
.mr6 {
  margin-right: 6px;
  margin-bottom: 2px;
}
</style>

<style>
/* 商品编辑弹窗：高度收在视口内，标题/底栏固定，表单在弹窗内部滚动（弹窗样式需全局作用域）。
   注：Element Plus 把 class 挂在 .el-dialog 根元素上，需复合选择器；后代选择器兜底其他挂载位置 */
.product-edit-dialog.el-dialog,
.product-edit-dialog .el-dialog {
  height: 86vh;
  margin: 6vh auto 0;
  display: flex;
  flex-direction: column;
}
.product-edit-dialog .el-dialog__header,
.product-edit-dialog .el-dialog__footer {
  flex-shrink: 0;
}
.product-edit-dialog .el-dialog__body {
  flex: 1;
  overflow-y: auto;
  /* 表单行 gutter 负边距造成的几像素横向溢出不算内容溢出，隐藏避免出现横向滚动条 */
  overflow-x: hidden;
}
</style>
