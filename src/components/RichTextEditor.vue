<template>
  <div class="rte">
    <!-- 左栏：编辑器（工具栏 + 编辑区由 Quill 插入本栏内部，纵向堆叠） -->
    <div class="rte-editor-col">
      <div ref="editorHostRef"></div>
    </div>
    <!-- 右栏：实时预览，与编辑器等高、内部滚动 -->
    <div v-if="preview" class="rte-preview">
      <div class="rte-preview-head">👀 实时预览（买家「商品详情」页所见效果）</div>
      <div class="rte-preview-body">
        <div v-if="previewHtml" class="rich-detail" v-html="previewHtml"></div>
        <span v-else class="rte-empty">暂无内容，开始输入后此处实时呈现买家所见效果</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { uploadImage } from '../api/file'
import { sanitizeRichText } from '../utils/richtext'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '填写商品详情，支持图片、标题、文字样式等富文本内容' },
  /** 编辑区高度（预览栏与其等高） */
  height: { type: String, default: '380px' },
  /** 是否显示实时预览（样式与买家端商品详情页完全一致） */
  preview: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue'])

const editorHostRef = ref(null)
const previewHtml = ref('')
let quill = null

onMounted(() => {
  quill = new Quill(editorHostRef.value, {
    theme: 'snow',
    placeholder: props.placeholder,
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'link', 'image'],
          ['clean']
        ],
        handlers: { image: imageHandler }
      }
    }
  })
  if (props.modelValue) {
    quill.clipboard.dangerouslyPasteHTML(sanitizeRichText(props.modelValue))
  }
  quill.on('text-change', syncValue)
  syncValue()
})

onBeforeUnmount(() => {
  quill = null
})

/** 当前内容是否为空：无文本且无图片等嵌入内容（不依赖 quill.isEmpty，各版本兼容） */
function isEmptyContent() {
  const text = quill.getText().trim()
  const hasEmbed = quill.getContents().ops?.some((op) => op.insert != null && typeof op.insert === 'object')
  return !text && !hasEmbed
}

function currentHtml() {
  return isEmptyContent() ? '' : quill.root.innerHTML
}

/** 编辑内容变化：同步 v-model 与实时预览 */
function syncValue() {
  if (!quill) return
  previewHtml.value = currentHtml()
  emit('update:modelValue', previewHtml.value)
}

/** 工具栏图片按钮：复用文件服务上传，成功后插入图片 */
function imageHandler() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/gif,image/webp'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const res = await uploadImage(file)
      const range = quill.getSelection(true)
      const index = range == null ? 0 : range.index
      quill.insertEmbed(index, 'image', res.data.url, 'user')
      quill.setSelection(index + 1)
    } catch { /* 上传失败提示由拦截器统一处理 */ }
  }
  input.click()
}

// 外部回显（编辑弹窗打开回填详情）时同步进编辑器；与自身编辑内容相同则跳过，避免死循环
watch(() => props.modelValue, (value) => {
  if (!quill) return
  if ((value || '') === currentHtml()) return
  quill.clipboard.dangerouslyPasteHTML(sanitizeRichText(value || ''))
  syncValue()
})
</script>

<style scoped>
/* 左右双栏：编辑器与预览并排，各自内部滚动，不把页面撑高 */
.rte {
  display: flex;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}
.rte-editor-col {
  flex: 1;
  min-width: 0;
}
.rte :deep(.ql-toolbar) {
  border-radius: 6px 6px 0 0;
}
.rte :deep(.ql-container) {
  border-radius: 0 0 6px 6px;
  font-size: 14px;
}
.rte :deep(.ql-editor) {
  height: v-bind(height);
  overflow-y: auto;
}
.rte-preview {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}
.rte-preview-head {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: #999;
  background: #fafafa;
}
.rte-preview-body {
  flex: 1;
  padding: 4px 16px 12px;
  overflow-y: auto;
}
.rte-empty {
  color: #bbb;
  font-size: 12px;
}
</style>
