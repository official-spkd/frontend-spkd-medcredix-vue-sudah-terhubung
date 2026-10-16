<script setup lang="ts">
// Dokumentasi API MedCredix (#/api-docs) — halaman publik ala dokumentasi payment gateway:
// daftar endpoint per grup, warna per metode HTTP, token Bearer, coba request langsung,
// dan respons JSON di panel gelap ala terminal.
import {
  ArrowLeft, BookOpen, Check, ChevronRight, Copy, Eye, EyeOff, KeyRound, Loader2, Lock, Menu,
  Search, Send, Trash2, Unlock, X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMedCredix } from '~/stores/medcredix'
import { getToken } from '~/composables/useApi'
import { toast } from '~/composables/useToast'
import {
  API_GROUPS, ENDPOINTS, ERROR_401_EXAMPLE, LOGIN_ERROR_EXAMPLE, METHOD_STYLE,
  type ApiEndpoint, type ApiParam,
} from '~/data/apiDocs'

const store = useMedCredix()

// ── Routing: #/api-docs (pengantar) dan #/api-docs/<id> (endpoint) ──
const currentId = computed(() => store.view.replace(/^api-docs\/?/, ''))
const current = computed<ApiEndpoint | null>(() => ENDPOINTS.find((e) => e.id === currentId.value) ?? null)

function go(id: string) {
  window.location.hash = id ? `/api-docs/${id}` : '/api-docs'
  navOpen.value = false
}
function backToApp() {
  window.location.hash = '/dashboard'
}

// ── Konfigurasi: Base URL dan token Bearer ──
const DOCS_TOKEN_KEY = 'medcredix-docs-token'
const envBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const baseUrl = ref((envBase || window.location.origin) + '/api')
const token = ref(readStored() ?? getToken() ?? '')
const showToken = ref(false)

function readStored(): string | null {
  try {
    return window.localStorage.getItem(DOCS_TOKEN_KEY)
  } catch {
    return null
  }
}
watch(token, (v) => {
  try {
    if (v) window.localStorage.setItem(DOCS_TOKEN_KEY, v)
    else window.localStorage.removeItem(DOCS_TOKEN_KEY)
  } catch {
    /* penyimpanan browser diblokir: token tetap dipakai selama halaman terbuka */
  }
})
function useSessionToken() {
  const t = getToken()
  if (!t) {
    toast({ title: 'Belum login di aplikasi', description: 'Pakai endpoint Login di bawah untuk mendapatkan token.', variant: 'destructive' })
    return
  }
  token.value = t
  toast({ title: 'Token sesi dipasang' })
}

// ── Sidebar ──
const navOpen = ref(false)
const query = ref('')
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return API_GROUPS.map((g) => ({
    name: g,
    items: ENDPOINTS.filter(
      (e) => e.group === g && (!q || `${e.method} ${e.path} ${e.title}`.toLowerCase().includes(q)),
    ),
  })).filter((g) => g.items.length)
})
const INTRO = [
  { id: 'pengantar', label: 'Pengantar' },
  { id: 'autentikasi', label: 'Autentikasi' },
  { id: 'format-respons', label: 'Format respons' },
  { id: 'kode-error', label: 'Kode status & error' },
  { id: 'multi-rs', label: 'Multi rumah sakit' },
]
function goIntro(anchor: string) {
  if (current.value) go('')
  navOpen.value = false
  requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ── Try it ──
const queryValues = ref<Record<string, string>>({})
const formValues = ref<Record<string, string>>({})
const bodyText = ref('')
const file = ref<File | null>(null)
const fileKey = ref(0)

type Result = {
  status: number
  statusText: string
  ms: number
  size: number
  contentType: string
  body: string
  json: boolean
  downloadUrl?: string
}
const sending = ref(false)
const result = ref<Result | null>(null)
const tab = ref<'contoh' | 'hasil'>('contoh')

function resetTry() {
  const e = current.value
  queryValues.value = {}
  formValues.value = {}
  file.value = null
  fileKey.value++
  if (result.value?.downloadUrl) URL.revokeObjectURL(result.value.downloadUrl)
  result.value = null
  tab.value = 'contoh'
  if (!e) return
  for (const p of e.params ?? []) {
    if (p.in === 'query') queryValues.value[p.name] = p.required ? p.example ?? '' : ''
    if (p.in === 'form' && p.type !== 'file') formValues.value[p.name] = ''
  }
  bodyText.value = e.body ? JSON.stringify(e.body, null, 2) : ''
}
watch(current, () => {
  resetTry()
  window.scrollTo({ top: 0 })
}, { immediate: true })

const queryParams = computed(() => current.value?.params?.filter((p) => p.in === 'query') ?? [])
const bodyParams = computed(() => current.value?.params?.filter((p) => p.in === 'body') ?? [])
const formParams = computed(() => current.value?.params?.filter((p) => p.in === 'form') ?? [])
const hasJsonBody = computed(() => !!current.value && current.value.method !== 'GET' && !current.value.multipart && bodyParams.value.length > 0)

const requestUrl = computed(() => {
  const e = current.value
  if (!e) return ''
  const qs = Object.entries(queryValues.value)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return baseUrl.value.replace(/\/+$/, '') + e.path + (qs ? `?${qs}` : '')
})

const bodyError = computed(() => {
  if (!hasJsonBody.value || !bodyText.value.trim()) return ''
  try {
    JSON.parse(bodyText.value)
    return ''
  } catch (err: any) {
    return 'JSON tidak valid: ' + (err?.message ?? '')
  }
})

async function send() {
  const e = current.value
  if (!e || sending.value) return
  if (bodyError.value) {
    toast({ title: 'Body belum benar', description: bodyError.value, variant: 'destructive' })
    return
  }
  const headers: Record<string, string> = {}
  if (e.auth && token.value) headers.Authorization = `Bearer ${token.value.trim()}`
  let body: BodyInit | undefined
  if (hasJsonBody.value) {
    headers['Content-Type'] = 'application/json'
    body = bodyText.value.trim() || '{}'
  } else if (e.multipart) {
    const fd = new FormData()
    if (file.value) fd.append('file', file.value)
    for (const [k, v] of Object.entries(formValues.value)) if (v !== '') fd.append(k, v)
    body = fd
  }

  sending.value = true
  if (result.value?.downloadUrl) URL.revokeObjectURL(result.value.downloadUrl)
  const t0 = performance.now()
  try {
    const res = await fetch(requestUrl.value, { method: e.method, headers, body })
    const blob = await res.blob()
    const ms = Math.round(performance.now() - t0)
    const contentType = res.headers.get('content-type') ?? ''
    const r: Result = { status: res.status, statusText: res.statusText, ms, size: blob.size, contentType, body: '', json: false }
    if (contentType.includes('json')) {
      const text = await blob.text()
      try {
        const parsed = JSON.parse(text)
        r.body = JSON.stringify(parsed, null, 2)
        r.json = true
        if (e.id === 'login' && parsed?.ok && parsed.data?.token) {
          token.value = parsed.data.token
          toast({ title: 'Login berhasil', description: 'Token Bearer otomatis dipasang di kolom token.' })
        }
        if (e.id === 'logout' && parsed?.ok) token.value = ''
      } catch {
        r.body = text
      }
    } else if (/^text\/|csv|xml/.test(contentType)) {
      r.body = await blob.text()
    } else {
      r.downloadUrl = URL.createObjectURL(blob)
      r.body = `File biner ${formatSize(blob.size)} (${contentType || 'tanpa Content-Type'}).`
    }
    result.value = r
  } catch (err: any) {
    result.value = {
      status: 0, statusText: 'Gagal terhubung', ms: Math.round(performance.now() - t0), size: 0, contentType: '', json: false,
      body: `Tidak bisa menghubungi ${requestUrl.value}\n${err?.message ?? err}\n\nCek Base URL, backend menyala, dan CORS.`,
    }
  } finally {
    sending.value = false
    tab.value = 'hasil'
  }
}

onBeforeUnmount(() => {
  if (result.value?.downloadUrl) URL.revokeObjectURL(result.value.downloadUrl)
})

function onFile(ev: Event) {
  file.value = (ev.target as HTMLInputElement).files?.[0] ?? null
}

// ── cURL ──
const curl = computed(() => {
  const e = current.value
  if (!e) return ''
  const lines = [`curl -X ${e.method} '${requestUrl.value}'`]
  if (e.auth) lines.push(`  -H 'Authorization: Bearer ${token.value ? maskToken(token.value) : '<TOKEN>'}'`)
  if (hasJsonBody.value) {
    lines.push(`  -H 'Content-Type: application/json'`)
    let compact = bodyText.value
    try {
      compact = JSON.stringify(JSON.parse(bodyText.value))
    } catch {
      /* tampilkan apa adanya */
    }
    lines.push(`  -d '${compact.replace(/'/g, "'\\''")}'`)
  }
  if (e.multipart) {
    for (const p of formParams.value) lines.push(p.type === 'file' ? `  -F 'file=@dokumen.pdf'` : `  -F '${p.name}=${formValues.value[p.name] || '...'}'`)
  }
  return lines.join(' \\\n')
})
function curlFull() {
  return token.value ? curl.value.replace(maskToken(token.value), token.value) : curl.value
}
function maskToken(t: string) {
  return t.length > 24 ? `${t.slice(0, 12)}…${t.slice(-6)}` : t
}

// ── Tampilan ──
const exampleStatus = computed(() => (current.value?.responseNote?.includes('403') ? 403 : 200))
const exampleText = computed(() => (current.value?.response ? JSON.stringify(current.value.response, null, 2) : ''))

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// Pewarnaan JSON: kunci biru muda, string hijau limau, angka oranye, boolean ungu, null merah muda.
function highlight(json: string) {
  return escapeHtml(json).replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'text-orange-300'
      if (m.startsWith('"')) cls = /:\s*$/.test(m) ? 'text-sky-300' : 'text-lime-300'
      else if (m === 'true' || m === 'false') cls = 'text-violet-400'
      else if (m === 'null') cls = 'text-rose-400'
      return `<span class="${cls}">${m}</span>`
    },
  )
}
function highlightCurl(s: string) {
  return escapeHtml(s)
    .replace(/^curl -X (\w+)/, (_m, m) => `<span class="text-slate-400">curl</span> -X <span class="${METHOD_STYLE[m as keyof typeof METHOD_STYLE]?.text ?? ''} font-bold">${m}</span>`)
    .replace(/'([^']*)'/g, `<span class="text-lime-300">'$1'</span>`)
    .replace(/ (-[HdF]) /g, ' <span class="text-sky-300">$1</span> ')
}
// Deskripsi: `kode` jadi <code>.
function rich(s: string) {
  return escapeHtml(s).replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">$1</code>')
}

function statusClass(s: number) {
  if (s >= 200 && s < 300) return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40'
  if (s >= 400 && s < 500) return 'bg-amber-500/15 text-amber-300 ring-amber-500/40'
  return 'bg-rose-500/15 text-rose-300 ring-rose-500/40'
}
function formatSize(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}
function paramType(p: ApiParam) {
  return p.enum ? `${p.type} (enum)` : p.type
}

const copied = ref('')
async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    setTimeout(() => (copied.value === key ? (copied.value = '') : null), 1500)
  } catch {
    toast({ title: 'Gagal menyalin', description: 'Browser menolak akses clipboard.', variant: 'destructive' })
  }
}

// Tutup menu endpoint (HP) dengan Esc
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') navOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
watch(navOpen, (v) => document.body.classList.toggle('overflow-hidden', v))
onBeforeUnmount(() => document.body.classList.remove('overflow-hidden'))

const STATUS_CODES = [
  { code: 200, label: 'OK', desc: 'Berhasil. Data ada di `data`.' },
  { code: 400, label: 'Bad Request', desc: 'Payload salah, field wajib kosong, atau perpindahan status tidak diizinkan.' },
  { code: 401, label: 'Unauthorized', desc: 'Token kosong, salah, kedaluwarsa, atau sudah logout. Login ulang.' },
  { code: 403, label: 'Forbidden', desc: 'Token valid, tapi peran tidak punya izin untuk aksi itu.' },
  { code: 404, label: 'Not Found', desc: 'Data tidak ditemukan di RS aktif.' },
  { code: 429, label: 'Too Many Requests', desc: 'Terlalu banyak percobaan login. Tunggu sebentar.' },
  { code: 500, label: 'Server Error', desc: 'Kesalahan di server. Kirim `X-Correlation-Id` ke tim teknis.' },
]
const PERMISSIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'VERIFY', 'APPROVE', 'SIGN', 'EXPORT', 'PRINT', 'ASSIGN', 'RESOLVE', 'REOPEN', 'CONFIGURE']
const SUCCESS_EXAMPLE = '{\n  "ok": true,\n  "data": { ... }\n}'
const ERROR_EXAMPLE = JSON.stringify(ERROR_401_EXAMPLE, null, 2)
const LOGIN_ERR = JSON.stringify(LOGIN_ERROR_EXAMPLE, null, 2)
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Topbar -->
    <header class="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div class="flex h-14 items-center gap-3 px-4 lg:px-6">
        <button class="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Menu endpoint" @click="navOpen = true">
          <Menu class="h-5 w-5" />
        </button>
        <button class="flex min-w-0 items-center gap-2.5" @click="go('')">
          <img src="/logo/icon.svg" alt="Logo MedCredix" class="h-8 w-8 shrink-0" />
          <span class="truncate font-display text-sm font-bold sm:text-base">MedCredix <span class="text-brand-2">API</span></span>
          <span class="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">v1 · REST · JSON</span>
        </button>
        <div class="ml-auto flex items-center gap-2">
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
            @click="backToApp"
          >
            <ArrowLeft class="h-4 w-4" /><span class="hidden sm:inline">Kembali ke aplikasi</span>
          </button>
        </div>
      </div>

      <!-- Base URL + token -->
      <div class="grid gap-2 border-t bg-muted/30 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:px-6">
        <label class="flex min-w-0 items-center gap-2 rounded-lg border bg-card px-3">
          <span class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Base URL</span>
          <input v-model="baseUrl" spellcheck="false" class="h-9 min-w-0 flex-1 bg-transparent font-mono text-xs outline-none" />
        </label>
        <div class="flex min-w-0 items-center gap-2">
          <label class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3">
            <KeyRound class="h-4 w-4 shrink-0" :class="token ? 'text-emerald-500' : 'text-muted-foreground'" />
            <span class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bearer</span>
            <input
              v-model="token" :type="showToken ? 'text' : 'password'" spellcheck="false" autocomplete="off"
              placeholder="Tempel token JWT di sini"
              class="h-9 min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:font-sans"
            />
            <button class="shrink-0 text-muted-foreground hover:text-foreground" :aria-label="showToken ? 'Sembunyikan token' : 'Tampilkan token'" @click="showToken = !showToken">
              <EyeOff v-if="showToken" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
            </button>
            <button v-if="token" class="shrink-0 text-muted-foreground hover:text-danger" aria-label="Hapus token" @click="token = ''">
              <Trash2 class="h-4 w-4" />
            </button>
          </label>
          <button
            class="h-9 shrink-0 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover"
            title="Ambil token dari sesi login aplikasi"
            @click="useSessionToken"
          >
            Token sesi
          </button>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- Latar gelap menu HP -->
      <div v-if="navOpen" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="navOpen = false" />

      <!-- Sidebar -->
      <aside
        :class="[
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-card transition-transform lg:sticky lg:top-[7.5rem] lg:z-0 lg:h-[calc(100vh-7.5rem)] lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
      >
        <div class="flex items-center gap-2 border-b p-3">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="query" placeholder="Cari endpoint…"
              class="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button class="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Tutup" @click="navOpen = false"><X class="h-4 w-4" /></button>
        </div>
        <nav class="flex-1 space-y-4 overflow-y-auto p-3 scrollbar-thin">
          <div v-if="!query">
            <div class="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Panduan</div>
            <button
              v-for="s in INTRO" :key="s.id"
              :class="['flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted', !current && s.id === 'pengantar' ? 'font-semibold text-brand-2' : '']"
              @click="goIntro(s.id)"
            >
              <BookOpen class="h-3.5 w-3.5 text-muted-foreground" />{{ s.label }}
            </button>
          </div>
          <div v-for="g in groups" :key="g.name">
            <div class="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{{ g.name }}</div>
            <button
              v-for="e in g.items" :key="e.id"
              :class="[
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                currentId === e.id ? 'bg-brand-light font-semibold text-brand dark:text-foreground' : 'hover:bg-muted',
              ]"
              @click="go(e.id)"
            >
              <span :class="['w-12 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[9px] font-bold ring-1 ring-inset', METHOD_STYLE[e.method].badge]">{{ e.method }}</span>
              <span class="min-w-0 truncate">{{ e.title }}</span>
            </button>
          </div>
          <p v-if="!groups.length" class="px-2 text-xs text-muted-foreground">Tidak ada endpoint yang cocok.</p>
        </nav>
      </aside>

      <!-- Konten -->
      <main class="min-w-0 flex-1">
        <!-- ── Pengantar ── -->
        <div v-if="!current" class="mx-auto max-w-4xl space-y-10 px-4 py-8 lg:px-10">
          <section id="pengantar" class="scroll-mt-36">
            <div class="text-xs font-semibold uppercase tracking-wider text-brand-2">Dokumentasi API</div>
            <h1 class="mt-1 font-display text-2xl font-bold sm:text-3xl">MedCredix REST API</h1>
            <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
              API untuk membaca dan mengelola data kredensialing, risiko, aksi, klaim, dan skor kesehatan rumah sakit.
              Semua endpoint memakai JSON, diawali <code class="rounded bg-muted px-1 font-mono text-foreground">/api</code>,
              dan selain Login wajib memakai token Bearer. Pilih endpoint di menu kiri untuk melihat parameter,
              contoh respons, dan mencobanya langsung.
            </p>
            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border bg-card p-4">
                <div class="text-[11px] font-semibold uppercase text-muted-foreground">Base URL</div>
                <div class="mt-1 break-all font-mono text-xs">{{ baseUrl }}</div>
              </div>
              <div class="rounded-xl border bg-card p-4">
                <div class="text-[11px] font-semibold uppercase text-muted-foreground">Format</div>
                <div class="mt-1 font-mono text-xs">application/json</div>
              </div>
              <div class="rounded-xl border bg-card p-4">
                <div class="text-[11px] font-semibold uppercase text-muted-foreground">Endpoint</div>
                <div class="mt-1 font-mono text-xs">{{ ENDPOINTS.length }} endpoint</div>
              </div>
            </div>
            <div class="mt-5">
              <div class="mb-2 text-xs font-semibold">Warna metode HTTP</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="(s, m) in METHOD_STYLE" :key="m" :class="['rounded-md px-2.5 py-1 font-mono text-[11px] font-bold ring-1 ring-inset', s.badge]">{{ m }}</span>
              </div>
              <p class="mt-2 text-xs text-muted-foreground">GET membaca data, POST membuat data, PATCH/PUT mengubah data, DELETE menghapus data.</p>
            </div>
          </section>

          <section id="autentikasi" class="scroll-mt-36">
            <h2 class="flex items-center gap-2 font-display text-xl font-bold"><Lock class="h-5 w-5 text-brand-2" /> Autentikasi</h2>
            <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Panggil <button class="font-semibold text-brand-2 hover:underline" @click="go('login')">POST /auth</button> dengan email dan kata sandi.</li>
              <li>Ambil <code class="rounded bg-muted px-1 font-mono text-foreground">data.token</code> dari respons. Token berlaku sampai <code class="rounded bg-muted px-1 font-mono text-foreground">data.expiresAt</code>.</li>
              <li>Kirim header <code class="rounded bg-muted px-1 font-mono text-foreground">Authorization: Bearer &lt;token&gt;</code> di setiap request.</li>
              <li>Selesai pakai, panggil <button class="font-semibold text-brand-2 hover:underline" @click="go('logout')">POST /auth/logout</button> agar token dicabut.</li>
            </ol>
            <p class="mt-3 text-sm text-muted-foreground">
              Di halaman ini token cukup ditempel sekali di kolom <b class="text-foreground">Bearer</b> di atas, atau tekan
              <b class="text-foreground">Token sesi</b> bila sudah login di aplikasi. Coba Login di sini juga otomatis mengisi token.
            </p>
            <pre class="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200"><span class="text-slate-500"># contoh</span>
<span class="text-slate-400">curl</span> <span class="text-lime-300">'{{ baseUrl }}/dashboard'</span> \
  <span class="text-sky-300">-H</span> <span class="text-lime-300">'Authorization: Bearer eyJhbGciOi...'</span></pre>
          </section>

          <section id="format-respons" class="scroll-mt-36">
            <h2 class="font-display text-xl font-bold">Format respons</h2>
            <p class="mt-2 text-sm text-muted-foreground">Semua respons JSON memakai amplop yang sama. Cek <code class="rounded bg-muted px-1 font-mono text-foreground">ok</code> dulu, lalu baca <code class="rounded bg-muted px-1 font-mono text-foreground">data</code> atau <code class="rounded bg-muted px-1 font-mono text-foreground">error</code>.</p>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <div class="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Berhasil</div>
                <pre class="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200" v-html="highlight(SUCCESS_EXAMPLE)" />
              </div>
              <div>
                <div class="mb-1 text-xs font-semibold text-rose-600 dark:text-rose-400">Gagal (contoh 401)</div>
                <pre class="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200" v-html="highlight(ERROR_EXAMPLE)" />
              </div>
            </div>
          </section>

          <section id="kode-error" class="scroll-mt-36">
            <h2 class="font-display text-xl font-bold">Kode status & error</h2>
            <div class="mt-3 overflow-hidden rounded-xl border">
              <table class="w-full text-left text-xs">
                <thead class="bg-muted/50 text-[11px] uppercase text-muted-foreground">
                  <tr><th class="px-3 py-2">Kode</th><th class="px-3 py-2">Arti</th><th class="px-3 py-2">Kapan</th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in STATUS_CODES" :key="s.code" class="border-t align-top">
                    <td class="px-3 py-2"><span :class="['rounded px-1.5 py-0.5 font-mono font-bold', s.code < 300 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : s.code < 500 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400']">{{ s.code }}</span></td>
                    <td class="whitespace-nowrap px-3 py-2 font-semibold">{{ s.label }}</td>
                    <td class="px-3 py-2 text-muted-foreground" v-html="rich(s.desc)" />
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-4 text-xs font-semibold">Contoh login gagal</div>
            <pre class="mt-1 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200" v-html="highlight(LOGIN_ERR)" />
            <div class="mt-4 text-xs font-semibold">Izin (permission) per peran</div>
            <p class="mt-1 text-xs text-muted-foreground">Setiap peran punya kumpulan izin. Izin pengguna yang login ada di <code class="rounded bg-muted px-1 font-mono text-foreground">data.user.permissions</code> pada respons Login.</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span v-for="p in PERMISSIONS" :key="p" class="rounded-md border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold">{{ p }}</span>
            </div>
          </section>

          <section id="multi-rs" class="scroll-mt-36">
            <h2 class="font-display text-xl font-bold">Multi rumah sakit</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              Pengguna RS otomatis hanya melihat data RS-nya. Super Admin dan Auditor BPJS bisa memilih RS dengan
              query <code class="rounded bg-muted px-1 font-mono text-foreground">?hospitalId=h_nusantara</code> di endpoint mana pun.
              Daftar RS ada di <button class="font-semibold text-brand-2 hover:underline" @click="go('bootstrap')">GET /bootstrap</button>.
            </p>
          </section>

          <div class="rounded-xl border bg-brand-light/50 p-4 text-sm">
            Mulai dari <button class="font-semibold text-brand-2 hover:underline" @click="go('login')">Login</button>, lalu coba
            <button class="font-semibold text-brand-2 hover:underline" @click="go('dashboard')">GET /dashboard</button>.
            <ChevronRight class="inline h-4 w-4" />
          </div>
        </div>

        <!-- ── Detail endpoint ── -->
        <div v-else class="grid min-w-0 xl:grid-cols-2">
          <!-- Kiri: dokumentasi -->
          <div class="min-w-0 space-y-6 px-4 py-6 lg:px-8">
            <div>
              <div class="text-xs font-semibold text-muted-foreground">{{ current.group }}</div>
              <h1 class="mt-1 font-display text-2xl font-bold">{{ current.title }}</h1>
              <div class="mt-3 flex min-w-0 items-center gap-2 rounded-xl border bg-card p-2">
                <span :class="['shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold ring-1 ring-inset', METHOD_STYLE[current.method].badge]">{{ current.method }}</span>
                <code class="min-w-0 flex-1 truncate font-mono text-sm"><span class="text-muted-foreground">/api</span>{{ current.path }}</code>
                <button class="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Salin URL" @click="copy(baseUrl.replace(/\/+$/, '') + current.path, 'path')">
                  <Check v-if="copied === 'path'" class="h-4 w-4 text-emerald-500" /><Copy v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <p class="text-sm leading-relaxed text-muted-foreground" v-html="rich(current.desc)" />

            <div class="flex flex-wrap gap-2 text-xs">
              <span v-if="current.auth" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-400"><Lock class="h-3.5 w-3.5" /> Butuh token Bearer</span>
              <span v-else class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-400"><Unlock class="h-3.5 w-3.5" /> Tanpa token</span>
              <span v-if="current.permission" class="rounded-full bg-muted px-2.5 py-1 font-semibold">Izin: <span class="font-mono">{{ current.permission }}</span></span>
              <span v-if="current.multipart" class="rounded-full bg-muted px-2.5 py-1 font-mono font-semibold">multipart/form-data</span>
            </div>

            <!-- Tabel parameter per lokasi -->
            <template v-for="sec in [
              { title: 'Query parameter', list: queryParams },
              { title: 'Body (JSON)', list: bodyParams },
              { title: 'Form data', list: formParams },
            ]" :key="sec.title">
              <div v-if="sec.list.length">
                <h2 class="mb-2 text-sm font-bold">{{ sec.title }}</h2>
                <div class="divide-y rounded-xl border">
                  <div v-for="p in sec.list" :key="p.name" class="space-y-1 px-3 py-2.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <code class="font-mono text-xs font-bold">{{ p.name }}</code>
                      <span class="font-mono text-[10px] text-muted-foreground">{{ paramType(p) }}</span>
                      <span v-if="p.required" class="rounded bg-rose-500/10 px-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">wajib</span>
                      <span v-else class="text-[10px] text-muted-foreground">opsional</span>
                    </div>
                    <p class="text-xs text-muted-foreground" v-html="rich(p.desc)" />
                    <div v-if="p.enum" class="flex flex-wrap gap-1">
                      <code v-for="v in p.enum" :key="v" class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{{ v }}</code>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <p v-if="!current.params?.length" class="text-xs text-muted-foreground">Endpoint ini tidak punya parameter.</p>

            <div v-if="current.errors?.length">
              <h2 class="mb-2 text-sm font-bold">Kemungkinan error</h2>
              <div class="divide-y rounded-xl border">
                <div v-for="er in current.errors" :key="er.status" class="flex gap-3 px-3 py-2 text-xs">
                  <span :class="['h-fit shrink-0 rounded px-1.5 py-0.5 font-mono font-bold', er.status >= 500 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400']">{{ er.status }}</span>
                  <span class="min-w-0 break-words text-muted-foreground">{{ er.when }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Kanan: coba langsung + terminal -->
          <div class="min-w-0 space-y-4 border-t bg-slate-900 px-4 py-6 text-slate-200 lg:px-8 xl:border-l xl:border-t-0">
            <!-- Form coba -->
            <div class="rounded-xl border border-slate-700 bg-slate-950/60">
              <div class="flex items-center justify-between border-b border-slate-700 px-4 py-2.5">
                <span class="text-xs font-bold uppercase tracking-wide text-slate-300">Coba langsung</span>
                <span v-if="current.auth && !token" class="text-[11px] text-amber-300">Token belum diisi</span>
              </div>
              <div class="space-y-3 p-4">
                <div v-for="p in queryParams" :key="p.name">
                  <label class="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-400">{{ p.name }}<span v-if="p.required" class="text-rose-400">*</span></label>
                  <select
                    v-if="p.enum" v-model="queryValues[p.name]"
                    class="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-100 outline-none focus:border-sky-500"
                  >
                    <option value="">(kosong)</option>
                    <option v-for="v in p.enum" :key="v" :value="v">{{ v }}</option>
                  </select>
                  <input
                    v-else v-model="queryValues[p.name]" :placeholder="p.example ?? ''" spellcheck="false"
                    class="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
                  />
                </div>

                <div v-if="hasJsonBody">
                  <label class="mb-1 block font-mono text-[11px] text-slate-400">Body JSON</label>
                  <textarea
                    v-model="bodyText" :rows="Math.min(16, bodyText.split(`\n`).length + 1)" spellcheck="false"
                    class="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-emerald-200 outline-none focus:border-sky-500"
                  />
                  <p v-if="bodyError" class="mt-1 text-[11px] text-rose-400">{{ bodyError }}</p>
                </div>

                <template v-if="current.multipart">
                  <div v-for="p in formParams" :key="p.name">
                    <label class="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-400">{{ p.name }}<span v-if="p.required" class="text-rose-400">*</span></label>
                    <input
                      v-if="p.type === 'file'" :key="fileKey" type="file"
                      class="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100"
                      @change="onFile"
                    />
                    <input
                      v-else v-model="formValues[p.name]" spellcheck="false"
                      class="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                </template>

                <div class="flex min-w-0 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px]">
                  <span :class="['shrink-0 font-bold', METHOD_STYLE[current.method].text]">{{ current.method }}</span>
                  <span class="min-w-0 break-all text-slate-300">{{ requestUrl }}</span>
                </div>

                <button
                  :disabled="sending"
                  class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                  @click="send"
                >
                  <Loader2 v-if="sending" class="h-4 w-4 animate-spin" /><Send v-else class="h-4 w-4" /> Kirim request
                </button>
              </div>
            </div>

            <!-- Terminal respons -->
            <div class="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-lg">
              <div class="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
                <span class="h-2.5 w-2.5 rounded-full bg-rose-500/80" /><span class="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span class="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <div class="ml-2 flex gap-1">
                  <button :class="['rounded-md px-2.5 py-1 text-[11px] font-semibold', tab === 'contoh' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200']" @click="tab = 'contoh'">Contoh respons</button>
                  <button :class="['rounded-md px-2.5 py-1 text-[11px] font-semibold', tab === 'hasil' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200']" @click="tab = 'hasil'">Hasil kirim</button>
                </div>
                <button
                  class="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Salin respons"
                  @click="copy(tab === 'hasil' ? result?.body ?? '' : exampleText, 'resp')"
                >
                  <Check v-if="copied === 'resp'" class="h-4 w-4 text-emerald-400" /><Copy v-else class="h-4 w-4" />
                </button>
              </div>

              <template v-if="tab === 'contoh'">
                <div class="flex items-center gap-2 border-b border-slate-800 px-4 py-2 font-mono text-[11px]">
                  <span :class="['rounded px-1.5 py-0.5 font-bold ring-1 ring-inset', statusClass(exampleStatus)]">{{ exampleStatus }}</span>
                  <span class="text-slate-400">application/json</span>
                </div>
                <p v-if="current.responseNote" class="border-b border-slate-800 px-4 py-2 text-[11px] text-slate-400">{{ current.responseNote }}</p>
                <pre v-if="exampleText" class="max-h-[32rem] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin" v-html="highlight(exampleText)" />
                <p v-else class="p-4 font-mono text-xs text-slate-500">// Contoh belum tersedia. Tekan "Kirim request" untuk melihat respons asli.</p>
              </template>

              <template v-else>
                <div v-if="result" class="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2 font-mono text-[11px]">
                  <span :class="['rounded px-1.5 py-0.5 font-bold ring-1 ring-inset', statusClass(result.status)]">{{ result.status || 'ERR' }} {{ result.statusText }}</span>
                  <span class="text-slate-400">{{ result.ms }} ms</span>
                  <span class="text-slate-400">{{ formatSize(result.size) }}</span>
                  <span v-if="result.contentType" class="truncate text-slate-500">{{ result.contentType }}</span>
                </div>
                <div v-if="sending" class="flex items-center gap-2 p-4 font-mono text-xs text-slate-400"><Loader2 class="h-4 w-4 animate-spin" /> menunggu respons…</div>
                <template v-else-if="result">
                  <pre class="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin" v-html="result.json ? highlight(result.body) : escapeHtml(result.body)" />
                  <a v-if="result.downloadUrl" :href="result.downloadUrl" download class="mx-4 mb-4 inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-slate-700">Unduh file</a>
                </template>
                <p v-else class="p-4 font-mono text-xs text-slate-500"><span class="text-emerald-400">$</span> belum ada request. Isi parameter lalu tekan "Kirim request".</p>
              </template>
            </div>

            <!-- cURL -->
            <div class="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <div class="flex items-center border-b border-slate-800 px-4 py-2">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">cURL</span>
                <button class="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Salin cURL" @click="copy(curlFull(), 'curl')">
                  <Check v-if="copied === 'curl'" class="h-4 w-4 text-emerald-400" /><Copy v-else class="h-4 w-4" />
                </button>
              </div>
              <pre class="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin" v-html="highlightCurl(curl)" />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
