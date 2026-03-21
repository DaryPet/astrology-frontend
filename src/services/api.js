import axios from 'axios'

const api = axios.create({
  // Use relative path for API (works with any domain)
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api
