import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const uploadsBaseURL = import.meta.env.VITE_UPLOADS_BASE_URL || '/uploads'

export const getFileUrl = (path: string): string => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${uploadsBaseURL}/${path}`
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
