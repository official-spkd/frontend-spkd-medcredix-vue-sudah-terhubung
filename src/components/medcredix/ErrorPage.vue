<script setup lang="ts">
// ErrorPage — halaman kesalahan (404, 403, 500, 503), selalu satu halaman penuh:
// tanpa sidebar, navbar, dan footer, baik sudah login maupun belum.
// Sudah login: tombol ke Dashboard. Belum login: tombol ke halaman masuk.
import { ArrowLeft, Home, LogIn, RotateCw } from 'lucide-vue-next'
import { computed } from 'vue'
import { useMedCredix } from '~/stores/medcredix'
import Button from '~/components/ui/Button.vue'

const props = defineProps<{
  code: 404 | 403 | 500 | 503
  path?: string | null
}>()

const store = useMedCredix()

const INFO: Record<number, { title: string; desc: string }> = {
  404: {
    title: 'Halaman tidak ditemukan',
    desc: 'Alamat yang Anda buka tidak ada di MedCredix. Periksa kembali alamatnya atau kembali ke halaman utama.',
  },
  403: {
    title: 'Akses ditolak',
    desc: 'Halaman ini tidak tersedia untuk peran Anda. Kembali ke Dashboard untuk membuka halaman lain.',
  },
  500: {
    title: 'Terjadi kesalahan pada server',
    desc: 'Server MedCredix sedang mengalami gangguan. Coba muat ulang beberapa saat lagi.',
  },
  503: {
    title: 'Server tidak dapat dihubungi',
    desc: 'Periksa koneksi internet Anda atau pastikan layanan backend MedCredix sedang berjalan.',
  },
}
const info = computed(() => INFO[props.code])
const loggedIn = computed(() => !!store.user)
const role = computed(() => store.user?.roleLabel ?? store.user?.role ?? '')
const canRetry = computed(() => props.code === 500 || props.code === 503)
const canBack = computed(() => (props.code === 404 || props.code === 403) && typeof window !== 'undefined' && window.history.length > 1)
// Logo terang untuk latar putih, logo biasa (teks putih) untuk mode gelap
const logo = computed(() => (store.theme === 'dark' ? '/logo/logo.svg' : '/logo/logo-terang.svg'))

const toHome = () => (loggedIn.value ? store.navigate('dashboard') : window.location.replace('/'))
const back = () => window.history.back()
const retry = () => window.location.reload()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10" role="alert">
    <img :src="logo" alt="MedCredix" class="mb-12 h-12 w-auto" />

    <div class="flex flex-col items-center gap-4 lg:flex-row lg:gap-10">
      <span class="font-display text-8xl font-bold leading-none tracking-tight text-brand lg:text-9xl dark:text-brand-2">{{ code }}</span>
      <span class="hidden h-28 w-px bg-border lg:block" aria-hidden="true" />
      <span class="text-center font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:whitespace-nowrap lg:text-left lg:text-5xl">{{ info.title }}</span>
    </div>

    <p class="mt-10 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-lg">
      {{ info.desc }}
      <template v-if="code === 403 && role"> Peran saat ini: <span class="font-medium text-foreground">{{ role }}</span>.</template>
    </p>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      <Button v-if="canRetry" @click="retry"><RotateCw class="h-4 w-4" /> Coba lagi</Button>
      <Button v-if="canBack" variant="outline" @click="back"><ArrowLeft class="h-4 w-4" /> Kembali</Button>
      <Button :variant="canRetry ? 'outline' : 'default'" @click="toHome">
        <template v-if="loggedIn"><Home class="h-4 w-4" /> Ke Dashboard</template>
        <template v-else><LogIn class="h-4 w-4" /> Ke halaman masuk</template>
      </Button>
    </div>
  </div>
</template>
