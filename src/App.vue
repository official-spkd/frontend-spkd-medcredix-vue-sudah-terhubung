<script setup lang="ts">
// SPKD MedCredix — Medical Credentialing Intelligence (Vue 3 + Vite)
// "From Hospital Data to Action."
// Port dari src/app/page.tsx: boot sesi + hash-router + 29 view + drawer global.
import { useMedCredix, useHashRouter, type SessionUser } from '~/stores/medcredix'
import { computed, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { api } from '~/composables/useApi'
import { NAV } from '~/utils/nav'
import Toaster from '~/components/ui/Toaster.vue'
import ActionDialog from '~/components/medcredix/ActionDialog.vue'
import AppShell from '~/components/medcredix/AppShell.vue'
import EvidenceDrawer from '~/components/medcredix/EvidenceDrawer.vue'
import LoginScreen from '~/components/medcredix/LoginScreen.vue'
import WhyDrawer from '~/components/medcredix/WhyDrawer.vue'
import ActionsView from '~/components/views/ActionsView.vue'
import AdminView from '~/components/views/AdminView.vue'
import AuditView from '~/components/views/AuditView.vue'
import ClaimAnomaliesView from '~/components/views/ClaimAnomaliesView.vue'
import ClaimIntegrityView from '~/components/views/ClaimIntegrityView.vue'
import ComplianceView from '~/components/views/ComplianceView.vue'
import CredentialsView from '~/components/views/CredentialsView.vue'
import DashboardView from '~/components/views/DashboardView.vue'
import DataQualityView from '~/components/views/DataQualityView.vue'
import DataSourcesView from '~/components/views/DataSourcesView.vue'
import DataTrustView from '~/components/views/DataTrustView.vue'
import DigitalMaturityView from '~/components/views/DigitalMaturityView.vue'
import DocumentsView from '~/components/views/DocumentsView.vue'
import EarlyWarningView from '~/components/views/EarlyWarningView.vue'
import EvidenceView from '~/components/views/EvidenceView.vue'
import FacilitiesView from '~/components/views/FacilitiesView.vue'
import InteropView from '~/components/views/InteropView.vue'
import PathwayView from '~/components/views/PathwayView.vue'
import PractitionersView from '~/components/views/PractitionersView.vue'
import PrerequisitesView from '~/components/views/PrerequisitesView.vue'
import ReportsView from '~/components/views/ReportsView.vue'
import RiskRadarView from '~/components/views/RiskRadarView.vue'
import SafetyView from '~/components/views/SafetyView.vue'
import SettingsAlertsView from '~/components/views/SettingsAlertsView.vue'
import SettingsHospitalView from '~/components/views/SettingsHospitalView.vue'
import SettingsUsersView from '~/components/views/SettingsUsersView.vue'
import UtilizationView from '~/components/views/UtilizationView.vue'
import VerificationView from '~/components/views/VerificationView.vue'
import WorkforceView from '~/components/views/WorkforceView.vue'
import ErrorPage from '~/components/medcredix/ErrorPage.vue'
// Dokumentasi API dimuat terpisah agar tidak memperberat aplikasi utama
// Dokumentasi API sekarang di Swagger (public/api_v1_documentation_medcredix)
const API_DOCS_URL = '/api_v1_documentation_medcredix/'

const store = useMedCredix()
useHashRouter()
const booted = ref(false)
// Gagal memuat data awal karena server: 503 (tidak terhubung) atau 500 (galat server)
const bootError = ref<500 | 503 | null>(null)

const VIEWS: Record<string, Component> = {
  dashboard: DashboardView,
  'risk-radar': RiskRadarView,
  'early-warnings': EarlyWarningView,
  actions: ActionsView,
  'cred-practitioners': PractitionersView,
  'cred-credentials': CredentialsView,
  'cred-documents': DocumentsView,
  'cred-verification': VerificationView,
  'cred-prerequisites': PrerequisitesView,
  'ready-workforce': WorkforceView,
  'ready-facilities': FacilitiesView,
  'ready-digital': DigitalMaturityView,
  'ready-interop': InteropView,
  'clin-pathway': PathwayView,
  'clin-utilization': UtilizationView,
  'clin-safety': SafetyView,
  'claim-integrity': ClaimIntegrityView,
  'claim-anomalies': ClaimAnomaliesView,
  'data-quality': DataQualityView,
  'data-trust': DataTrustView,
  'data-sources': DataSourcesView,
  evidence: EvidenceView,
  compliance: ComplianceView,
  audit: AuditView,
  reports: ReportsView,
  'settings-hospital': SettingsHospitalView,
  'settings-users': SettingsUsersView,
  'settings-alerts': SettingsAlertsView,
  admin: AdminView,
}

onMounted(async () => {
  // pulihkan tema (sinkronisasi dengan DOM)
  const theme = window.localStorage.getItem('medcredix-theme')
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    store.theme = 'dark'
  }
  // validasi sesi tersimpan terhadap data demo
  const saved = window.localStorage.getItem('medcredix-session')
  if (saved) {
    try {
      const session = JSON.parse(saved)
      // validasi token tersimpan ke backend Golang (atau data demo lokal bila VITE_DEMO_MODE=true)
      store.restoreSession(session)
      const boot = await api<any>('/bootstrap')
      if (boot?.needsHospital && boot.hospitals?.length) store.setHospital(boot.hospitals[0].id)
    } catch (e: any) {
      // hanya sesi yang benar-benar tidak dikenal yang dikeluarkan; error lain dibiarkan
      const msg = String(e?.message ?? '')
      if (/Sesi|token|Token/.test(msg)) store.logout()
      // 502/503/504 = gateway tidak bisa menjangkau backend, sama artinya dengan tidak terhubung
      else if (/Tidak dapat terhubung|\((502|503|504)\)/.test(msg)) bootError.value = 503
      else if (/\(5\d\d\)/.test(msg)) bootError.value = 500
    }
  }
  booted.value = true
})

const activeView = computed(() => VIEWS[store.view])
// 404: alamat di luar "/" atau nama halaman (#/...) yang tidak dikenal
const notFound = computed(() => !!store.notFoundPath || !activeView.value)
const notFoundLabel = computed(() => store.notFoundPath ?? `#/${store.view}`)
// #/api-docs bisa dibuka tanpa login
const isApiDocs = computed(() => store.view === 'api-docs' || store.view.startsWith('api-docs/'))
// alamat lama #/api-docs dialihkan ke Swagger
watch(isApiDocs, (v) => { if (v) window.location.replace(API_DOCS_URL) }, { immediate: true })

// Halaman yang dibatasi peran (sama dengan menu samping) tidak dirender untuk peran lain,
// walau alamatnya diketik langsung di browser.
const allowed = computed(() => {
  const item = NAV.flatMap((g) => g.items).find((i) => i.id === store.view)
  return !item?.roles || (!!store.user && item.roles.includes(store.user.role))
})
</script>

<template>
  <div>
    <!-- Dokumentasi API lama: sedang dialihkan ke Swagger -->
    <div v-if="isApiDocs" class="min-h-screen bg-background" />

    <!-- Memuat -->
    <div v-else-if="!booted" class="flex min-h-screen items-center justify-center bg-background">
      <div class="flex flex-col items-center gap-3">
        <img src="/logo/icon.svg" alt="Logo MedCredix" class="h-14 w-14 animate-pulse" />
        <div class="text-xs font-medium text-muted-foreground">Memuat MedCredix…</div>
      </div>
    </div>

    <!-- Halaman kesalahan: satu halaman penuh, tanpa sidebar, navbar, dan footer (sudah login maupun belum) -->
    <ErrorPage v-else-if="notFound" :code="404" :path="notFoundLabel" />

    <!-- Login -->
    <LoginScreen v-else-if="!store.user" />

    <ErrorPage v-else-if="bootError" :code="bootError" />
    <ErrorPage v-else-if="!allowed" :code="403" />

    <!-- Aplikasi -->
    <template v-else>
      <AppShell>
        <!-- key = RS aktif: saat ganti RS, halaman dibuat ulang sehingga datanya langsung dimuat ulang tanpa refresh manual -->
        <component :is="activeView" :key="store.hospitalId ?? 'rs'" />
        <WhyDrawer />
        <ActionDialog />
        <EvidenceDrawer />
      </AppShell>
    </template>
    <Toaster />
  </div>
</template>
