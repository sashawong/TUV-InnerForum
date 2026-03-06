import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const isPublicAccess = window.location.hostname.includes('loca.lt')
const apiBaseURL = isPublicAccess ? 'https://forum-tuv.loca.lt/api' : '/api'

export const getFileUrl = (path: string): string => {
  if (isPublicAccess) {
    return `https://forum-tuv.loca.lt/uploads/${path}`
  }
  return `/uploads/${path}`
}

const api = axios.create({
  baseURL: apiBaseURL,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 如果不是 FormData，设置 Content-Type 为 application/json
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

export default api