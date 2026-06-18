const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:18033/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let message = ''
    try {
      const errorData = await response.json()
      if (typeof errorData === 'object') {
        const messages = []
        for (const key of Object.keys(errorData)) {
          const value = errorData[key]
          if (Array.isArray(value)) {
            messages.push(...value)
          } else if (typeof value === 'string') {
            messages.push(value)
          }
        }
        message = messages.join('；') || errorData.detail || ''
      } else if (typeof errorData === 'string') {
        message = errorData
      }
    } catch {
      try {
        message = await response.text()
      } catch {
        message = ''
      }
    }
    throw new Error(message || `请求失败（状态码：${response.status}）`)
  }

  if (response.status === 204) {
    return null
  }
  return response.json()
}

export const api = {
  listLicenses: (params = {}) => request(`/licenses/?${new URLSearchParams(params)}`),
  createLicense: (data) => request('/licenses/', { method: 'POST', body: JSON.stringify(data) }),
  updateLicense: (id, data) => request(`/licenses/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  listBorrowRecords: (params = {}) => request(`/borrow-records/?${new URLSearchParams(params)}`),
  createBorrowRecord: (data) => request('/borrow-records/', { method: 'POST', body: JSON.stringify(data) }),
  updateBorrowRecord: (id, data) => request(`/borrow-records/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  stats: () => request('/stats/'),
  departmentStats: () => request('/department-stats/'),
}
