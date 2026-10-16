<script setup lang="ts">
// EvidenceView — daftar bukti data (skor, indikator, risiko, klaim, peringatan, regulasi).
import { Search } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import { fmtDateTime, fmtID } from '~/utils/format'
import Badge from '~/components/ui/Badge.vue'
import Input from '~/components/ui/Input.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const q = ref('')
const refType = ref('all')
const data = ref<any>(null)

// Jumlah bukti per jenis untuk kartu ringkasan. Diambil dari hasil tanpa filter,
// supaya angka kartu tidak ikut berubah saat pencarian / filter jenis dipakai.
const summary = ref<Record<string, number>>({})

async function load() {
  try {
    const params = new URLSearchParams()
    if (q.value) params.set('q', q.value)
    if (refType.value !== 'all') params.set('refType', refType.value)
    data.value = await api(`/evidence?${params}`)
    if (!q.value && refType.value === 'all') summary.value = data.value?.byType ?? {}
  } catch { data.value = null }
}
onMounted(load)
watch(refType, load)
let t: ReturnType<typeof setTimeout> | null = null
watch(q, () => { if (t) clearTimeout(t); t = setTimeout(load, 300) })
const items = computed(() => data.value?.items ?? [])

// Urutan kartu tetap; jenis lain yang muncul dari backend ditambahkan di belakang.
const CARD_ORDER = ['Skor', 'Indikator', 'Risiko', 'Klaim', 'Peringatan', 'Regulasi']
const cards = computed(() => {
  const extra = Object.keys(summary.value).filter((t) => !CARD_ORDER.includes(t)).sort()
  return [...CARD_ORDER, ...extra].map((t) => ({ type: t, count: summary.value[t] ?? 0 }))
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Evidence Center"
      sub="Tempat semua bukti hidup: sumber, timestamp, jumlah record, resource FHIR, status validasi. Tidak pernah ada bukti yang dipalsukan." demo
    />
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <button
        v-for="c in cards" :key="c.type" type="button"
        :class="['rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-brand/50', refType === c.type ? 'border-brand ring-1 ring-brand' : '']"
        :title="`Tampilkan bukti ${c.type}`"
        @click="refType = refType === c.type ? 'all' : c.type"
      >
        <div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{{ c.type }}</div>
        <div class="mt-0.5 font-display text-xl font-bold text-brand">{{ c.count }}</div>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 sm:flex sm:flex-wrap sm:items-center">
      <div class="relative col-span-2 sm:w-72">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="q" placeholder="Cari judul, metrik, atau sistem sumber…" class="h-9 w-full pl-8 text-xs" />
      </div>
      <div class="col-span-2 w-full sm:w-52">
        <Select v-model="refType">
          <SelectOption value="all">Semua Jenis Referensi</SelectOption>
          <SelectOption v-for="t in ['Skor', 'Risiko', 'Klaim', 'Peringatan', 'Indikator', 'Regulasi', 'Aksi', 'Kredensial']" :key="t" :value="t">{{ t }}</SelectOption>
        </Select>
      </div>
      <span class="col-span-2 text-right text-xs text-muted-foreground sm:ml-auto">{{ items.length }} item bukti</span>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <div v-for="e in items" :key="e.id" class="rounded-xl border bg-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <Badge variant="outline" class="text-[9px] font-bold">{{ e.refType }}</Badge>
            <h3 class="mt-1.5 text-xs font-semibold leading-snug">{{ e.title }}</h3>
            <div class="mt-1 font-display text-lg font-bold text-brand">{{ e.value }}{{ e.unit === '%' ? '%' : ` ${e.unit ?? ''}` }}</div>
          </div>
          <StatusBadge :status="e.validationStatus" />
        </div>
        <div class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2.5 text-[10px] text-muted-foreground">
          <span>{{ e.metric }}</span>
          <span>· {{ fmtID(e.recordCount ?? 0) }} record</span>
          <span>· Sumber: {{ e.sourceSystem }}</span>
          <span v-if="e.fhirResource">· FHIR: {{ e.fhirResource }}</span>
          <span>· Sync: {{ fmtDateTime(e.lastSyncAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
