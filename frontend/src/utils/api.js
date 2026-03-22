import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  // Let the browser set the multipart boundary for FormData uploads.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

// On 401 - clear stored data and go to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
