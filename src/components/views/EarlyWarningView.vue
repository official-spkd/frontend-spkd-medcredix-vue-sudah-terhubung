<script setup lang="ts">
// EarlyWarningView — port dari views-risk.tsx (EarlyWarningView).
import { AlertTriangle, CheckCircle2, UserPlus, PlusCircle, Bell, BellRing, Info, Clock } from 'lucide-vue-next'
import { useMedCredix } from '~/stores/medcredix'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import { fmtDate, fmtDateTime } from '~/utils/format'
import Button from '~/components/ui/Button.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const severity = ref('all')
const data = ref<any>(null)

// Peringatan yang sudah Teratasi tidak ditampilkan di daftar aktif; bisa dimunculkan lagi lewat tombol.
const showResolved = ref(false)
const resolvedCount = computed(() => (data.value?.warnings ?? []).filter((w: any) => w.status === 'Teratasi').length)
const activeCount = computed(() => (data.value?.warnings?.length ?? 0) - resolvedCount.value)
const shown = computed(() => (data.value?.warnings ?? []).filter((w: any) => showResolved.value || w.status !== 'Teratasi'))

// Tombol mengikuti izin peran (internal/auth/rbac.go): Diketahui & Tugaskan butuh ASSIGN,
// Tandai Teratasi butuh RESOLVE, Buat Tindakan butuh CREATE. Tanpa izin, tombol tetap tampil tapi nonaktif.
const canAssign = computed(() => store.can('ASSIGN'))
const canResolve = computed(() => store.can('RESOLVE'))
const canCreate = computed(() => store.can('CREATE'))
const missing = computed(() => [
  !canAssign.value && 'Diketahui / Tugaskan (ASSIGN)',
  !canResolve.value && 'Tandai Teratasi (RESOLVE)',
  !canCreate.value && 'Buat Tindakan (CREATE)',
].filter(Boolean).join(', '))

async function load() {
  try {
    const qs = `${severity.value !== 'all' ? `severity=${severity.value}&` : ''}${store.hospitalId ? `hospitalId=${store.hospitalId}` : ''}`
    data.value = await api(`/warnings?${qs}`)
  } catch { data.value = { warnings: [], rules: [] } }
}
onMounted(load)
watch([severity, () => store.hospitalId], load)

async function patchW(w: any, action: string, extra?: any) {
  try {
    await api('/warnings', { method: 'PATCH', body: { id: w.id, action, ...extra } })
    toast({ title: `${w.code} → ${action === 'ack' ? 'Diketahui' : action === 'assign' ? 'Ditugaskan' : 'Teratasi'}` })
    load()
  } catch (e: any) {
    toast({ title: 'Gagal', description: e?.message, variant: 'destructive' })
  }
}

// `document` tidak bisa dipakai langsung di template Vue.
function scrollToRules() {
  document.getElementById('aturan-warning')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Early Warning Center" sub="MedCredix bekerja lebih dulu — Anda tidak perlu menatap dashboard sepanjang hari." demo>
      <template #actions>
        <Button variant="outline" size="sm" class="gap-1.5" @click="scrollToRules">
          <Bell class="h-3.5 w-3.5" /> Aturan Ambang
        </Button>
      </template>
    </PageHeader>

    <div v-if="missing" class="flex items-start gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-[11px] text-muted-foreground">
      <Info class="mt-px h-3.5 w-3.5 shrink-0" />
      <span>Peran Anda tidak memiliki izin untuk: {{ missing }}. Tombol tersebut dinonaktifkan.</span>
    </div>

    <div class="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <BellRing class="h-4 w-4 text-warning" />
      <button
        v-for="s in ['all', 'Tinggi', 'Sedang', 'Rendah']" :key="s"
        :class="['inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold transition-colors sm:h-7 sm:rounded-lg sm:px-3', severity === s ? 'bg-brand text-white' : 'border border-input bg-card hover:bg-muted/60']"
        @click="severity = s"
      >
        {{ s === 'all' ? 'Semua' : s }}
      </button>
      <span class="w-full text-right text-xs text-muted-foreground sm:ml-auto sm:w-auto">
        <span class="mr-1.5 hidden text-[10px] text-muted-foreground/80 md:inline">Urut: status, lalu waktu deteksi terbaru ·</span>
        {{ activeCount }} peringatan aktif
        <button
          v-if="resolvedCount" type="button" class="ml-1.5 font-semibold text-brand-2 hover:underline"
          @click="showResolved = !showResolved"
        >{{ showResolved ? 'Sembunyikan' : 'Tampilkan' }} {{ resolvedCount }} yang teratasi</button>
      </span>
    </div>

    <div v-if="data && !shown.length" class="rounded-xl border border-dashed bg-card py-10 text-center text-sm text-muted-foreground">Tidak ada peringatan aktif.</div>
    <div class="grid gap-3 lg:grid-cols-2">
      <div
        v-for="w in shown" :key="w.id"
        :class="['rounded-xl border bg-card p-4', w.severity === 'Tinggi' ? 'border-danger/30' : w.severity === 'Sedang' ? 'border-warning/30' : 'border-border']"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex gap-2.5">
            <AlertTriangle :class="['mt-0.5 h-4 w-4 shrink-0', w.severity === 'Tinggi' ? 'text-danger' : w.severity === 'Sedang' ? 'text-warning' : 'text-info']" />
            <div>
              <h3 class="font-display text-sm font-semibold leading-snug">{{ w.title }}</h3>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ w.description }}</p>
            </div>
          </div>
          <StatusBadge :status="w.status" />
        </div>
        <!-- Timestamp deteksi: dasar urutan daftar (status, lalu waktu deteksi terbaru). -->
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span class="inline-flex items-center gap-1" :title="w.detectedAt ? `Terdeteksi ${fmtDateTime(w.detectedAt)}` : 'Waktu deteksi belum tercatat'">
            <Clock class="h-3 w-3" /> Terdeteksi {{ w.detectedAt ? fmtDateTime(w.detectedAt) : '—' }}
          </span>
          <span v-if="w.acknowledgedAt" class="inline-flex items-center gap-1">
            <CheckCircle2 class="h-3 w-3" /> Ditanggapi {{ fmtDateTime(w.acknowledgedAt) }}
          </span>
          <span v-if="w.dueDate">Tenggat {{ fmtDate(w.dueDate) }}</span>
        </div>
        <div class="mt-3 space-y-1 rounded-lg bg-muted/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <div>IF {{ w.thresholdRule }}</div>
          <div>THEN alert {{ w.severity.toLowerCase() }} → {{ w.triggerValue }}</div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
          <Button v-if="w.status === 'Baru'" size="sm" variant="outline" class="h-7 gap-1 text-[11px]" :disabled="!canAssign" :title="canAssign ? undefined : 'Butuh izin ASSIGN'" @click="patchW(w, 'ack')">
            <CheckCircle2 class="h-3 w-3" /> Diketahui
          </Button>
          <Button v-if="w.status === 'Diketahui'" size="sm" variant="outline" class="h-7 gap-1 text-[11px]" :disabled="!canAssign" :title="canAssign ? undefined : 'Butuh izin ASSIGN'" @click="patchW(w, 'assign', { assignee: w.acknowledgedBy ?? 'Petugas Kredensial' })">
            <UserPlus class="h-3 w-3" /> Tugaskan
          </Button>
          <Button v-if="['Baru', 'Diketahui', 'Ditugaskan'].includes(w.status)" size="sm" variant="outline" class="h-7 gap-1 text-[11px]" :disabled="!canResolve" :title="canResolve ? undefined : 'Butuh izin RESOLVE'" @click="patchW(w, 'resolve')">
            <CheckCircle2 class="h-3 w-3" /> Tandai Teratasi
          </Button>
          <Button size="sm" variant="ghost" class="h-7 gap-1 text-[11px]" :disabled="!canCreate" :title="canCreate ? undefined : 'Butuh izin CREATE'" @click="store.openAction({ title: w.title, description: w.description, sourceType: 'Peringatan', sourceRef: w.code, priority: w.severity })">
            <PlusCircle class="h-3 w-3" /> Buat Tindakan
          </Button>
          <span class="ml-auto text-[10px] text-muted-foreground">{{ w.acknowledgedBy ? `Di-ack ${w.acknowledgedBy.split(',')[0]}` : '' }}</span>
        </div>
      </div>
    </div>

    <div id="aturan-warning">
      <SectionCard title="Aturan Ambang (Alert Rules)" sub="Konfigurabel: ambang, tingkat keparahan, kanal (in-app, email, WhatsApp-ready, push-ready)">
        <div class="overflow-x-auto rounded-xl border">
          <table class="w-full text-xs">
            <thead class="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th class="px-3 py-2.5">Aturan</th><th class="px-3 py-2.5">Domain</th><th class="px-3 py-2.5">Kondisi</th>
                <th class="px-3 py-2.5">Tingkat</th><th class="px-3 py-2.5">Kanal</th><th class="px-3 py-2.5 text-right">Terpicu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data?.rules ?? []" :key="r.id" class="border-t">
                <td class="px-3 py-2.5 font-medium">{{ r.name }}</td>
                <td class="px-3 py-2.5 text-muted-foreground">{{ r.domain }}</td>
                <td class="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{{ r.condition }}</td>
                <td class="px-3 py-2.5"><StatusBadge :status="r.severity" :tone="r.severity === 'Tinggi' ? 'danger' : r.severity === 'Sedang' ? 'warning' : 'info'" /></td>
                <td class="px-3 py-2.5 text-[10px] text-muted-foreground">{{ r.channels }}</td>
                <td class="px-3 py-2.5 text-right">{{ r.triggeredCount }}× · {{ fmtDate(r.lastTriggeredAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
