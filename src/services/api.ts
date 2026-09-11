import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { ApiResponse, GasRequest } from '@/types'
import { getToken, clearAuth } from '@/utils'

// ── GAS hanya punya 1 endpoint POST ──────────────────────────
const GAS_URL = import.meta.env.VITE_GAS_URL as string

// Axios instance (dipakai untuk request non-GAS jika ada)
export const http: AxiosInstance = axios.create({
  baseURL: GAS_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Core function: semua request ke GAS ──────────────────────

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler
}

/**
 * Kirim request ke Google Apps Script Web App.
 * GAS hanya mendukung doGet/doPost, jadi semua request adalah POST
 * dengan body: { action, payload, token }.
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

  const config: AxiosRequestConfig = {
    timeout: options?.timeout ?? 30_000,
  }

  try {
    const response = await http.post<ApiResponse<T>>('', body, config)
    const data = response.data

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
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        throw new Error('Koneksi timeout. Periksa koneksi internet Anda.')
      }
      if (!err.response) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
      }
    }
    throw err
  }
}
