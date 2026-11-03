<template>
  <div class="page-card">
    <div class="head">
      <h3>💳 银行卡管理</h3>
      <el-button type="danger" size="small" @click="dialog = true">＋ 添加银行卡</el-button>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && !list.length" description="暂未绑定银行卡" />
      <div v-for="card in list" :key="card.id" class="card-item" :style="{ background: bankColor(card.bankName) }">
        <div class="card-top">
          <span class="bank-name">{{ card.bankName }}</span>
          <span class="card-type">{{ card.cardType }}</span>
        </div>
        <div class="card-no">{{ card.cardNo }}</div>
        <div class="card-bottom">
          <span>{{ card.holder }}</span>
          <el-button link size="small" class="unbind" @click="unbind(card)">解绑</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialog" title="添加银行卡" width="440px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="所属银行" prop="bankName">
          <el-select v-model="form.bankName" placeholder="请选择银行" style="width: 100%">
            <el-option v-for="b in banks" :key="b" :label="b" :value="b" />
          </el-select>
        </el-form-item>
        <el-form-item label="卡号" prop="cardNo">
          <el-input v-model="form.cardNo" maxlength="19" placeholder="请输入 16-19 位银行卡号" />
        </el-form-item>
        <el-form-item label="卡片类型" prop="cardType">
          <el-radio-group v-model="form.cardType">
            <el-radio value="储蓄卡">储蓄卡</el-radio>
            <el-radio value="信用卡">信用卡</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="持卡人" prop="holder">
          <el-input v-model="form.holder" placeholder="请输入持卡人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="save">绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addBankCard, fetchBankCards, removeBankCard } from '../../api/user'

const BANK_COLORS = {
  招商银行: '#e60012',
  工商银行: '#c7000b',
  建设银行: '#0066b3',
  农业银行: '#009c6c',
  中国银行: '#a41e22',
  交通银行: '#00329b',
  浦发银行: '#005bac',
  中信银行: '#d62027'
}
const banks = Object.keys(BANK_COLORS)

const list = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({ bankName: '', cardNo: '', cardType: '储蓄卡', holder: '' })
const rules = {
  bankName: [{ required: true, message: '请选择所属银行', trigger: 'change' }],
  cardNo: [
    { required: true, message: '请输入银行卡号', trigger: 'blur' },
    { pattern: /^\d{16,19}$/, message: '卡号为 16-19 位数字', trigger: 'blur' }
  ],
  holder: [{ required: true, message: '请输入持卡人姓名', trigger: 'blur' }]
}

onMounted(load)

const bankColor = (name) => BANK_COLORS[name] || '#5a6d9c'

async function load() {
  loading.value = true
  try {
    const res = await fetchBankCards()
    list.value = res.data || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    await addBankCard({ ...form })
    ElMessage.success('银行卡绑定成功')
    dialog.value = false
    form.bankName = ''
    form.cardNo = ''
    form.cardType = '储蓄卡'
    form.holder = ''
    load()
  } catch { /* 后端已提示 */ } finally {
    saving.value = false
  }
}

async function unbind(card) {
  try {
    await ElMessageBox.confirm(`确定解绑 ${card.bankName}（${card.cardNo}）吗？`, '解绑银行卡', {
      confirmButtonText: '解绑',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await removeBankCard(card.id)
    ElMessage.success('已解绑')
    load()
  } catch { /* 后端已提示 */ }
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
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
.card-item {
  color: #fff;
  border-radius: 12px;
  padding: 18px 22px;
  margin-bottom: 14px;
  max-width: 460px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.card-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  opacity: 0.9;
}
.bank-name {
  font-weight: 600;
}
.card-no {
  font-size: 22px;
  letter-spacing: 3px;
  margin: 18px 0;
  font-family: 'Courier New', monospace;
}
.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
}
.unbind {
  color: rgba(255, 255, 255, 0.85);
}
.unbind:hover {
  color: #fff;
}
</style>
