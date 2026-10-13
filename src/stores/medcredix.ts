// Store global MedCredix (Pinia) — port dari store.tsx (Zustand):
// sesi, router hash, drawer Why/Aksi/Bukti, tema.
import { defineStore } from 'pinia'
import { onBeforeUnmount, onMounted } from 'vue'
import { revokeSession, setActiveHospital, setToken } from '~/composables/useApi'

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

export const useMedCredix = defineStore('medcredix', {
  state: () => ({
    user: null as SessionUser | null,
    hospitalId: null as string | null, // untuk super_admin berpindah tenant
    view: 'dashboard',
    whyDomain: null as string | null,
    actionDraft: null as ActionDraft | null,
    evidenceRef: null as EvidenceRef | null,
    theme: 'light' as 'light' | 'dark',
    focusId: null as string | null, // item yang dibuka otomatis setelah pindah halaman (hasil pencarian)
  }),

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
      setActiveHospital(id)
      this.hospitalId = id
    },
    navigate(view: string, focusId: string | null = null) {
      if (typeof window !== 'undefined') window.location.hash = `/${view}`
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
      this.view = view
    },
    openWhy(domain: string) {
      this.whyDomain = domain
    },
    closeWhy() {
      this.whyDomain = null
    },
    openAction(draft: ActionDraft) {
      this.actionDraft = draft
    },
    closeAction() {
      this.actionDraft = null
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
    window.addEventListener('hashchange', onHash)
    onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))
  })
}
