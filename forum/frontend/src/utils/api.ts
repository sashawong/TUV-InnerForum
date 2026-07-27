import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const uploadsBaseURL = import.meta.env.VITE_UPLOADS_BASE_URL || '/uploads'

export const getFileUrl = (path: string): string => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${uploadsBaseURL}/${path}`
}

export const downloadWatermarkedAttachment = async (attachmentId: number, fallbackName: string): Promise<void> => {
  const response = await api.get(`/attachments/${attachmentId}/download-watermarked`, {
    responseType: 'blob',
  })

  const contentDisposition = response.headers['content-disposition'] || ''
  const encodedNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  const filename = encodedNameMatch ? decodeURIComponent(encodedNameMatch[1]) : fallbackName
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const previewWatermarkedAttachment = async (attachmentId: number): Promise<void> => {
  const previewWindow = window.open('', '_blank', 'noopener,noreferrer')
  const response = await api.get(`/attachments/${attachmentId}/preview-watermarked`, {
    responseType: 'blob',
  })

  const contentType = response.headers['content-type'] || 'application/octet-stream'
  const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))
  if (previewWindow) {
    previewWindow.location.href = url
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  }
}

const api = axios.create({
  baseURL: apiBaseURL,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

export default api
