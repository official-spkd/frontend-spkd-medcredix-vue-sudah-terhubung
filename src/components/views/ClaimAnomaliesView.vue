<script setup lang="ts">
// ClaimAnomaliesView — port dari views-claims.tsx (ClaimAnomaliesView).
import { ShieldAlert, PlusCircle, CheckCircle2, ScanSearch, Eye, Info, Search, X, Lock } from 'lucide-vue-next'
import { useMedCredix } from '~/stores/medcredix'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref } from 'vue'
import { api } from '~/composables/useApi'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
// Tombol mengikuti izin peran (internal/auth/rbac.go): Ditinjau/Klarifikasi/Konfirmasi butuh EDIT,
// Buat Tindakan butuh CREATE. Tanpa izin, tombol tetap tampil tapi nonaktif (mis. Komite Medis).
const canEdit = computed(() => store.can('EDIT'))
const canCreate = computed(() => store.can('CREATE'))
const missing = computed(() => [
  !canEdit.value && 'Tandai Ditinjau, Klarifikasi, Konfirmasi Bermasalah (EDIT)',
  !canCreate.value && 'Buat Tindakan (CREATE)',
].filter(Boolean).join('; '))
const status = ref('all')
const data = ref<any>(null)

async function load() {
  try { data.value = await api('/claims') } catch { data.value = null }
}
onMounted(load)

// Tampilan tombol yang terkunci karena izin: abu-abu + ikon gembok, supaya tidak terlihat aktif
// (sebelumnya hanya opacity 50%, dan "Konfirmasi Bermasalah" tetap merah sehingga dikira masih bisa diklik).
const lockedCls = 'cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground opacity-100 hover:bg-muted/40'
const editHint = 'Peran Anda tidak memiliki izin EDIT'

async function review(a: any, action: string) {
  if (!canEdit.value) return
  try {
    await api('/claims', { method: 'PATCH', body: { anomalyId: a.id, action } })
    toast({ title: `Anomali ${a.claimNumber}: ${action === 'confirm' ? 'terkonfirmasi bermasalah' : action === 'clarify' ? 'diklarifikasi' : 'ditinjau'}` })
    load()
  } catch (e: any) {
    toast({ title: 'Gagal', description: e?.message, variant: 'destructive' })
  }
}
// Pencarian: no. klaim, judul, deskripsi, kategori, atau tingkat keparahan (tanpa beda huruf besar/kecil).
const q = ref('')
const norm = (s: unknown) => String(s ?? '').toLowerCase()
const anomalies = computed(() => {
  const terms = norm(q.value).split(/\s+/).filter(Boolean)
  return (data.value?.anomalies ?? []).filter((a: any) => {
    if (status.value !== 'all' && a.status !== status.value) return false
    if (!terms.length) return true
    const hay = [a.claimNumber, a.title, a.description, a.category, a.severity].map(norm).join(' ')
    return terms.every((t) => hay.includes(t))
  })
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Anomali Klaim"
      sub="Upcoding/downcoding, medication mismatch, stock-claim triangle, timeline — semua sinyal netral yang memerlukan peninjauan manusia." demo
    />
    <div v-if="missing" class="flex items-start gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-[11px] text-muted-foreground">
      <Info class="mt-px h-3.5 w-3.5 shrink-0" />
      <span>Peran Anda tidak memiliki izin untuk: {{ missing }}. Tombol tersebut dinonaktifkan.</span>
    </div>
    <div class="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <ShieldAlert class="h-4 w-4 text-warning" />
      <button
        v-for="s in ['all', 'Baru', 'Ditinjau', 'Terkonfirmasi Bermasalah', 'Diklarifikasi']" :key="s"
        :class="['inline-flex h-7 items-center rounded-lg px-3 text-xs font-semibold transition-colors', status === s ? 'bg-brand text-white' : 'border border-input bg-card hover:bg-muted/60']"
        @click="status = s"
      >{{ s === 'all' ? 'Semua' : s }}</button>
      <span class="ml-auto text-xs text-muted-foreground">{{ anomalies.length }} sinyal</span>
    </div>
    <div class="relative sm:w-80">
      <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="q" placeholder="Cari no. klaim, judul, kategori…" class="h-9 w-full pl-8 pr-8 text-xs" />
      <button
        v-if="q" type="button" aria-label="Hapus pencarian"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        @click="q = ''"
      ><X class="h-3.5 w-3.5" /></button>
    </div>
    <p v-if="data && !anomalies.length" class="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
      {{ q ? `Tidak ada sinyal yang cocok dengan "${q}".` : 'Tidak ada sinyal untuk filter ini.' }}
    </p>

    <div class="grid gap-3 lg:grid-cols-2">
      <div
        v-for="a in anomalies" :key="a.id"
        :class="['rounded-xl border bg-card p-4', a.severity === 'Tinggi' && 'border-danger/30', a.severity === 'Sedang' && 'border-warning/30']"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <StatusBadge :status="a.severity" :tone="a.severity === 'Tinggi' ? 'danger' : a.severity === 'Sedang' ? 'warning' : 'info'" />
              <Badge variant="outline" class="text-[10px]">{{ a.category }}</Badge>
              <StatusBadge :status="a.status" />
            </div>
            <h3 class="mt-2 font-display text-sm font-semibold">{{ a.claimNumber }} — {{ a.title }}</h3>
            <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{{ a.description }}</p>
          </div>
        </div>
        <div class="mt-3 rounded-lg bg-brand-2-light/40 px-3 py-2 text-[11px] leading-relaxed text-brand-2-dark">
          <strong>Cara penyelesaian:</strong> {{ a.recommendation }}
        </div>
        <div class="mt-2.5 flex flex-wrap gap-1.5 border-t pt-3">
          <!-- Tombol nonaktif dibungkus span agar tooltip tetap muncul (button disabled tidak menerima hover). -->
          <span v-if="a.status === 'Baru'" :title="canEdit ? undefined : editHint" :class="!canEdit && 'cursor-not-allowed'">
            <Button
              size="sm" variant="outline" :class="['h-7 gap-1 text-[11px]', !canEdit && lockedCls]"
              :disabled="!canEdit" :aria-disabled="!canEdit" @click="review(a, 'review')"
            ><Lock v-if="!canEdit" class="h-3 w-3" /><Eye v-else class="h-3 w-3" /> Tandai Ditinjau</Button>
          </span>
          <span v-if="a.status !== 'Diklarifikasi'" :title="canEdit ? undefined : editHint" :class="!canEdit && 'cursor-not-allowed'">
            <Button
              size="sm" variant="outline" :class="['h-7 gap-1 text-[11px]', !canEdit && lockedCls]"
              :disabled="!canEdit" :aria-disabled="!canEdit" @click="review(a, 'clarify')"
            ><Lock v-if="!canEdit" class="h-3 w-3" /><CheckCircle2 v-else class="h-3 w-3" /> Klarifikasi (terjelaskan)</Button>
          </span>
          <span v-if="a.status !== 'Terkonfirmasi Bermasalah'" :title="canEdit ? undefined : editHint" :class="!canEdit && 'cursor-not-allowed'">
            <Button
              size="sm" variant="outline" :class="['h-7 gap-1 text-[11px]', canEdit ? 'text-danger' : lockedCls]"
              :disabled="!canEdit" :aria-disabled="!canEdit" @click="review(a, 'confirm')"
            ><Lock v-if="!canEdit" class="h-3 w-3" /><ScanSearch v-else class="h-3 w-3" /> Konfirmasi Bermasalah</Button>
          </span>
          <span class="ml-auto" :title="canCreate ? undefined : 'Peran Anda tidak memiliki izin CREATE'" :class="!canCreate && 'cursor-not-allowed'">
            <Button
              size="sm" variant="ghost" :class="['h-7 gap-1 text-[11px]', !canCreate && 'text-muted-foreground opacity-60']"
              :disabled="!canCreate" :aria-disabled="!canCreate"
              @click="store.openAction({ title: `Selesaikan sinyal ${a.category} pada ${a.claimNumber}`, description: a.description, sourceType: 'Klaim', sourceRef: a.claimNumber ?? '', priority: a.severity })"
            ><Lock v-if="!canCreate" class="h-3 w-3" /><PlusCircle v-else class="h-3 w-3" /> Buat Tindakan</Button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
