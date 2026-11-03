<template>
  <div class="chat-page">
    <div class="chat-head">
      <el-button link @click="$router.push('/user/messages')"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
      <span class="avatar">{{ session?.session?.shopIcon || '💬' }}</span>
      <div class="info">
        <div class="name">{{ session?.session?.type === 'PLATFORM' ? '平台客服' : (session?.session?.shopName + '客服') }}</div>
        <div class="sub">{{ session?.session?.type === 'PLATFORM' ? '退款、投诉、平台规则咨询' : '商品 / 物流 / 售后咨询' }}</div>
      </div>
    </div>

    <div class="chat-body" ref="bodyRef">
      <div v-for="m in messages" :key="m.id" class="msg-row" :class="m.senderType === 'BUYER' ? 'me' : 'cs'">
        <div class="bubble">{{ m.content }}</div>
      </div>
      <el-empty v-if="!messages.length" description="开始咨询吧" :image-size="60" />
    </div>

    <div class="chat-input">
      <el-input v-model="text" placeholder="输入消息，按回车发送…" @keyup.enter="send" />
      <el-button type="primary" @click="send">发送</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchSessionDetail, readSession, sendMessage } from '../api/message'

const route = useRoute()
const session = ref(null)
const text = ref('')
const bodyRef = ref()
const sending = ref(false)
let timer = null

const messages = computed(() => session.value?.messages || [])

onMounted(() => {
  load()
  timer = setInterval(refresh, 5000)
})
onBeforeUnmount(() => clearInterval(timer))
watch(() => route.params.id, load)

async function load() {
  try {
    const res = await fetchSessionDetail(route.params.id)
    session.value = res.data
    await readSession(route.params.id)
    scrollBottom()
  } catch { session.value = null }
}

function scrollBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// 轮询刷新会话：有新回复才滚动；发送中跳过，避免覆盖刚发出的消息
async function refresh() {
  if (sending.value) return
  try {
    const prevCount = messages.value.length
    const res = await fetchSessionDetail(route.params.id, { silent: true })
    session.value = res.data
    if ((res.data?.messages?.length || 0) > prevCount) {
      readSession(route.params.id).catch(() => {})
      scrollBottom()
    }
  } catch { /* ignore */ }
}

async function send() {
  const value = text.value.trim()
  if (!value) return
  sending.value = true
  try {
    const res = await sendMessage(route.params.id, value)
    session.value.messages.push(res.data)
    text.value = ''
    scrollBottom()
  } catch { /* ignore */ } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.chat-page {
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  height: 70vh;
  overflow: hidden;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f0f0;
}
.avatar {
  font-size: 28px;
}
.name {
  font-weight: 600;
}
.sub {
  font-size: 12px;
  color: #999;
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
.msg-row {
  display: flex;
}
.msg-row.me {
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
.msg-row.cs .bubble {
  background: #fff;
  border-top-left-radius: 4px;
}
.msg-row.me .bubble {
  background: #ff4b2b;
  color: #fff;
  border-top-right-radius: 4px;
}
.chat-input {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
