<template>
  <el-dialog
    :model-value="modelValue"
    :title="address ? '编辑收货地址' : '新增收货地址'"
    width="480px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="收货人" required>
        <el-input v-model="form.receiverName" maxlength="50" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="form.receiverPhone" maxlength="11" />
      </el-form-item>
      <el-form-item label="所在地区" required>
        <el-cascader
          v-model="form.regionPath"
          :options="regionTree"
          :props="{ value: 'id', label: 'name', children: 'children', emitPath: true }"
          placeholder="请选择省 / 市 / 县区"
          style="width: 100%"
        />
        <div v-if="legacyAddress" class="legacy-tip">旧地址未能识别省市区，请重新选择后保存</div>
      </el-form-item>
      <el-form-item label="详细地址" required>
        <el-input v-model="form.detail" type="textarea" :rows="2" maxlength="200" placeholder="街道、门牌号、小区 / 楼栋等" />
      </el-form-item>
      <el-form-item label="设为默认">
        <el-switch v-model="form.isDefault" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createAddress, updateAddress } from '../api/user'
import { composeAddress, loadRegionTree, parseAddressText } from '../utils/region'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 编辑时传入地址对象，传 null 表示新增 */
  address: { type: Object, default: null },
  /** 新增时是否预勾选「设为默认」 */
  defaultFirst: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const form = reactive({ receiverName: '', receiverPhone: '', regionPath: [], detail: '', isDefault: false })
const regionTree = ref([])
const saving = ref(false)
const legacyAddress = ref(false)

watch(() => props.modelValue, async (open) => {
  if (!open) return
  regionTree.value = await loadRegionTree()
  const a = props.address
  if (a) {
    const parsed = parseAddressText(regionTree.value, a.address)
    legacyAddress.value = !parsed.path.length && !!a.address
    Object.assign(form, {
      receiverName: a.receiverName,
      receiverPhone: a.receiverPhone,
      regionPath: parsed.path,
      detail: parsed.detail,
      isDefault: !!a.isDefault
    })
  } else {
    legacyAddress.value = false
    Object.assign(form, {
      receiverName: '',
      receiverPhone: '',
      regionPath: [],
      detail: '',
      isDefault: props.defaultFirst
    })
  }
})

async function save() {
  if (!form.receiverName.trim() || !/^1\d{10}$/.test(form.receiverPhone)) {
    ElMessage.warning('请完整填写收货信息（手机号需 11 位且为 1 开头）')
    return
  }
  if (!form.regionPath.length) {
    ElMessage.warning('请选择所在地区（省 / 市 / 县区）')
    return
  }
  if (!form.detail.trim()) {
    ElMessage.warning('请填写详细地址')
    return
  }
  saving.value = true
  try {
    const payload = {
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone,
      address: composeAddress(regionTree.value, form.regionPath, form.detail),
      isDefault: form.isDefault
    }
    const res = props.address
      ? await updateAddress(props.address.id, payload)
      : await createAddress(payload)
    ElMessage.success(props.address ? '地址已更新' : '地址已添加')
    emit('update:modelValue', false)
    emit('saved', res.data)
  } catch { /* 后端已提示 */ } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.legacy-tip {
  color: #e6a23c;
  font-size: 12px;
  margin-top: 4px;
}
</style>
