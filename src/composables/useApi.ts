// Client API MedCredix — ke backend Golang (Gin) di `/api/*`, envelope `{ ok, data }` / `{ ok, error }`.
//   - Dev: proxy Vite `/api` → http://localhost:8080 (lihat vite.config.ts).
//   - Produksi: same-origin atau VITE_API_BASE.
// Login menyimpan token JWT; tiap request mengirim `Authorization: Bearer <token>`.
// Mode demo statis (VITE_DEMO_MODE=true): permintaan dilayani ~/utils/demoApi di browser.
import type { SessionUser } from '~/stores/medcredix'

export type ApiOptions = { method?: string; body?: unknown }

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '') + '/api'

const SESSION_KEY = 'medcredix-session'
const TOKEN_KEY = 'medcredix-token'
const HOSPITAL_KEY = 'medcredix-hospital'

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

// RS aktif (dipilih super admin / auditor BPJS); disimpan store agar ikut di setiap request.
export function setActiveHospital(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) window.localStorage.setItem(HOSPITAL_KEY, id)
  else window.localStorage.removeItem(HOSPITAL_KEY)
}

function withHospital(path: string): string {
  if (path.startsWith('/auth') || /[?&]hospitalId=/.test(path)) return path
  const hid = typeof window !== 'undefined' ? window.localStorage.getItem(HOSPITAL_KEY) : null
  if (!hid) return path
  return path + (path.includes('?') ? '&' : '?') + 'hospitalId=' + encodeURIComponent(hid)
}

function headers(json: boolean): Record<string, string> {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// Token kedaluwarsa / tidak valid -> bersihkan sesi lalu kembali ke halaman login.
function handleUnauthorized() {
  window.localStorage.removeItem(SESSION_KEY)
  setToken(null)
  setActiveHospital(null)
  window.location.reload()
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  if (DEMO_MODE) {
    const { demoApi } = await import('~/utils/demoApi')
    return demoApi<T>(path, method, opts.body, getSessionUser()?.id ?? '')
  }

  let res: Response
  try {
    res = await fetch(API_BASE + withHospital(path), {
      method,
      headers: headers(opts.body !== undefined),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new Error('Tidak dapat terhubung ke server MedCredix (backend Golang).')
  }
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* respons bukan JSON */
  }
  if (res.status === 401 && !path.startsWith('/auth') && getToken()) {
    handleUnauthorized()
  }
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? `Permintaan gagal (${res.status}).`)
  }
  return json.data as T
}

export function downloadCsv(path: string) {
  const fail = (e: any) => {
    if (typeof window !== 'undefined') window.alert(e?.message ?? 'Gagal mengunduh CSV.')
  }
  if (DEMO_MODE) {
    import('~/utils/demoApi')
      .then(({ demoCsv }) => demoCsv(path, getSessionUser()?.id ?? ''))
      .catch(fail)
    return
  }
  ;(async () => {
    const res = await fetch(API_BASE + withHospital(path), { headers: headers(false) })
    if (!res.ok) {
      let msg = `Gagal mengunduh CSV (${res.status}).`
      try { msg = (await res.json())?.error ?? msg } catch { /* abaikan */ }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const name = cd.match(/filename="?([^";]+)"?/)?.[1] ?? 'MedCredix-laporan.csv'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })().catch(fail)
}
