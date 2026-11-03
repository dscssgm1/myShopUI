<template>
  <div class="mall-page">
    <div class="mall-head">
      <h3>🎁 积分商城</h3>
      <div class="mall-meta">
        <span>我的积分：<b>{{ points }}</b></span>
        <span class="tip">商品积分价 = 原价 × 兑换倍率（订单完成后按实付 1 元得 1 积分，会员等级可加成）</span>
        <el-button size="small" plain @click="openExchanges">我的兑换</el-button>
      </div>
    </div>

    <el-empty v-if="!loading && !items.length" description="积分商城暂无商品" />

    <div v-loading="loading" class="mall-grid">
      <div v-for="i in items" :key="i.id" class="mall-item">
        <img v-if="i.productCoverImage" :src="i.productCoverImage" class="m-photo" alt="" />
        <div v-else class="m-img" :style="{ background: i.productColor }">{{ i.productEmoji }}</div>
        <div class="m-name">{{ i.productName }}</div>
        <div class="m-shop">🏪 {{ i.shopName }}</div>
        <div class="m-price">¥{{ i.productPrice }}</div>
        <div class="m-points">{{ i.pointsPrice }} 积分</div>
        <el-button
          type="danger" size="small"
          :disabled="!loggedIn || points < i.pointsPrice"
          @click="openExchange(i)"
        >{{ !loggedIn ? '登录后兑换' : points >= i.pointsPrice ? '立即兑换' : '积分不足' }}</el-button>
      </div>
    </div>

    <!-- 兑换下单：填写收货信息，生成免支付真实订单 -->
    <el-dialog v-model="dialog.visible" title="积分兑换" width="440px">
      <div class="ex-item">
        <img v-if="dialog.item?.productCoverImage" :src="dialog.item.productCoverImage" class="ex-photo" alt="" />
        <span v-else class="ex-emoji" :style="{ background: dialog.item?.productColor }">{{ dialog.item?.productEmoji }}</span>
        <div class="ex-info">
          <div class="ex-name">{{ dialog.item?.productName }}</div>
          <div class="ex-cost">消耗 <b>{{ dialog.item?.pointsPrice }}</b> 积分</div>
        </div>
      </div>
      <el-form label-width="80px">
        <el-form-item label="收货人" required>
          <el-input v-model="form.receiverName" maxlength="50" placeholder="收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.receiverPhone" maxlength="11" placeholder="11 位手机号" />
        </el-form-item>
        <el-form-item label="收货地址" required>
          <el-input v-model="form.receiverAddress" type="textarea" :rows="2" placeholder="省市区 + 详细地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="danger" :loading="dialog.submitting" @click="submitExchange">确认兑换</el-button>
      </template>
    </el-dialog>

    <!-- 我的兑换记录 -->
    <el-drawer v-model="drawer.visible" title="我的兑换记录" size="420px">
      <el-empty v-if="!drawer.list.length" description="还没有兑换记录" />
      <div v-for="e in drawer.list" :key="e.id" class="ex-record">
        <img v-if="e.itemCover" :src="e.itemCover" class="ex-photo" alt="" />
        <span v-else class="ex-emoji" :style="{ background: '#f7f8fa' }">{{ e.itemEmoji }}</span>
        <div class="ex-info">
          <div class="ex-name">{{ e.itemName }}</div>
          <div class="ex-meta">
            <span>{{ e.createdAt }}</span>
            <span class="ex-points">-{{ e.points }} 积分</span>
          </div>
          <div class="ex-order">
            订单：<a @click="$router.push('/user/orders')">{{ e.orderNo }}</a>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { fetchAddresses, fetchMemberProfile, fetchPointsMallItems, exchangePointsItem, fetchMyExchanges } from '../api/user'

const router = useRouter()
const userStore = useUserStore()
const loggedIn = computed(() => userStore.isLogin)

const loading = ref(false)
const items = ref([])
const points = ref(0)

onMounted(() => {
  loadItems()
  if (loggedIn.value) {
    loadPoints()
  }
})

function loadItems() {
  loading.value = true
  fetchPointsMallItems()
    .then((res) => (items.value = res.data || []))
    .catch(() => {})
    .finally(() => (loading.value = false))
}

function loadPoints() {
  fetchMemberProfile({ silent: true })
    .then((res) => (points.value = res.data?.points || 0))
    .catch(() => {})
}

const dialog = reactive({ visible: false, item: null, submitting: false })
const form = reactive({ receiverName: '', receiverPhone: '', receiverAddress: '' })

async function openExchange(item) {
  if (!loggedIn.value) {
    router.push({ name: 'login', query: { redirect: '/points-mall' } })
    return
  }
  dialog.item = item
  dialog.visible = true
  // 首次打开用默认收货地址预填，失败静默（用户可手填）
  if (!form.receiverName) {
    try {
      const res = await fetchAddresses({ silent: true })
      const def = (res.data || []).find((a) => a.isDefault) || (res.data || [])[0]
      if (def) {
        form.receiverName = def.receiverName
        form.receiverPhone = def.receiverPhone
        form.receiverAddress = def.address
      }
    } catch { /* 预填失败不阻塞 */ }
  }
}

function submitExchange() {
  if (!form.receiverName.trim() || !/^1\d{10}$/.test(form.receiverPhone) || !form.receiverAddress.trim()) {
    ElMessage.warning('请完整填写收货人、11 位手机号和收货地址')
    return
  }
  dialog.submitting = true
  exchangePointsItem({
    itemId: dialog.item.id,
    receiverName: form.receiverName.trim(),
    receiverPhone: form.receiverPhone,
    receiverAddress: form.receiverAddress.trim()
  })
    .then((res) => {
      dialog.visible = false
      ElMessage.success(`兑换成功，已生成订单 ${res.data?.orderNo}，商家将尽快发货`)
      loadPoints()
      loadDrawer()
    })
    .finally(() => (dialog.submitting = false))
}

const drawer = reactive({ visible: false, list: [] })

function openExchanges() {
  drawer.visible = true
  loadDrawer()
}

function loadDrawer() {
  if (!loggedIn.value) return
  fetchMyExchanges({ silent: true })
    .then((res) => (drawer.list = res.data || []))
    .catch(() => {})
}
</script>

<style scoped>
.mall-page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 60vh;
}
.mall-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.mall-head h3 {
  margin: 0;
}
.mall-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mall-meta b {
  color: #ff4b2b;
  font-size: 20px;
}
.tip {
  font-size: 12px;
  color: #999;
}
.mall-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  min-height: 120px;
}
.mall-item {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}
.m-img {
  height: 120px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}
.m-photo {
  height: 120px;
  width: 100%;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}
.m-name {
  font-size: 13px;
  height: 36px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 8px 0 4px;
  text-align: left;
}
.m-shop {
  font-size: 12px;
  color: #999;
  text-align: left;
}
.m-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
  text-align: left;
  margin-top: 4px;
}
.m-points {
  color: #ff4b2b;
  font-weight: 700;
  font-size: 16px;
  margin: 6px 0;
}
.ex-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.ex-emoji {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}
.ex-photo {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.ex-name {
  font-size: 14px;
  font-weight: 600;
}
.ex-cost {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.ex-cost b {
  color: #ff4b2b;
}
.ex-record {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.ex-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #999;
  margin: 4px 0;
}
.ex-points {
  color: #ff4b2b;
}
.ex-order {
  font-size: 12px;
  color: #666;
}
.ex-order a {
  color: #396afc;
  cursor: pointer;
  word-break: break-all;
}
</style>
