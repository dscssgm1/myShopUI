import request from './request'

/**
 * 上传图片到文件服务（MinIO）。
 * @param {File} file 图片文件
 * @returns {Promise<{url: string, objectName: string, originalName: string, size: number}>}
 */
export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000
  })
}

/**
 * 删除已上传的图片（按上传返回的 objectName 定位）。
 */
export function deleteImage(objectName) {
  return request.delete('/files', { params: { objectName } })
}
