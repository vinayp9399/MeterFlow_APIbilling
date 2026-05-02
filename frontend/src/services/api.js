import axios from 'axios'

// In development: VITE_API_URL is empty, Vite proxy forwards /api/* to localhost:5000
// In production:  VITE_API_URL = https://meterflow-apibilling.onrender.com
const BASE_URL = `https://meterflow-apibilling.onrender.com/api`

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global response interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // 402 Payment Required — trigger payment modal
    if (error.response?.status === 402) {
      const data = error.response.data?.data
      window.dispatchEvent(new CustomEvent('meterflow:payment-required', {
        detail: {
          amount: data?.amount,
          month: data?.month,
          billingId: data?.billingId,
          totalRequests: data?.totalRequests,
          freeRequests: data?.freeRequests,
        }
      }))
      return Promise.reject(error)
    }

    // 401 — try refresh token
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api