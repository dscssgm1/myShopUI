<template>
  <div>
    <div class="image-upload">
      <div v-for="(url, i) in modelValue" :key="url" class="img-item">
        <el-image
          :src="url" fit="cover" class="img"
          :preview-src-list="modelValue" :initial-index="i" preview-teleported
        />
        <el-icon class="remove" @click="remove(i)"><Close /></el-icon>
      </div>
      <el-upload
        v-if="modelValue.length < limit"
        :show-file-list="false"
        accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
        :http-request="doUpload"
      >
        <div class="add-box">
          <el-icon v-if="!uploading"><Plus /></el-icon>
          <el-icon v-else class="is-loading"><Loading /></el-icon>
        </div>
      </el-upload>
    </div>
    <p class="tip">支持 jpg / png / gif / webp，单张 ≤ 5MB，最多 {{ limit }} 张</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Close, Loading, Plus } from '@element-plus/icons-vue'
import { uploadImage } from '../api/file'

const props = defineProps({
  /** 已上传的图片 URL 列表（v-model） */
  modelValue: { type: Array, default: () => [] },
  /** 最多张数，商品主图传 1 即可 */
  limit: { type: Number, default: 5 }
})
const emit = defineEmits(['update:modelValue'])
const uploading = ref(false)

async function doUpload({ file, onSuccess, onError }) {
  uploading.value = true
  try {
    const res = await uploadImage(file)
    emit('update:modelValue', [...props.modelValue, res.data.url])
    onSuccess(res.data)
  } catch (err) {
    onError(err)
  } finally {
    uploading.value = false
  }
}

function remove(index) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<style scoped>
.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}
.img-item {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
}
.img {
  width: 100%;
  height: 100%;
}
.remove {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 50%;
  padding: 2px;
  cursor: pointer;
}
.add-box {
  width: 96px;
  height: 96px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #909399;
  cursor: pointer;
}
.add-box:hover {
  border-color: #ff4b2b;
  color: #ff4b2b;
}
.tip {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}
</style>
