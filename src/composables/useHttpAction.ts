import { ref } from 'vue'

export interface HttpActionResult {
  ok: boolean
  message: string
}

export function useHttpAction() {
  const loading = ref(false)
  const result = ref<HttpActionResult | null>(null)
  let resultTimeoutId: ReturnType<typeof setTimeout> | null = null

  const clearResult = () => {
    result.value = null
    if (resultTimeoutId) {
      clearTimeout(resultTimeoutId)
      resultTimeoutId = null
    }
  }

  const run = async (action: () => Promise<HttpActionResult>) => {
    clearResult()
    loading.value = true
    console.log('🔄 Loading iniciado, loading.value:', loading.value)

    try {
      const actionResult = await action()
      console.log('✅ Acción completada, esperando 1 segundo...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('⏰ Delay completado, mostrando resultado')
      result.value = actionResult
      loading.value = false
      console.log('🛑 Loading finalizado, loading.value:', loading.value)

      if (actionResult.ok) {
        resultTimeoutId = setTimeout(() => {
          result.value = null
        }, 5000)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      await new Promise(resolve => setTimeout(resolve, 1000))
      result.value = { ok: false, message: 'Error de red. Verifica que el servidor esté activo.' }
      loading.value = false
    }

    return result.value
  }

  return { loading, result, run, clearResult }
}
