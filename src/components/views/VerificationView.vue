<script setup lang="ts">
// VerificationView — port dari views-credentialing.tsx (VerificationView).
import { BadgeCheck, CheckCircle2, XCircle, Clock, Eye, FileText } from 'lucide-vue-next'
import { expiryLabel, fmtDate } from '~/utils/format'
import { useMedCredix } from '~/stores/medcredix'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref } from 'vue'
import { api, openFile } from '~/composables/useApi'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import EmptyState from '~/components/medcredix/EmptyState.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const data = ref<any>(null)
const docs = ref<any[]>([])
async function load() {
  const [cr, dc] = await Promise.allSettled([api('/credentials'), api('/documents')])
  data.value = cr.status === 'fulfilled' ? cr.value : { credentials: [] }
  docs.value = dc.status === 'fulfilled' ? (dc.value as any).documents ?? [] : []
}
onMounted(load)
// Tombol hanya muncul untuk peran yang punya izinnya (sama dengan aturan backend):
// VERIFY = verifikasi dokumen & teruskan ke komite, APPROVE = setujui/tolak.
const canVerify = computed(() => !!store.user?.permissions.includes('VERIFY'))
const canApprove = computed(() => !!store.user?.permissions.includes('APPROVE'))
function hasAction(c: any) {
  if (c.status === 'Diajukan' || c.status === 'Verifikasi') return canVerify.value
  if (c.status === 'Tinjauan Komite') return canApprove.value
  return false
}
function waitingNote(c: any) {
  if (c.status === 'Tinjauan Komite') return 'Menunggu keputusan Komite Medis.'
  return c.status === 'Diajukan' ? 'Menunggu verifikasi dokumen oleh petugas kredensial.' : 'Menunggu diteruskan ke Komite Medis.'
}
const queue = computed(() =>
  (data.value?.credentials ?? []).filter((c: any) => ['Diajukan', 'Verifikasi', 'Tinjauan Komite'].includes(c.status)),
)
// Dokumen yang diunggah lewat menu Dokumen masuk antrean ini sampai diverifikasi atau ditolak,
// termasuk dokumen untuk kredensial yang sudah Aktif (mis. SIP perpanjangan).
const credById = computed(() => new Map((data.value?.credentials ?? []).map((c: any) => [c.id, c])))
const docQueue = computed(() => docs.value.filter((d) => d.status === 'Menunggu Verifikasi'))
const busyDoc = ref('')
async function decideDoc(d: any, action: 'verify' | 'reject') {
  busyDoc.value = d.id
  try {
    await api('/documents', { method: 'PATCH', body: { id: d.id, action } })
    toast({ title: `${action === 'verify' ? 'Dokumen diverifikasi' : 'Dokumen ditolak'}: ${d.fileName}` })
    load()
  } catch (e: any) {
    toast({ title: 'Ditolak', description: e?.message, variant: 'destructive' })
  } finally { busyDoc.value = '' }
}
async function viewDoc(d: any) {
  try { await openFile(`/documents/file?id=${encodeURIComponent(d.id)}`) } catch (e: any) {
    toast({ title: 'Dokumen tidak dapat dibuka', description: e?.message, variant: 'destructive' })
  }
}
const ACTION_LABEL: Record<string, string> = {
  verify: 'Dokumen terverifikasi', review: 'Diteruskan ke komite', approve: 'Disetujui', reject: 'Ditolak komite',
}
async function transition(c: any, action: string) {
  try {
    await api('/credentials', { method: 'PATCH', body: { id: c.id, action } })
    toast({ title: `${ACTION_LABEL[action] ?? action}: ${c.type} ${c.practitionerName ?? ''}` })
    load()
  } catch (e: any) {
    toast({ title: 'Ditolak', description: e?.message, variant: 'destructive' })
  }
}
function toneCls(tone: string) {
  return tone === 'danger' ? 'bg-danger-light text-danger' : tone === 'warning' ? 'bg-warning-light text-warning' : tone === 'success' ? 'bg-success-light text-success' : 'bg-muted text-muted-foreground'
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Verifikasi & Persetujuan"
      sub="Alur kerja petugas kredensial → komite medis. Setiap keputusan tercatat immutable di Audit Trail." demo
    />
    <EmptyState
      v-if="queue.length === 0 && docQueue.length === 0" title="Antrean verifikasi kosong"
      desc="Tidak ada kredensial atau dokumen yang menunggu verifikasi atau persetujuan komite saat ini."
    >
      <template #icon><BadgeCheck class="h-5 w-5" /></template>
    </EmptyState>
    <div v-if="docQueue.length" class="space-y-2">
      <h3 class="text-sm font-semibold">Dokumen menunggu verifikasi <span class="text-muted-foreground">({{ docQueue.length }})</span></h3>
      <div class="grid gap-3 lg:grid-cols-2">
        <div v-for="d in docQueue" :key="d.id" class="rounded-xl border bg-card p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <Badge v-if="credById.get(d.credentialId)" variant="outline" class="text-[9px] font-bold">{{ (credById.get(d.credentialId) as any).type }}</Badge>
                <StatusBadge :status="d.status" />
              </div>
              <div v-if="credById.get(d.credentialId)" class="mt-1.5 text-sm font-semibold leading-snug">{{ (credById.get(d.credentialId) as any).practitionerName }}</div>
              <div class="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText class="h-3.5 w-3.5 shrink-0 text-brand-2" />
                <span class="truncate">{{ d.fileName }}</span>
                <span v-if="d.sizeKb" class="shrink-0">· {{ d.sizeKb }} KB</span>
                <span v-if="d.uploadedAt" class="shrink-0">· diunggah {{ fmtDate(d.uploadedAt) }}</span>
              </div>
            </div>
            <Button
              size="icon" variant="outline" class="h-8 w-8 shrink-0" :disabled="!d.hasFile"
              :title="d.hasFile ? `Lihat dokumen: ${d.fileName}` : 'Berkas belum tersedia'" @click="viewDoc(d)"
            >
              <Eye class="h-3.5 w-3.5" />
            </Button>
          </div>
          <div v-if="!canVerify" class="mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] text-muted-foreground">
            <Clock class="h-3.5 w-3.5 shrink-0" /> Menunggu verifikasi dokumen oleh petugas kredensial.
          </div>
          <div v-else class="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            <Button size="sm" class="h-7 gap-1 bg-success text-xs hover:bg-success" :disabled="busyDoc === d.id" @click="decideDoc(d, 'verify')">
              <CheckCircle2 class="h-3.5 w-3.5" /> Verifikasi Dokumen
            </Button>
            <Button size="sm" variant="outline" class="h-7 gap-1 text-xs text-danger" :disabled="busyDoc === d.id" @click="decideDoc(d, 'reject')">
              <XCircle class="h-3.5 w-3.5" /> Tolak
            </Button>
          </div>
        </div>
      </div>
    </div>
    <h3 v-if="queue.length && docQueue.length" class="text-sm font-semibold">Kredensial <span class="text-muted-foreground">({{ queue.length }})</span></h3>
    <div v-if="queue.length" class="grid gap-3 lg:grid-cols-2">
      <div v-for="c in queue" :key="c.id" class="rounded-xl border bg-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" class="text-[9px] font-bold">{{ c.type }}</Badge>
              <StatusBadge :status="c.status" />
            </div>
            <div class="mt-1.5 text-sm font-semibold leading-snug">{{ c.practitionerName }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">{{ c.name.split('—')[0] }} · {{ c.number }} · berakhir {{ fmtDate(c.expiryDate) }}</div>
          </div>
          <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', toneCls(expiryLabel(c.expiryDate).tone)]">
            <Clock class="h-3 w-3" /> {{ expiryLabel(c.expiryDate).text }}
          </span>
        </div>
        <div v-if="!hasAction(c)" class="mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] text-muted-foreground">
          <Clock class="h-3.5 w-3.5 shrink-0" /> {{ waitingNote(c) }}
        </div>
        <div v-else class="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
          <Button v-if="c.status === 'Diajukan'" size="sm" variant="outline" class="h-7 gap-1 text-xs" @click="transition(c, 'verify')">
            <CheckCircle2 class="h-3.5 w-3.5" /> Verifikasi Dokumen
          </Button>
          <Button v-if="c.status === 'Verifikasi'" size="sm" variant="outline" class="h-7 gap-1 text-xs" @click="transition(c, 'review')">
            <BadgeCheck class="h-3.5 w-3.5" /> Teruskan ke Komite
          </Button>
          <template v-if="c.status === 'Tinjauan Komite'">
            <Button size="sm" class="h-7 gap-1 bg-success text-xs hover:bg-success" @click="transition(c, 'approve')">
              <CheckCircle2 class="h-3.5 w-3.5" /> Setujui
            </Button>
            <Button size="sm" variant="outline" class="h-7 gap-1 text-xs text-danger" @click="transition(c, 'reject')">
              <XCircle class="h-3.5 w-3.5" /> Tolak
            </Button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
