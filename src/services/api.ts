import type { ApiResponse, GasRequest } from '@/types'
import { getToken, clearAuth } from '@/utils'

const GAS_URL = import.meta.env.VITE_GAS_URL as string

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler
}

/**
 * Kirim request ke Google Apps Script Web App.
 *
 * GAS tidak mendukung CORS preflight (OPTIONS), sehingga kita TIDAK boleh
 * mengirim header `Content-Type: application/json` — header tersebut
 * menyebabkan browser mengirim preflight yang langsung ditolak GAS (405).
 *
 * Solusi: kirim sebagai `text/plain` (simple request, tidak ada preflight).
 * GAS tetap dapat membaca body-nya via `e.postData.contents`.
 *
 * Selain itu, GAS sering melakukan redirect 302 saat pertama kali diakses.
 * `fetch` dengan `redirect: 'follow'` menangani ini secara otomatis,
 * sedangkan Axios bisa gagal di beberapa browser. Maka kita pakai
 * native `fetch` di sini.
 */
export async function gasRequest<T = unknown>(
  action: string,
  payload?: unknown,
  options?: { skipAuth?: boolean; timeout?: number }
): Promise<T> {
  const token = getToken()

  if (!options?.skipAuth && !token) {
    _onUnauthorized?.()
    throw new Error('Sesi tidak valid. Silakan login kembali.')
  }

  const body: GasRequest = { action, payload, token: token ?? undefined }

  // AbortController untuk timeout manual
  const controller = new AbortController()
  const timeoutMs  = options?.timeout ?? 30_000
  const timer      = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(GAS_URL, {
      method:   'POST',
      // text/plain → "simple request" → tidak ada CORS preflight
      headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
      body:     JSON.stringify(body),
      redirect: 'follow',   // GAS sering redirect 302
      signal:   controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: ApiResponse<T> = await response.json()

    if (data.status === 401) {
      clearAuth()
      _onUnauthorized?.()
      throw new Error('Sesi berakhir. Silakan login kembali.')
    }

    if (data.status === 403) {
      throw new Error('Anda tidak memiliki izin untuk melakukan tindakan ini.')
    }

    if (data.status >= 400) {
      throw new Error(data.error ?? data.message ?? 'Terjadi kesalahan.')
    }

    return data.data as T

  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Koneksi timeout. Periksa koneksi internet Anda.')
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
