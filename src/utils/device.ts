const DEVICE_ID_KEY = 'condominio_device_id'

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = createDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}

export function getDeviceHeaders() {
  return {
    'X-Device-Id': getDeviceId(),
  }
}
