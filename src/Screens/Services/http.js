import { t } from '../../i18n/strings'

const DEFAULT_TIMEOUT = 15000

/**
 * Small fetch wrapper: JSON parse + timeout + friendly error messages.
 *
 * Every error it throws carries a `code` so callers can decide what happened
 * WITHOUT parsing message text (messages are translated per language):
 *   'http'    — the server answered with a non-2xx status
 *   'timeout' — no answer within the time limit
 *   'network' — no connection / DNS / reset / bad body
 */
export async function getJson(url, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined)
    if (!response.ok) {
      const params = { status: response.status }
      const error = new Error(t('err.http', params))
      error.code = 'http'
      error.key = 'err.http' // render par dobara t() se banta hai (zubaan badalne par)
      error.params = params
      throw error
    }
    return await response.json()
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const timeoutError = new Error(t('err.timeout'))
      timeoutError.code = 'timeout'
      timeoutError.key = 'err.timeout'
      throw timeoutError
    }
    if (error && error.code) throw error // already coded above
    const networkError = new Error(t('err.network'))
    networkError.code = 'network'
    networkError.key = 'err.network'
    throw networkError
  } finally {
    if (timer) clearTimeout(timer)
  }
}
