<script setup lang="ts">
// LoginScreen — port dari components/medcredix/login.tsx (SPKD brand).
import { Activity, BookOpen, Check, Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldCheck, TrendingUp, Radar } from 'lucide-vue-next'
import { useMedCredix, type SessionUser } from '~/stores/medcredix'
import { nextTick, ref } from 'vue'
import { api, setToken } from '~/composables/useApi'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import Label from '~/components/ui/Label.vue'

const store = useMedCredix()
const email = ref('')
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const DEMO_ACCOUNTS = [
  { email: 'admin@nusantarasehat.co.id', role: 'Admin RS', init: 'AR', spkd: false },
  { email: 'manajemen@nusantarasehat.co.id', role: 'Manajemen RS', init: 'MR', spkd: false },
  { email: 'kredensial@nusantarasehat.co.id', role: 'Petugas Kredensial', init: 'PK', spkd: false },
  { email: 'komite@nusantarasehat.co.id', role: 'Komite Medis', init: 'KM', spkd: false },
  { email: 'klaim@nusantarasehat.co.id', role: 'Tim Klaim', init: 'TK', spkd: false },
  { email: 'it@nusantarasehat.co.id', role: 'IT / SIMRS', init: 'IT', spkd: false },
  { email: 'sdm@nusantarasehat.co.id', role: 'SDM / HR', init: 'SD', spkd: false },
  { email: 'viewer@nusantarasehat.co.id', role: 'Viewer', init: 'VW', spkd: false },
  { email: 'admin@medikasejahtera.co.id', role: 'Admin RS Medika', init: 'AM', spkd: false },
  { email: 'auditor@spkd.co.id', role: 'Auditor', init: 'AU', spkd: true },
  { email: 'superadmin@spkd.co.id', role: 'SPKD Super Admin', init: 'SA', spkd: true },
  { email: 'auditorbpjs@spkd.co.id', role: 'Auditor BPJS', init: 'AB', spkd: true },
]

// Klik akun demo: isi email saja, kata sandi tetap diketik manual
async function pickAccount(addr: string) {
  email.value = addr
  password.value = ''
  error.value = null
  await nextTick()
  document.getElementById('password')?.focus()
}

async function submit() {
  loading.value = true
  error.value = null
  try {
    const res = await api<any>('/auth', { method: 'POST', body: { email: email.value, password: password.value } })
    // backend Go: { token, expiresAt, user } — mode demo: langsung SessionUser
    const user: SessionUser = res?.user ?? res
    if (res?.token) setToken(res.token)
    let hospitalId = user.hospitalId
    if (!hospitalId) {
      // Super Admin / Auditor BPJS tanpa RS: pilih RS pertama, bisa diganti dari header
      const boot = await api<any>('/bootstrap')
      hospitalId = boot?.hospitals?.[0]?.id ?? null
    }
    store.login(user, res?.token, hospitalId)
  } catch (e: any) {
    error.value = e?.message ?? 'Gagal masuk.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
    <!-- Panel kiri: brand -->
    <div class="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--sidebar)_0%,#13265e_55%,#1b3878_100%)] p-10 text-white lg:flex">
      <div class="relative">
        <img src="/logo/logo.svg" alt="MedCredix — Medical Credentialing Intelligence" class="h-28 w-auto max-w-full object-contain" />
        <h1 class="mt-14 max-w-md font-display text-4xl font-bold leading-tight">
          From Hospital Data<br />to Action.
        </h1>
        <p class="mt-4 max-w-md text-sm leading-relaxed text-white/80">
          Platform kredensial & inteligensi rumah sakit dari <strong>PT Sistem Pelayanan Kesehatan dan Data (SPKD)</strong>.
          Pahami kondisi rumah sakit Anda, lihat risikonya, ketahui alasannya — lalu ambil tindakan.
        </p>
      </div>
      <div class="relative grid max-w-lg grid-cols-3 gap-3">
        <div v-for="f in [
          { icon: Activity, t: 'Skor', d: '9 domain kesehatan RS, dapat ditelusuri' },
          { icon: Radar, t: 'Risiko', d: 'Deteksi dini & bukti, bahasa netral' },
          { icon: TrendingUp, t: 'Aksi', d: 'Closed-loop hingga skor membaik' },
        ]" :key="f.t" class="rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
          <component :is="f.icon" class="mb-2 h-5 w-5 text-white" aria-hidden />
          <div class="font-display text-sm font-semibold">{{ f.t }}</div>
          <div class="mt-0.5 text-[11px] leading-snug text-white/70">{{ f.d }}</div>
        </div>
      </div>
      <div class="relative flex items-center gap-2 text-[11px] text-white/60">
        <ShieldCheck class="h-3.5 w-3.5" /> RBAC · Audit Trail · FHIR-ready · SATUSEHAT · Isolasi multi-tenant
      </div>
    </div>

    <!-- Panel kanan: form login -->
    <div class="flex items-center justify-center bg-background p-6">
      <div class="w-full max-w-[34rem] rounded-xl border border-border/80 bg-card shadow-sm">
        <div class="p-8">
          <!-- Versi teks gelap supaya terbaca di kartu putih -->
          <div class="mb-6 flex justify-center lg:hidden">
            <img src="/logo/logo-terang.svg" alt="MedCredix — Medical Credentialing Intelligence" class="h-20 w-auto max-w-full object-contain" />
          </div>
          <h2 class="font-display text-xl font-bold">Masuk ke MedCredix</h2>
          <p class="mt-1 text-sm text-muted-foreground">Gunakan akun yang dibuatkan Super Admin platform Anda.</p>

          <form class="mt-6 space-y-4" @submit.prevent="submit">
            <div class="space-y-1.5">
              <Label for="email" class="text-xs font-semibold">Email</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" v-model="email" type="email" class="pl-9" placeholder="nama@rumahsakit.co.id" required />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="password" class="text-xs font-semibold">Kata Sandi</Label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" v-model="password" :type="showPw ? 'text' : 'password'" class="pl-9 pr-10" required />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" :aria-label="showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPw = !showPw">
                  <EyeOff v-if="showPw" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div v-if="error" class="rounded-lg bg-danger-light px-3 py-2 text-xs font-medium text-danger">{{ error }}</div>
            <Button type="submit" :disabled="loading" class="w-full bg-brand hover:bg-brand-hover">
              <Loader2 v-if="loading" class="h-4 w-4 animate-spin" /><LogIn v-else class="h-4 w-4" /> Masuk
            </Button>
          </form>

          <div class="mt-6">
            <div class="mb-2.5 flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Akun demo</span>
              <span class="text-[11px] text-muted-foreground">Klik untuk mengisi email</span>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                v-for="a in DEMO_ACCOUNTS" :key="a.email" type="button"
                class="group flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2 py-2 text-left transition-colors hover:border-brand-2/60 hover:bg-brand-2-light/40"
                :class="email === a.email ? 'border-brand-2 bg-brand-2-light/50' : 'border-border'"
                @click="pickAccount(a.email)"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  :class="a.spkd ? 'bg-brand-2-light text-brand-2-dark' : 'bg-brand-light text-brand'"
                >
                  <Check v-if="email === a.email" class="h-4 w-4" />
                  <template v-else>{{ a.init }}</template>
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-xs font-semibold text-foreground">{{ a.role }}</span>
                  <span class="block truncate text-[10.5px] text-muted-foreground" :title="a.email">{{ a.email }}</span>
                </span>
              </button>
            </div>
          </div>
          <p class="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
            Seluruh data pada lingkungan demo ini fiktif dan berlabel DEMO. Tidak ada data pasien nyata.
          </p>
          <a href="/api_v1_documentation_medcredix/" target="_blank" rel="noopener" class="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-2 hover:underline">
            <BookOpen class="h-3.5 w-3.5" /> Dokumentasi API
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
