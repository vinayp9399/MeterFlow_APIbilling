import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
      // Dispatch a custom event — PaymentModalProvider listens for it
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
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
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
