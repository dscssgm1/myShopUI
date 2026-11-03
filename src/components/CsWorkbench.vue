<template>
  <div class="cs-page">
    <el-card shadow="never">
      <template #header>
        <div class="head">
          <b>{{ platform ? '🛡️ 平台客服工作台' : '🎧 商家客服工作台' }}</b>
          <span class="tip">{{ platform ? '统一响应买家的平台咨询' : '响应本店铺买家的咨询' }}</span>
        </div>
      </template>

      <div class="layout">
        <div class="list">
          <div class="list-title">咨询会话（{{ sessions.length }}）</div>
          <el-empty v-if="!sessions.length" description="暂无咨询" :image-size="50" />
          <div
            v-for="s in sessions" :key="s.id" class="item"
            :class="{ on: s.id === activeId }" @click="select(s)"
          >
            <span class="avatar">{{ s.type === 'PLATFORM' ? '🙋' : (s.shopIcon || '🙋') }}</span>
            <div class="mid">
              <div class="name">{{ s.customerName || ('买家 #' + s.customerId) }}</div>
              <div class="preview">{{ s.lastContent || '暂无消息' }}</div>
            </div>
            <span v-if="s.csUnread" class="badge">{{ s.csUnread }}</span>
          </div>
        </div>

        <div class="chat">
          <div class="chat-body" ref="bodyRef">
            <el-empty v-if="!active" description="请选择左侧会话" :image-size="60" />
            <div v-for="m in messages" :key="m.id" class="row" :class="m.senderType === 'CS' ? 'mine' : 'other'">
              <div class="bubble">{{ m.content }}</div>
            </div>
          </div>
          <div class="chat-input">
            <el-input v-model="text" :disabled="!active" placeholder="输入回复，回车发送" @keyup.enter="reply" />
            <el-button type="primary" :disabled="!active" @click="reply">回复</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { csRead, csReply, fetchCsSessions, fetchSessionDetail } from '../api/message'

const props = defineProps({ platform: { type: Boolean, default: false } })

const sessions = ref([])
const detail = ref(null)
const activeId = ref('')
const text = ref('')
const bodyRef = ref()
const replying = ref(false)
let timer = null

const active = computed(() => detail.value?.session || null)
const messages = computed(() => detail.value?.messages || [])

onMounted(() => {
  load()
  timer = setInterval(refresh, 5000)
})
onBeforeUnmount(() => clearInterval(timer))

async function load() {
  try {
    const res = await fetchCsSessions(props.platform ? 'PLATFORM' : 'SHOP')
    sessions.value = res.data || []
    if (sessions.value.length) await select(sessions.value[0])
  } catch { sessions.value = [] }
}

async function select(session) {
  activeId.value = session.id
  try {
    const res = await fetchSessionDetail(session.id)
    detail.value = res.data
    await csRead(session.id)
    session.csUnread = 0
    scrollBottom()
  } catch { detail.value = null }
}

function scrollBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// 轮询刷新：会话列表 + 当前会话消息；保留选中状态，当前会话角标不清零
async function refresh() {
  if (replying.value) return
  try {
    const res = await fetchCsSessions(props.platform ? 'PLATFORM' : 'SHOP', undefined, { silent: true })
    sessions.value = (res.data || []).map((s) => (s.id === activeId.value ? { ...s, csUnread: 0 } : s))
    if (!activeId.value) {
      if (sessions.value.length) await select(sessions.value[0])
      return
    }
    const prevCount = messages.value.length
    const r = await fetchSessionDetail(activeId.value, { silent: true })
    detail.value = r.data
    if ((r.data?.messages?.length || 0) > prevCount) csRead(activeId.value).catch(() => {})
  } catch { /* ignore */ }
}

async function reply() {
  const value = text.value.trim()
  if (!value || !active.value || replying.value) return
  replying.value = true
  try {
    const res = await csReply(active.value.id, value)
    detail.value.messages.push(res.data)
    text.value = ''
    scrollBottom()
    ElMessage.success('已回复')
  } catch { /* ignore */ } finally {
    replying.value = false
  }
}

watch(() => messages.value.length, scrollBottom)
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.tip {
  font-size: 12px;
  color: #999;
}
.layout {
  display: flex;
  height: 62vh;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}
.list {
  width: 240px;
  border-right: 1px solid #eee;
  overflow-y: auto;
}
.list-title {
  padding: 12px 14px;
  font-size: 13px;
  color: #999;
  border-bottom: 1px solid #f2f2f2;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f7f7f7;
}
.item.on,
.item:hover {
  background: #fff8f6;
}
.avatar {
  font-size: 24px;
}
.mid {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 13px;
  font-weight: 600;
}
.preview {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.badge {
  background: #ff4b2b;
  color: #fff;
  font-size: 11px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
}
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.row {
  display: flex;
}
.row.mine {
  justify-content: flex-end;
}
.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
.row.other .bubble {
  background: #fff;
  border-top-left-radius: 4px;
}
.row.mine .bubble {
  background: #396afc;
  color: #fff;
  border-top-right-radius: 4px;
}
.chat-input {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid #f0f0f0;
}
</style>
