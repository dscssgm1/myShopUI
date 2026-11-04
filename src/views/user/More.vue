<template>
  <div class="page-card">
    <h3>🧩 更多功能</h3>
    <div class="func-grid">
      <!-- 物流入驻 -->
      <div class="func-card" :class="{ disabled: isPlatform }" @click="openApply('/user/logistics-apply')">
        <span class="func-icon">🚚</span>
        <div class="func-name">物流入驻</div>
        <div class="func-desc">申请入驻物流公司，承接平台运单</div>
        <el-tag size="small" :type="isPlatform ? 'info' : 'success'">
          {{ isPlatform ? '平台账号不可申请' : '可申请' }}
        </el-tag>
      </div>

      <!-- 积分商城 -->
      <div class="func-card" @click="$router.push('/points-mall')">
        <span class="func-icon">🎁</span>
        <div class="func-name">积分商城</div>
        <div class="func-desc">用积分兑换优惠券，下单还能抵现</div>
        <el-tag size="small" type="success">可兑换</el-tag>
      </div>
      <div class="func-card" :class="{ disabled: isPlatform }" @click="openApply('/user/merchant-apply')">
        <span class="func-icon">🏪</span>
        <div class="func-name">商家入驻</div>
        <div class="func-desc">申请开店，成为平台商家</div>
        <el-tag size="small" :type="isPlatform ? 'info' : 'success'">
          {{ isPlatform ? '平台账号不可申请' : '可申请' }}
        </el-tag>
      </div>
      <div class="func-card disabled" @click="notReady('银行卡管理')">
        <span class="func-icon">💳</span>
        <div class="func-name">银行卡管理</div>
        <div class="func-desc">绑定提现银行卡，脱敏展示</div>
        <el-tag size="small" type="info">敬请期待</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../../store/user'

const router = useRouter()
const userStore = useUserStore()

// 平台方账号不开放入驻申请，对应入口置灰
const isPlatform = computed(() => userStore.user?.groupCode === 'PLATFORM')

function openApply(path) {
  if (isPlatform.value) {
    ElMessage.info('平台账号不能申请入驻')
    return
  }
  router.push(path)
}

function notReady(name) {
  ElMessage.info(`${name}功能即将上线，敬请期待`)
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 16px;
}
.func-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.func-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.func-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
}
.func-card.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.func-card.disabled:hover {
  box-shadow: none;
  transform: none;
}
.func-icon {
  font-size: 34px;
}
.func-name {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 4px;
}
.func-desc {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}
</style>
