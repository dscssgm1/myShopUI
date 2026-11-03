<template>
  <div class="page-card">
    <h3>👤 个人信息</h3>

    <!-- 会员卡片 -->
    <div v-if="member" class="member-card">
      <div class="m-level">{{ member.levelName }}</div>
      <div class="m-points">积分 {{ member.points }}</div>
      <div class="m-growth">
        成长值 {{ member.growth }}
        <template v-if="member.nextLevelGrowth">
          （距下一等级还差 {{ member.nextLevelGrowth - member.growth }}）
        </template>
      </div>
      <el-progress
        v-if="member.nextLevelGrowth"
        :percentage="growthPercent" :stroke-width="6" :show-text="false"
        color="#6b4a00" class="m-bar"
      />
    </div>

    <el-form :model="form" label-width="90px" style="max-width: 480px; margin-top: 16px">
      <el-form-item label="用户名">
        <el-input v-model="form.username" disabled />
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-model="form.nickname" maxlength="50" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="11" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" disabled placeholder="邮箱修改需邮箱验证码，暂未开放" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMe, fetchMemberProfile, updateProfile } from '../../api/user'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()
const member = ref(null)
const saving = ref(false)
const form = reactive({ username: '', nickname: '', phone: '', email: '' })

const growthPercent = computed(() => {
  if (!member.value?.nextLevelGrowth) return 100
  return Math.min(100, Math.round(((member.value.growth || 0) / member.value.nextLevelGrowth) * 100))
})

onMounted(async () => {
  fetchMemberProfile().then((res) => (member.value = res.data)).catch(() => {})
  try {
    const res = await fetchMe()
    Object.assign(form, {
      username: res.data?.username || '',
      nickname: res.data?.nickname || '',
      phone: res.data?.phone || '',
      email: res.data?.email || ''
    })
  } catch { /* ignore */ }
})

async function save() {
  if (!form.nickname.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  if (form.phone && !/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('手机号需为 11 位')
    return
  }
  saving.value = true
  try {
    await updateProfile({ nickname: form.nickname.trim(), phone: form.phone || null })
    ElMessage.success('个人信息已保存')
    // 同步顶栏与本地缓存中的昵称
    if (userStore.user) {
      userStore.user.nickname = form.nickname.trim()
      localStorage.setItem('myshop_user', JSON.stringify(userStore.user))
    }
  } catch { /* 后端已提示 */ } finally {
    saving.value = false
  }
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
  margin-bottom: 8px;
}
.member-card {
  background: linear-gradient(135deg, #ffd89b, #f6c043);
  border-radius: 12px;
  padding: 20px;
  color: #6b4a00;
  margin-bottom: 16px;
}
.m-level {
  font-size: 22px;
  font-weight: 700;
}
.m-points {
  font-size: 14px;
  margin-top: 6px;
}
.m-growth {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}
.m-bar {
  margin-top: 10px;
  max-width: 320px;
}
</style>
