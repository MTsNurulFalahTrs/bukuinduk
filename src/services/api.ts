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
 * MASALAH MENDASAR GAS:
 * GAS menggunakan pola POST-Redirect-GET (302). Saat browser mengikuti
 * redirect 302 dari script.google.com ke script.googleusercontent.com,
 * browser MENGUBAH POST menjadi GET secara otomatis (RFC 7231 §6.4.3).
 * Akibatnya script.googleusercontent.com menerima GET, bukan POST → 405.
 *
 * SOLUSI:
 * Kirim semua request sebagai GET dengan payload di-encode sebagai
 * query parameter "data". GAS membacanya di doGet via e.parameter.data.
 * GET request tidak mengalami masalah redirect method change.
 *
 * Keterbatasan: URL maksimal ~8KB. Untuk payload besar (import batch),
 * payload dipecah atau dikompres. Untuk kebutuhan aplikasi Buku Induk
 * dengan data per-request yang wajar, ini aman.
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

  // Encode payload sebagai query parameter
  const encodedData = encodeURIComponent(JSON.stringify(body))
  const url = `${GAS_URL}?data=${encodedData}`

  // AbortController untuk timeout manual
  const controller = new AbortController()
  const timeoutMs  = options?.timeout ?? 30_000
  const timer      = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method:   'GET',
      redirect: 'follow',
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
    if (err instanceof TypeError) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
