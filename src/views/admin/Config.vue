<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="head">
        <b>配置中心</b>
        <span class="tip">商品大类 / 小类请前往左侧「分类管理」维护；品牌与物流公司保留各自独立管理页。</span>
      </div>
    </template>

    <el-tabs v-model="tab" @tab-change="onTabChange">
      <!-- ==================== 规格模板 ==================== -->
      <el-tab-pane label="规格模板" name="specs">
        <div class="pane-head">
          <span class="tip">商家发布商品时可直接选用这些规格模板。</span>
          <el-button type="primary" @click="openSpec()">新增规格</el-button>
        </div>
        <el-table :data="specs" size="small">
          <el-table-column prop="name" label="规格名称" width="160" />
          <el-table-column label="规格值">
            <template #default="{ row }">
              <el-tag v-for="o in row.options" :key="o" class="mr6" size="small">{{ o }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button link type="primary" @click="openSpec(row)">编辑</el-button>
              <el-button link type="danger" @click="removeSpec(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 支付方式 ==================== -->
      <el-tab-pane label="支付方式" name="pay-method">
        <div class="pane-head">
          <span class="tip">关闭后买家收银台不再展示该支付方式（至少保留一种）。</span>
        </div>
        <el-table :data="payForm" size="small" style="max-width: 720px">
          <el-table-column label="支付方式" width="180">
            <template #default="{ row }">{{ row.icon }} {{ row.label }}</template>
          </el-table-column>
          <el-table-column label="前台显示名称">
            <template #default="{ row }">
              <el-input v-model="row.name" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="启用" width="100">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
        </el-table>
        <div class="foot">
          <el-button type="primary" :loading="saving" @click="savePay">保存支付方式</el-button>
        </div>
      </el-tab-pane>

      <!-- ==================== 服务保障 ==================== -->
      <el-tab-pane label="服务保障" name="service-guarantee">
        <div class="pane-head">
          <span class="tip">
            商家发布商品时从中选择服务保障承诺，商品按配置 key 与保障关联；
            停用后不再供商家选择，已选商品的商品详情也不再展示该项。
          </span>
          <el-button type="primary" @click="addGuarantee">添加服务保障</el-button>
        </div>
        <el-table :data="guaranteeForm" size="small" style="max-width: 860px">
          <el-table-column label="配置 key" width="220">
            <template #default="{ row }">
              <el-input v-model="row.key" size="small" :disabled="row.persisted" placeholder="如 seven-day-return" />
            </template>
          </el-table-column>
          <el-table-column label="名称">
            <template #default="{ row }">
              <el-input v-model="row.name" size="small" placeholder="如 七天无理由退货" />
            </template>
          </el-table-column>
          <el-table-column label="图标" width="90">
            <template #default="{ row }">
              <el-input v-model="row.icon" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="启用" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row, $index }">
              <el-button link type="danger" @click="removeGuarantee(row, $index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="foot">
          <el-button type="primary" :loading="saving" @click="saveGuarantee">保存服务保障</el-button>
        </div>
      </el-tab-pane>

      <!-- ==================== 会员等级 ==================== -->
      <el-tab-pane label="会员等级" name="levels">
        <div class="pane-head">
          <span class="tip">成长值达到门槛自动升级；积分倍率影响下单获得积分，折扣值 10 表示无折扣。</span>
          <el-button type="primary" @click="openLevel()">新增等级</el-button>
        </div>
        <el-table :data="levels" size="small">
          <el-table-column prop="name" label="等级名称" width="140" />
          <el-table-column prop="minGrowth" label="成长值门槛" width="110" />
          <el-table-column label="积分倍率" width="100">
            <template #default="{ row }">{{ row.pointsRate }} 倍</template>
          </el-table-column>
          <el-table-column label="会员折扣" width="100">
            <template #default="{ row }">{{ row.discount }} 折</template>
          </el-table-column>
          <el-table-column label="包邮" width="80">
            <template #default="{ row }">
              <el-tag :type="row.freeShipping ? 'success' : 'info'" size="small">
                {{ row.freeShipping ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button link type="primary" @click="openLevel(row)">编辑</el-button>
              <el-button link type="danger" @click="removeLevel(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 积分规则 ==================== -->
      <el-tab-pane label="积分规则" name="points-rule">
        <el-form label-width="180px" class="narrow">
          <el-form-item label="消费得积分">
            每消费
            <el-input-number v-model="pointsForm['earn-amount-per-point']" :min="0.01" :step="1" :precision="2" class="inline-num" />
            元累计 1 积分
          </el-form-item>
          <el-form-item label="积分商城倍数">
            <el-input-number v-model="pointsForm['mall-rate']" :min="0.1" :step="0.1" :precision="2" class="inline-num" />
            倍（积分价 = 原价 × 倍数）
          </el-form-item>
          <el-form-item label="评价奖励积分">
            <el-input-number v-model="pointsForm['review-reward']" :min="0" :step="1" class="inline-num" />
            积分
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="savePoints">保存积分规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ==================== 分红规则 ==================== -->
      <el-tab-pane label="分红规则" name="dividend">
        <el-form label-width="180px" class="narrow">
          <el-form-item label="平台运费分成比例">
            <el-input-number v-model="dividendForm['platform-ratio']" :min="0" :max="100" :step="5" :precision="0" class="inline-num" />
            %（正向运单签收后，平台按订单运费的此比例分成，其余归承运物流公司并计入其分红账户）
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveDividend">保存分红规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ==================== 折扣规则 ==================== -->
      <el-tab-pane label="折扣规则" name="discount">
        <el-form label-width="200px" class="narrow">
          <el-form-item label="活动与优惠券同享">
            <el-switch v-model="discountForm['promotion-coupon-stackable']" />
            <span class="tip-inline">全局开关；关闭后订单在「仅活动」与「仅优惠券」之间自动取优惠更大的一方</span>
          </el-form-item>
          <el-form-item label="一单叠加多张优惠券">
            <el-switch v-model="discountForm['multi-coupon-enabled']" />
            <span class="tip-inline">关闭后每笔订单只能使用一张优惠券</span>
          </el-form-item>
          <el-form-item label="单笔订单最多叠加">
            <el-input-number v-model="discountForm['max-coupons-per-order']" :min="1" :max="10" :precision="0" class="inline-num" />
            张优惠券（开启多券叠加后生效）
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveDiscount">保存折扣规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ==================== 首页 Banner ==================== -->
      <el-tab-pane label="首页 Banner" name="banner">
        <div class="pane-head">
          <span class="tip">保存后买家首页轮播立即生效；背景色支持纯色或 CSS 渐变。</span>
          <el-button type="primary" @click="addBanner">添加 Banner</el-button>
        </div>
        <div v-for="(b, i) in banners" :key="b.id" class="banner-row">
          <div class="banner-preview" :style="{ background: b.color || '#ff4b2b' }">
            <b>{{ b.title || '标题' }}</b>
            <span>{{ b.subtitle || '副标题' }}</span>
          </div>
          <div class="banner-fields">
            <el-input v-model="b.title" placeholder="标题" />
            <el-input v-model="b.subtitle" placeholder="副标题" />
            <el-input v-model="b.color" placeholder="背景色，如 linear-gradient(90deg,#ff416c,#ff4b2b)" />
            <el-input v-model="b.link" placeholder="点击跳转路径，如 /products" />
          </div>
          <el-button link type="danger" @click="banners.splice(i, 1)">删除</el-button>
        </div>
        <el-empty v-if="!banners.length" description="暂无 Banner" :image-size="70" />
        <div class="foot">
          <el-button type="primary" :loading="saving" @click="saveBanners">保存 Banner</el-button>
        </div>
      </el-tab-pane>

      <!-- ==================== 售后原因 / 举报类型 / 敏感词 ==================== -->
      <el-tab-pane v-for="list in LIST_GROUPS" :key="list.group" :label="list.label" :name="list.group">
        <div class="pane-head">
          <span class="tip">{{ list.tip }}</span>
        </div>
        <div class="str-list">
          <el-tag
            v-for="item in listState[list.group]" :key="item" closable size="large"
            @close="removeStr(list.group, item)"
          >{{ item }}</el-tag>
          <span v-if="!listState[list.group].length" class="tip">暂无内容，请在下方添加</span>
        </div>
        <div class="str-add">
          <el-autocomplete
            v-model="listInput[list.group]"
            :fetch-suggestions="(query, cb) => queryListValues(list.group, query, cb)"
            :placeholder="list.placeholder" clearable style="width: 260px"
            @keyup.enter="addStr(list.group)" @select="onListSelect(list.group)"
          />
          <el-button @click="addStr(list.group)">添加</el-button>
          <el-button type="primary" :loading="saving" @click="saveList(list.group)">保存</el-button>
        </div>
      </el-tab-pane>

      <!-- ==================== 系统参数 ==================== -->
      <el-tab-pane label="系统参数" name="system">
        <el-form label-width="180px" class="narrow">
          <el-form-item label="平台名称">
            <el-input v-model="systemForm.platformName" />
          </el-form-item>
          <el-form-item label="客服电话">
            <el-input v-model="systemForm.servicePhone" />
          </el-form-item>
          <el-form-item label="客服服务时间">
            <el-input v-model="systemForm.serviceHours" placeholder="如 09:00-21:00" />
          </el-form-item>
          <el-form-item label="包邮门槛（元）">
            <el-input-number v-model="systemForm.freeShippingThreshold" :min="0" :precision="2" />
          </el-form-item>
          <el-form-item label="待支付超时（分钟）">
            <el-input-number v-model="systemForm.orderTimeoutMinutes" :min="1" :step="5" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveSystem">保存系统参数</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <!-- ==================== 区域配置 ==================== -->
      <el-tab-pane label="区域配置" name="regions">
        <div class="pane-head">
          <el-breadcrumb v-if="!regionSearchKey" separator="/">
            <el-breadcrumb-item>
              <el-link :underline="false" @click="regionPath = []">全国</el-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item v-for="(node, i) in regionPath" :key="node.id">
              <el-link :underline="false" @click="regionPath = regionPath.slice(0, i + 1)">{{ node.name }}</el-link>
            </el-breadcrumb-item>
          </el-breadcrumb>
          <span v-else class="tip">搜索「{{ regionSearchKey }}」{{ regionSearchResults.length >= 100 ? '前 100 条' : `共 ${regionSearchResults.length} 条` }}</span>
          <div style="display: flex; gap: 10px">
            <el-input v-model="regionSearchKey" placeholder="搜索区域名称" clearable style="width: 200px" />
            <el-button type="primary" @click="openRegion()">新增区域</el-button>
          </div>
        </div>

        <template v-if="regionSearchKey">
          <el-table :data="regionSearchResults" size="small" max-height="480">
            <el-table-column label="区域" min-width="220">
              <template #default="{ row }">{{ row.pathLabel }}</template>
            </el-table-column>
            <el-table-column prop="id" label="区划代码" width="110" />
            <el-table-column label="层级" width="80">
              <template #default="{ row }">{{ LEVEL_NAMES[row.level] || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 0 ? 'danger' : 'success'" size="small">{{ row.status === 0 ? '停用' : '启用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="230">
              <template #default="{ row }">
                <el-button v-if="row.level < 3" link type="primary" @click="gotoRegion(row)">进入</el-button>
                <el-button link type="primary" @click="openRegion(null, row)">编辑</el-button>
                <el-button link :type="row.status === 0 ? 'success' : 'warning'" @click="toggleRegion(row)">{{ row.status === 0 ? '启用' : '停用' }}</el-button>
                <el-button link type="danger" @click="removeRegion(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <template v-else>
          <el-table :data="currentRegionChildren" size="small" max-height="480">
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="id" label="区划代码" width="110" />
            <el-table-column label="层级" width="80">
              <template #default="{ row }">{{ LEVEL_NAMES[row.level] || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 0 ? 'danger' : 'success'" size="small">{{ row.status === 0 ? '停用' : '启用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button v-if="row.level < 3" link type="primary" @click="enterRegion(row)">进入</el-button>
                <el-button v-if="row.level < 3" link type="primary" @click="openRegion(row)">新增下级</el-button>
                <el-button link type="primary" @click="openRegion(null, row)">编辑</el-button>
                <el-button link :type="row.status === 0 ? 'success' : 'warning'" @click="toggleRegion(row)">{{ row.status === 0 ? '启用' : '停用' }}</el-button>
                <el-button link type="danger" @click="removeRegion(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 规格弹窗 -->
    <el-dialog v-model="specDialog" :title="specForm.id ? '编辑规格' : '新增规格'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="规格名称" required>
          <el-autocomplete
            v-model="specForm.name" :fetch-suggestions="querySpecNames" clearable
            placeholder="如：颜色 / 尺码（输入时联想已有规格）" style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="规格值" required>
          <el-input
            v-model="specForm.optionsText" type="textarea" :rows="3"
            placeholder="多个值用逗号、顿号或换行分隔，如：红色,蓝色,黑色"
          />
          <div v-if="commonOptionValues.length" class="quick-chips">
            <span class="chip-label">常用规格值（点击补全）：</span>
            <el-tag v-for="o in commonOptionValues" :key="o" size="small" class="chip" @click="appendOption(o)">{{ o }}</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="specForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="specDialog = false">取消</el-button>
        <el-button type="primary" :loading="dialogSaving" @click="saveSpec">保存</el-button>
      </template>
    </el-dialog>

    <!-- 会员等级弹窗 -->
    <el-dialog v-model="levelDialog" :title="levelForm.id ? '编辑会员等级' : '新增会员等级'" width="520px">
      <el-form label-width="110px">
        <el-form-item label="等级名称" required>
          <el-input v-model="levelForm.name" placeholder="如：黄金会员" />
        </el-form-item>
        <el-form-item label="成长值门槛" required>
          <el-input-number v-model="levelForm.minGrowth" :min="0" :step="100" />
        </el-form-item>
        <el-form-item label="积分倍率" required>
          <el-input-number v-model="levelForm.pointsRate" :min="0.1" :step="0.1" :precision="2" />
          <span class="unit">倍</span>
        </el-form-item>
        <el-form-item label="会员折扣" required>
          <el-input-number v-model="levelForm.discount" :min="0.1" :max="10" :step="0.1" :precision="2" />
          <span class="unit">折（10 = 原价）</span>
        </el-form-item>
        <el-form-item label="是否包邮">
          <el-switch v-model="levelForm.freeShipping" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="levelForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="levelDialog = false">取消</el-button>
        <el-button type="primary" :loading="dialogSaving" @click="saveLevel">保存</el-button>
      </template>
    </el-dialog>

    <!-- 区域弹窗 -->
    <el-dialog v-model="regionDialog" :title="regionForm.id ? '编辑区域' : '新增区域'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="上级区域" required>
          <el-cascader
            v-model="regionForm.parentPathIds"
            :options="regionTree"
            :props="{ value: 'id', label: 'name', children: 'children', checkStrictly: true, emitPath: true }"
            :disabled="!!regionForm.id"
            placeholder="留空为省级；下级需选到其父级"
            style="width: 100%"
          />
          <div v-if="!regionForm.id" class="tip" style="margin-top: 4px">
            上级最多选到市级（如「浙江省 / 杭州市」后新增县区）；「省直辖县级行政区划」节点下也可挂县。
          </div>
        </el-form-item>
        <el-form-item label="区域名称" required>
          <el-input v-model="regionForm.name" placeholder="如：滨江区" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="regionDialog = false">取消</el-button>
        <el-button type="primary" :loading="dialogSaving" @click="saveRegion">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createMemberLevel,
  createSpec,
  deleteConfig,
  deleteMemberLevel,
  deleteSpec,
  fetchConfig,
  fetchMemberLevels,
  fetchSpecs,
  saveConfig,
  updateMemberLevel,
  updateSpec
} from '../../api/admin'
import {
  createRegion,
  deleteRegion,
  fetchRegionAdminTree,
  parseConfigJson,
  renameRegion,
  setRegionStatus
} from '../../api/config'

const tab = ref('specs')
const loading = ref(false)
const saving = ref(false)
const dialogSaving = ref(false)

// ==================== 区域配置 ====================
const LEVEL_NAMES = { 1: '省', 2: '市', 3: '县区' }
const regionTree = ref([])
const regionPath = ref([]) // 当前导航路径（根 → … → 所在层级）
const regionSearchKey = ref('')
const regionDialog = ref(false)
const regionForm = reactive({ id: null, parentPathIds: [], name: '' })

const currentRegionChildren = computed(() => {
  let nodes = regionTree.value
  for (const node of regionPath.value) {
    nodes = (nodes.find((n) => n.id === node.id)?.children) || []
  }
  return nodes
})

const regionSearchResults = computed(() => {
  const key = regionSearchKey.value.trim().toLowerCase()
  if (!key) return []
  const out = []
  const walk = (nodes, pathNames) => {
    for (const n of nodes) {
      const path = [...pathNames, n.name]
      if (String(n.name).toLowerCase().includes(key)) out.push({ ...n, pathLabel: path.join(' / ') })
      if (n.children?.length) walk(n.children, path)
    }
  }
  walk(regionTree.value, [])
  return out.slice(0, 100)
})

// ==================== 规格模板 ====================
const specs = ref([])
const specDialog = ref(false)
const specForm = reactive({ id: null, name: '', optionsText: '', sort: 0 })

// ==================== 会员等级 ====================
const levels = ref([])
const levelDialog = ref(false)
const levelForm = reactive({
  id: null, name: '', minGrowth: 0, pointsRate: 1, discount: 10, freeShipping: false, sort: 0
})

// ==================== 配置组 ====================
const GROUPS = ['pay-method', 'banner', 'aftersale-reason', 'report-type', 'sensitive-word', 'points-rule', 'dividend', 'discount', 'service-guarantee', 'audit-reject-reason', 'aftersale-reject-reason', 'off-shelf-reason', 'shop-disable-reason', 'system']
const groups = reactive(Object.fromEntries(GROUPS.map((g) => [g, []])))

const PAY_DEFS = [
  { key: 'alipay', label: '支付宝', icon: '🔵' },
  { key: 'wechat', label: '微信支付', icon: '🟢' },
  { key: 'card', label: '银行卡', icon: '💳' }
]
const payForm = ref([])

// 服务保障：动态 key 行（与支付方式同模型，key 可增删）
const guaranteeForm = ref([])

const pointsForm = reactive({ 'earn-amount-per-point': 1, 'mall-rate': 1, 'review-reward': 10 })
const dividendForm = reactive({ 'platform-ratio': 15 })
const discountForm = reactive({
  'promotion-coupon-stackable': true,
  'multi-coupon-enabled': true,
  'max-coupons-per-order': 3
})

const DEFAULT_BANNERS = [
  { title: '双 11 全球狂欢节', subtitle: '每满 300 减 50 · 上不封顶', color: 'linear-gradient(90deg,#ff416c,#ff4b2b)', link: '/products' },
  { title: '数码焕新季', subtitle: '手机数码 满 2000 减 200', color: 'linear-gradient(90deg,#396afc,#2948ff)', link: '/products' },
  { title: '生鲜秒杀日', subtitle: '爆款生鲜 5 折起 每日 10 点开抢', color: 'linear-gradient(90deg,#11998e,#38ef7d)', link: '/products' }
]
const banners = ref([])
let bannerSeq = 0

const LIST_GROUPS = [
  { group: 'aftersale-reason', label: '售后原因', tip: '买家申请售后时可选择的理由。', placeholder: '输入售后原因' },
  { group: 'report-type', label: '举报类型', tip: '买家举报商品/店铺时可选择的类型。', placeholder: '输入举报类型' },
  { group: 'sensitive-word', label: '敏感词', tip: '商品评价等内容命中敏感词时会被拦截。', placeholder: '输入敏感词' },
  { group: 'audit-reject-reason', label: '审核驳回原因', tip: '审核中心驳回（商品上架/活动/物流入驻两级）与商家入驻驳回时的原因类别；选择类别后仍需填写详细原因。', placeholder: '输入驳回原因类别' },
  { group: 'aftersale-reject-reason', label: '售后拒绝原因', tip: '商家拒绝售后、平台拒绝售后时的原因类别；选择类别后仍需填写详细原因。', placeholder: '输入拒绝原因类别' },
  { group: 'off-shelf-reason', label: '下架原因', tip: '商家或平台下架商品时的原因类别；选择类别后仍需填写详细原因。', placeholder: '输入下架原因类别' },
  { group: 'shop-disable-reason', label: '停用原因', tip: '平台停用店铺时的原因类别；选择类别后仍需填写详细原因。', placeholder: '输入停用原因类别' }
]
const listState = reactive(Object.fromEntries(LIST_GROUPS.map((l) => [l.group, []])))
const listInput = reactive(Object.fromEntries(LIST_GROUPS.map((l) => [l.group, ''])))

const systemForm = reactive({
  platformName: '',
  servicePhone: '',
  serviceHours: '',
  freeShippingThreshold: 0,
  orderTimeoutMinutes: 30
})

const DESCRIPTIONS = {
  'pay-method': {
    alipay: '支付宝', wechat: '微信支付', card: '银行卡'
  },
  banner: { default: '首页 Banner' },
  discount: {
    'promotion-coupon-stackable': '活动与优惠券是否允许同享',
    'multi-coupon-enabled': '是否允许一单叠加多张优惠券',
    'max-coupons-per-order': '单笔订单最多可叠加的优惠券张数'
  },
  'aftersale-reason': { default: '售后原因' },
  'report-type': { default: '举报类型' },
  'sensitive-word': { default: '敏感词' },
  'audit-reject-reason': { default: '审核驳回原因' },
  'aftersale-reject-reason': { default: '售后拒绝原因' },
  'off-shelf-reason': { default: '商品下架原因' },
  'shop-disable-reason': { default: '店铺停用原因' },
  'service-guarantee': {},
  'points-rule': {
    'earn-amount-per-point': '每消费多少元累计 1 积分',
    'mall-rate': '积分商城倍数：积分价 = 原价 × 倍数',
    'review-reward': '发表评价奖励积分'
  },
  system: {
    platformName: '平台名称',
    servicePhone: '客服电话',
    serviceHours: '客服服务时间',
    freeShippingThreshold: '包邮门槛（元）',
    orderTimeoutMinutes: '待支付订单自动取消时间（分钟）'
  }
}

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [specRes, levelRes] = await Promise.all([
      fetchSpecs().catch(() => null),
      fetchMemberLevels().catch(() => null)
    ])
    specs.value = specRes?.data || []
    levels.value = levelRes?.data || []
    await Promise.all(GROUPS.map(loadGroup))
    hydrate()
  } finally {
    loading.value = false
  }
}

async function loadGroup(group) {
  try {
    const res = await fetchConfig(group)
    groups[group] = res.data || []
  } catch {
    groups[group] = []
  }
}

async function loadLevels() {
  try {
    const res = await fetchMemberLevels()
    levels.value = res.data || []
  } catch { /* 提示由拦截器统一处理 */ }
}

function valueOf(group, key, fallback = '') {
  const item = (groups[group] || []).find((i) => i.key === key)
  return item && item.value != null && item.value !== '' ? item.value : fallback
}

function numberOr(raw, fallback) {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function hydrate() {
  payForm.value = PAY_DEFS.map((def) => {
    const parsed = parseConfigJson(valueOf('pay-method', def.key, ''), {})
    return {
      ...def,
      name: parsed?.name || def.label,
      enabled: parsed?.enabled !== false
    }
  })

  pointsForm['earn-amount-per-point'] = numberOr(valueOf('points-rule', 'earn-amount-per-point', '1'), 1)
  pointsForm['mall-rate'] = numberOr(valueOf('points-rule', 'mall-rate', '1'), 1)
  pointsForm['review-reward'] = numberOr(valueOf('points-rule', 'review-reward', '10'), 10)

  dividendForm['platform-ratio'] = numberOr(valueOf('dividend', 'platform-ratio', '15'), 15)

  discountForm['promotion-coupon-stackable'] = valueOf('discount', 'promotion-coupon-stackable', 'true') !== 'false'
  discountForm['multi-coupon-enabled'] = valueOf('discount', 'multi-coupon-enabled', 'true') !== 'false'
  discountForm['max-coupons-per-order'] = numberOr(valueOf('discount', 'max-coupons-per-order', '3'), 3)

  systemForm.platformName = valueOf('system', 'platformName', 'myShop 电商购物平台')
  systemForm.servicePhone = valueOf('system', 'servicePhone', '400-888-8888')
  systemForm.serviceHours = valueOf('system', 'serviceHours', '09:00-21:00')
  systemForm.freeShippingThreshold = numberOr(valueOf('system', 'freeShippingThreshold', '99'), 99)
  systemForm.orderTimeoutMinutes = numberOr(valueOf('system', 'orderTimeoutMinutes', '30'), 30)

  const bannerList = parseConfigJson(valueOf('banner', 'default', ''), [])
  banners.value = (Array.isArray(bannerList) && bannerList.length ? bannerList : DEFAULT_BANNERS)
    .map((b) => ({ ...b, id: ++bannerSeq }))

  hydrateGuarantee()

  for (const { group } of LIST_GROUPS) {
    const parsed = parseConfigJson(valueOf(group, 'default', ''), [])
    listState[group] = Array.isArray(parsed) ? parsed : []
  }
}

async function saveGroup(group, values) {
  const existing = new Map((groups[group] || []).map((i) => [i.key, i.description || '']))
  const items = Object.entries(values).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
    description: existing.get(key) || DESCRIPTIONS[group]?.[key] || ''
  }))
  const res = await saveConfig(group, items)
  groups[group] = res.data || []
}

async function runSave(action, message) {
  saving.value = true
  try {
    await action()
    ElMessage.success(message)
  } finally {
    saving.value = false
  }
}

// ==================== 规格模板 ====================
function openSpec(row) {
  specForm.id = row?.id || null
  specForm.name = row?.name || ''
  specForm.optionsText = (row?.options || []).join('，')
  specForm.sort = row?.sort ?? 0
  specDialog.value = true
}

function parseOptions(text) {
  const seen = new Set()
  return String(text || '')
    .split(/[,，、;；\n]/)
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s) && seen.add(s))
}

/** 规格名称联想：来源为已有规格模板 */
function querySpecNames(query, cb) {
  const key = String(query || '').trim().toLowerCase()
  const seen = new Set()
  cb(specs.value
    .map((s) => s.name)
    .filter((n) => n && !seen.has(n) && seen.add(n))
    .filter((n) => !key || n.toLowerCase().includes(key))
    .map((n) => ({ value: n })))
}

/** 全部已用规格值（跨模板去重），弹窗中点击即可补全到输入框 */
const commonOptionValues = computed(() => {
  const seen = new Set()
  const out = []
  for (const s of specs.value) {
    for (const o of s.options || []) {
      if (o && !seen.has(o)) {
        seen.add(o)
        out.push(o)
      }
    }
  }
  return out.slice(0, 12)
})

/** 点击常用值：追加（去重）到规格值输入框 */
function appendOption(value) {
  const parts = parseOptions(specForm.optionsText)
  if (!parts.includes(value)) parts.push(value)
  specForm.optionsText = parts.join('，')
}

/** 列表类配置联想：来源为该组已有内容 */
function queryListValues(group, query, cb) {
  const key = String(query || '').trim().toLowerCase()
  cb((listState[group] || [])
    .filter((v) => !key || String(v).toLowerCase().includes(key))
    .map((v) => ({ value: v })))
}

/** 选中联想项后直接加入列表 */
function onListSelect(group) {
  addStr(group)
}

async function saveSpec() {
  const name = specForm.name.trim()
  const options = parseOptions(specForm.optionsText)
  if (!name) return ElMessage.warning('请输入规格名称')
  if (!options.length) return ElMessage.warning('请至少提供一个规格值')
  const payload = { name, options, sort: specForm.sort }
  dialogSaving.value = true
  try {
    if (specForm.id) await updateSpec(specForm.id, payload)
    else await createSpec(payload)
    ElMessage.success('规格模板已保存')
    specDialog.value = false
    const res = await fetchSpecs()
    specs.value = res.data || []
  } finally {
    dialogSaving.value = false
  }
}

async function removeSpec(row) {
  try {
    await ElMessageBox.confirm(`确定删除规格模板「${row.name}」？`, '提示', { type: 'warning' })
  } catch { return }
  await deleteSpec(row.id)
  ElMessage.success('已删除')
  const res = await fetchSpecs()
  specs.value = res.data || []
}

// ==================== 支付方式 ====================
function savePay() {
  if (!payForm.value.some((p) => p.enabled)) return ElMessage.warning('至少启用一种支付方式')
  const values = Object.fromEntries(payForm.value.map((p) => [
    p.key,
    JSON.stringify({ name: (p.name || '').trim() || p.label, enabled: p.enabled })
  ]))
  return runSave(() => saveGroup('pay-method', values), '支付方式已保存')
}

// ==================== 服务保障 ====================
function hydrateGuarantee() {
  guaranteeForm.value = (groups['service-guarantee'] || []).map((item) => {
    const parsed = parseConfigJson(item.value, {})
    return {
      key: item.key,
      name: parsed?.name || '',
      icon: parsed?.icon || '✅',
      enabled: parsed?.enabled !== false,
      persisted: true
    }
  })
}

function addGuarantee() {
  guaranteeForm.value.push({ key: '', name: '', icon: '✅', enabled: true, persisted: false })
}

async function removeGuarantee(row, index) {
  try {
    await ElMessageBox.confirm(
      `确定删除服务保障「${row.name || row.key}」？已选择该保障的商品将不再展示此项。`, '提示', { type: 'warning' }
    )
  } catch { return }
  if (row.persisted) {
    try {
      await deleteConfig('service-guarantee', row.key)
      await loadGroup('service-guarantee')
    } catch { /* 提示由拦截器统一处理 */ return }
  }
  guaranteeForm.value.splice(index, 1)
  ElMessage.success('已删除')
}

function saveGuarantee() {
  const rows = guaranteeForm.value
  if (!rows.length) return ElMessage.warning('请至少保留一项服务保障')
  const seen = new Set()
  for (const row of rows) {
    const key = String(row.key || '').trim()
    if (!key) return ElMessage.warning('服务保障 key 不能为空')
    if (!/^[a-z0-9-]+$/.test(key)) return ElMessage.warning(`key「${key}」仅支持小写字母、数字与短横线`)
    if (seen.has(key)) return ElMessage.warning(`key 重复：${key}`)
    seen.add(key)
    if (!String(row.name || '').trim()) return ElMessage.warning('服务保障名称不能为空')
  }
  const items = rows.map((row) => ({
    key: row.key.trim(),
    value: JSON.stringify({ name: row.name.trim(), icon: row.icon || '✅', enabled: row.enabled }),
    description: row.name.trim()
  }))
  return runSave(async () => {
    const res = await saveConfig('service-guarantee', items)
    groups['service-guarantee'] = res.data || []
    hydrateGuarantee()
  }, '服务保障已保存')
}

// ==================== 会员等级 ====================
function openLevel(row) {
  levelForm.id = row?.id || null
  levelForm.name = row?.name || ''
  levelForm.minGrowth = row?.minGrowth ?? 0
  levelForm.pointsRate = row?.pointsRate ?? 1
  levelForm.discount = row?.discount ?? 10
  levelForm.freeShipping = !!row?.freeShipping
  levelForm.sort = row?.sort ?? 0
  levelDialog.value = true
}

async function saveLevel() {
  const name = levelForm.name.trim()
  if (!name) return ElMessage.warning('请输入等级名称')
  const payload = {
    name,
    minGrowth: levelForm.minGrowth,
    pointsRate: levelForm.pointsRate,
    discount: levelForm.discount,
    freeShipping: levelForm.freeShipping,
    sort: levelForm.sort
  }
  dialogSaving.value = true
  try {
    if (levelForm.id) await updateMemberLevel(levelForm.id, payload)
    else await createMemberLevel(payload)
    ElMessage.success('会员等级已保存')
    levelDialog.value = false
    await loadLevels()
  } finally {
    dialogSaving.value = false
  }
}

async function removeLevel(row) {
  try {
    await ElMessageBox.confirm(`确定删除会员等级「${row.name}」？`, '提示', { type: 'warning' })
  } catch { return }
  await deleteMemberLevel(row.id)
  ElMessage.success('已删除')
  await loadLevels()
}

// ==================== 积分规则 ====================
function savePoints() {
  return runSave(() => saveGroup('points-rule', {
    'earn-amount-per-point': pointsForm['earn-amount-per-point'],
    'mall-rate': pointsForm['mall-rate'],
    'review-reward': pointsForm['review-reward']
  }), '积分规则已保存')
}

// ==================== 分红规则 ====================
function saveDividend() {
  return runSave(() => saveGroup('dividend', {
    'platform-ratio': dividendForm['platform-ratio']
  }), '分红规则已保存')
}

function saveDiscount() {
  const maxCoupons = Math.max(1, Math.floor(discountForm['max-coupons-per-order'] || 1))
  return runSave(() => saveGroup('discount', {
    'promotion-coupon-stackable': discountForm['promotion-coupon-stackable'] ? 'true' : 'false',
    'multi-coupon-enabled': discountForm['multi-coupon-enabled'] ? 'true' : 'false',
    'max-coupons-per-order': maxCoupons
  }), '折扣规则已保存')
}

// ==================== Banner ====================
function addBanner() {
  banners.value.push({
    id: ++bannerSeq,
    title: '新 Banner',
    subtitle: '',
    color: 'linear-gradient(90deg,#ff416c,#ff4b2b)',
    link: '/products'
  })
}

function saveBanners() {
  if (!banners.value.length) return ElMessage.warning('请至少保留一个 Banner')
  if (banners.value.some((b) => !String(b.title || '').trim())) {
    return ElMessage.warning('Banner 标题不能为空')
  }
  const values = {
    default: JSON.stringify(banners.value.map((b) => ({
      title: b.title,
      subtitle: b.subtitle,
      color: b.color,
      link: b.link
    })))
  }
  return runSave(() => saveGroup('banner', values), 'Banner 已保存，买家首页已同步')
}

// ==================== 售后原因 / 举报类型 / 敏感词 ====================
function addStr(group) {
  const value = String(listInput[group] || '').trim()
  if (!value) return
  if (!listState[group].includes(value)) listState[group].push(value)
  listInput[group] = ''
}

function removeStr(group, item) {
  listState[group] = listState[group].filter((s) => s !== item)
}

function saveList(group) {
  return runSave(
    () => saveGroup(group, { default: JSON.stringify(listState[group]) }),
    '配置已保存'
  )
}

// ==================== 系统参数 ====================
function saveSystem() {
  if (!systemForm.platformName.trim()) return ElMessage.warning('请输入平台名称')
  return runSave(() => saveGroup('system', {
    platformName: systemForm.platformName.trim(),
    servicePhone: systemForm.servicePhone.trim(),
    serviceHours: systemForm.serviceHours.trim(),
    freeShippingThreshold: systemForm.freeShippingThreshold,
    orderTimeoutMinutes: systemForm.orderTimeoutMinutes
  }), '系统参数已保存')
}

// ==================== 区域配置 ====================
async function onTabChange(name) {
  if (name === 'regions' && !regionTree.value.length) await loadRegions()
}

async function loadRegions() {
  try {
    const res = await fetchRegionAdminTree()
    regionTree.value = res.data || []
  } catch { /* 提示由拦截器统一处理 */ }
}

/** 在完整树里找某节点的路径（含自身） */
function findRegionPath(targetId, nodes = regionTree.value, trail = []) {
  for (const n of nodes) {
    const next = [...trail, n]
    if (n.id === targetId) return next
    if (n.children?.length) {
      const found = findRegionPath(targetId, n.children, next)
      if (found) return found
    }
  }
  return null
}

function enterRegion(row) {
  regionSearchKey.value = ''
  regionPath.value = [...regionPath.value, row]
}

/** 搜索结果「进入」：直接跳到该节点所在层级 */
function gotoRegion(row) {
  regionSearchKey.value = ''
  regionPath.value = findRegionPath(row.id) || []
}

function openRegion(parentRow, editRow) {
  if (editRow) {
    regionForm.id = editRow.id
    regionForm.name = editRow.name
    const trail = findRegionPath(editRow.id) || []
    regionForm.parentPathIds = trail.slice(0, -1).map((n) => n.id)
  } else {
    regionForm.id = null
    regionForm.name = ''
    const trail = parentRow ? findRegionPath(parentRow.id) || [] : regionPath.value
    regionForm.parentPathIds = trail.map((n) => n.id)
  }
  regionDialog.value = true
}

async function saveRegion() {
  const name = regionForm.name.trim()
  if (!name) return ElMessage.warning('请输入区域名称')
  if (!regionForm.id && regionForm.parentPathIds.length >= 2) {
    return ElMessage.warning('行政区划最多三级，上级最多选到市级')
  }
  dialogSaving.value = true
  try {
    const payload = { parentId: regionForm.parentPathIds.at(-1) || 0, name }
    if (regionForm.id) {
      await renameRegion(regionForm.id, payload)
      ElMessage.success('区域名称已更新')
    } else {
      await createRegion(payload)
      ElMessage.success('区域已新增')
    }
    regionDialog.value = false
    await loadRegions()
  } finally {
    dialogSaving.value = false
  }
}

async function toggleRegion(row) {
  const next = row.status === 0 ? 1 : 0
  await setRegionStatus(row.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已停用，地址选择器不再展示该区域及下级')
  await loadRegions()
}

async function removeRegion(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？存在下级区域时需先删除下级。`, '提示', { type: 'warning' })
  } catch { return }
  await deleteRegion(row.id)
  ElMessage.success('已删除')
  // 删除的可能正是导航路径上的节点，重建路径（找不到则回退到其上级）
  await loadRegions()
  const trail = findRegionPath(row.id)
  if (!trail) regionPath.value = regionPath.value.filter((n) => n.id !== row.id)
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
}
.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 16px;
}
.foot {
  margin-top: 16px;
  text-align: right;
}
.narrow {
  max-width: 560px;
}
.inline-num {
  width: 130px;
  margin: 0 8px;
}
.unit {
  margin-left: 8px;
  color: #606266;
}
.mr6 {
  margin-right: 6px;
}
.banner-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px dashed #eee;
}
.banner-preview {
  width: 240px;
  height: 86px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 18px;
  gap: 6px;
  flex: none;
}
.banner-preview span {
  font-size: 12px;
  opacity: 0.9;
}
.banner-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.str-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 40px;
  margin-bottom: 16px;
}
.str-add {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quick-chips {
  margin-top: 6px;
  line-height: 1.8;
}
.chip-label {
  font-size: 12px;
  color: #999;
  margin-right: 6px;
}
.chip {
  cursor: pointer;
  margin-right: 6px;
}
</style>
