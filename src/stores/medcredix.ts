// Store global MedCredix (Pinia) — port dari store.tsx (Zustand):
// sesi, router hash, drawer Why/Aksi/Bukti, tema.
import { defineStore } from 'pinia'
import { onBeforeUnmount, onMounted } from 'vue'
import { revokeSession, setActiveHospital, setToken } from '~/composables/useApi'
import { toast } from '~/composables/useToast'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  roleLabel: string
  title: string | null
  hospitalId: string | null
  permissions: string[]
}

export type ActionDraft = {
  title: string
  description?: string
  sourceType: string
  sourceRef?: string | null
  expectedOutcome?: string | null
  priority?: string
  suggestedOwner?: string
}

export type EvidenceRef = { refType?: string; refId?: string; title?: string }

function readHash(): string {
  if (typeof window === 'undefined') return 'dashboard'
  const h = window.location.hash.replace(/^#\/?/, '')
  return h || 'dashboard'
}

// Alamat di luar "/" (mis. /abc atau /api_v1_documentation_medcredix/xyz yang tidak ada)
// adalah halaman yang tidak dikenal: tampilkan 404, bukan halaman login atau dashboard.
function readBadPath(): string | null {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname
  return p === '/' || p === '/index.html' ? null : p
}

export const useMedCredix = defineStore('medcredix', {
  state: () => ({
    user: null as SessionUser | null,
    hospitalId: null as string | null, // untuk super_admin berpindah tenant
    view: 'dashboard',
    whyDomain: null as string | null,
    whyGroup: null as string | null, // kelompok BDCS (A-D) yang langsung dibuka info perhitungannya
    actionDraft: null as ActionDraft | null,
    evidenceRef: null as EvidenceRef | null,
    theme: 'light' as 'light' | 'dark',
    focusId: null as string | null, // item yang dibuka otomatis setelah pindah halaman (hasil pencarian)
    dataVersion: 0, // naik setiap ada data baru (mis. tindakan dibuat) agar daftar & badge memuat ulang
    notFoundPath: readBadPath(), // alamat tidak dikenal yang sedang dibuka (halaman 404)
  }),

  getters: {
    // can('CREATE'): apakah peran pengguna punya izin itu (dari internal/auth/rbac.go di backend).
    can: (state) => (perm: string) => !!state.user?.permissions?.includes(perm),
  },

  actions: {
    login(user: SessionUser, token?: string, hospitalId?: string | null) {
      window.localStorage.setItem('medcredix-session', JSON.stringify(user))
      if (token) setToken(token)
      this.setHospital(hospitalId ?? user.hospitalId ?? null)
      this.user = user
    },
    logout() {
      revokeSession() // cabut token di server sebelum dihapus dari browser
      window.localStorage.removeItem('medcredix-session')
      setToken(null)
      setActiveHospital(null)
      this.user = null
      this.hospitalId = null
      this.whyDomain = null
      this.actionDraft = null
      this.evidenceRef = null
      this.navigate('dashboard') // login berikutnya mulai dari dashboard
    },
    setHospital(id: string | null) {
      // Ganti RS: tutup panel yang masih berisi data RS sebelumnya.
      if (id !== this.hospitalId) {
        this.whyDomain = null
        this.actionDraft = null
        this.evidenceRef = null
        this.focusId = null
      }
      setActiveHospital(id)
      this.hospitalId = id
    },
    navigate(view: string, focusId: string | null = null) {
      if (view !== this.view) this.closeOverlays()
      if (this.notFoundPath && typeof window !== 'undefined') {
        // keluar dari alamat 404: kembali ke "/" lalu buka halaman tujuan
        window.history.replaceState(null, '', `/#/${view}`)
        this.notFoundPath = null
      } else if (typeof window !== 'undefined') window.location.hash = `/${view}`
      this.view = view
      this.focusId = focusId
    },
    // Ambil sekali item yang harus dibuka (lalu dikosongkan).
    takeFocus(): string | null {
      const id = this.focusId
      this.focusId = null
      return id
    },
    setView(view: string) {
      // Pindah halaman (termasuk tombol Back browser): tutup panel global agar halaman baru tidak tertutup.
      if (view !== this.view) this.closeOverlays()
      this.view = view
    },
    closeOverlays() {
      this.whyDomain = null
      this.actionDraft = null
      this.evidenceRef = null
    },
    openWhy(domain: string, group: string | null = null) {
      this.whyGroup = group
      this.whyDomain = domain
    },
    closeWhy() {
      this.whyDomain = null
    },
    openAction(draft: ActionDraft) {
      // Peran tanpa izin CREATE (Auditor, Viewer, Komite Medis, Manajemen RS) hanya melihat.
      if (!this.can('CREATE')) {
        toast({ title: 'Peran Anda hanya dapat melihat', description: 'Membuat tindakan membutuhkan izin CREATE.', variant: 'destructive' })
        return
      }
      this.actionDraft = draft
    },
    closeAction() {
      this.actionDraft = null
    },
    // Tandai data berubah: halaman yang sedang terbuka (Action Center, badge sidebar) memuat ulang tanpa refresh.
    bumpData() {
      this.dataVersion++
    },
    openEvidence(ref: EvidenceRef) {
      this.evidenceRef = ref
    },
    closeEvidence() {
      this.evidenceRef = null
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.theme === 'dark')
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('medcredix-theme', this.theme)
      }
    },
    restoreSession(user: SessionUser) {
      this.hospitalId = window.localStorage.getItem('medcredix-hospital') ?? user.hospitalId ?? null
      this.user = user
    },
  },
})

// useHashRouter — sinkronisasi hash ↔ view (port dari useHashRouter)
export function useHashRouter() {
  const store = useMedCredix()
  onMounted(() => {
    const onHash = () => store.setView(readHash())
    onHash()
    // pindah hash saat berada di alamat 404: kembali ke "/" dengan hash tujuan
    const onHashChange = () => {
      if (store.notFoundPath) {
        window.history.replaceState(null, '', `/#/${readHash()}`)
        store.notFoundPath = null
      }
      onHash()
    }
    window.addEventListener('hashchange', onHashChange)
    onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange))
  })
}
