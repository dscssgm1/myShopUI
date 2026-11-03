<template>
  <el-card shadow="never">
    <template #header><b>系统日志</b></template>

    <el-tabs v-model="tab" @tab-change="load">
      <el-tab-pane label="操作日志" name="operation">
        <el-table :data="rows" size="small" v-loading="loading">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="userName" label="操作人" width="120" />
          <el-table-column prop="action" label="操作" width="120" />
          <el-table-column prop="module" label="模块" width="120" />
          <el-table-column prop="detail" label="详情" min-width="260" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="登录日志" name="login">
        <el-table :data="rows" size="small">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="username" label="用户" width="150" />
          <el-table-column prop="method" label="方式" width="110" />
          <el-table-column prop="ip" label="IP" width="150" />
          <el-table-column prop="result" label="结果" min-width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="系统日志" name="system">
        <el-table :data="rows" size="small">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="level" label="级别" width="90" />
          <el-table-column prop="module" label="模块" width="120" />
          <el-table-column prop="message" label="消息" min-width="320" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchLoginLogs, fetchOperationLogs, fetchSystemLogs } from '../../api/admin'

const tab = ref('operation')
const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 20
const loading = ref(false)

onMounted(load)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '')

async function load() {
  loading.value = true
  const map = { operation: fetchOperationLogs, login: fetchLoginLogs, system: fetchSystemLogs }
  try {
    const res = await map[tab.value]({ page: page.value, size })
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { rows.value = [] } finally { loading.value = false }
}
</script>
