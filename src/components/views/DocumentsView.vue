<script setup lang="ts">
// DocumentsView — dokumen kredensial per praktisi: lihat berkas & unggah berkas baru.
import { Clock, Eye, FileText, Search, Upload } from 'lucide-vue-next'
import { expiryLabel } from '~/utils/format'
import { useMedCredix } from '~/stores/medcredix'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref, watch } from 'vue'
import { api, apiUpload, openFile } from '~/composables/useApi'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Dialog from '~/components/ui/Dialog.vue'
import Input from '~/components/ui/Input.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import EmptyState from '~/components/medcredix/EmptyState.vue'
import FileDrop from '~/components/medcredix/FileDrop.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const credentials = ref<any[]>([])
const documents = ref<any[]>([])
const loading = ref(true)
const q = ref('')
const docFilter = ref('all')

async function load() {
  loading.value = true
  try {
    const [c, d] = await Promise.all([api('/credentials'), api('/documents')])
    credentials.value = c?.credentials ?? []
    documents.value = d?.documents ?? []
  } catch (e: any) {
    toast({ title: 'Gagal memuat dokumen', description: e?.message, variant: 'destructive' })
  }
  loading.value = false
}
onMounted(load)
watch(() => store.hospitalId, load)

// Dokumen dikelompokkan per kredensial, yang terbaru di depan.
const docsByCred = computed(() => {
  const m: Record<string, any[]> = {}
  for (const d of documents.value) (m[d.credentialId] ??= []).push(d)
  return m
})
const latestFile = (credId: string) => (docsByCred.value[credId] ?? []).find((d) => d.hasFile)

const list = computed(() => {
  const term = q.value.trim().toLowerCase()
  return credentials.value.filter((c) => {
    if (term && !`${c.name} ${c.practitionerName} ${c.number ?? ''} ${c.type}`.toLowerCase().includes(term)) return false
    const has = !!latestFile(c.id)
    if (docFilter.value === 'ada' && !has) return false
    if (docFilter.value === 'belum' && has) return false
    return true
  })
})

const canEdit = computed(() => store.user?.permissions.includes('EDIT'))

async function view(doc: any) {
  try { await openFile(`/documents/file?id=${encodeURIComponent(doc.id)}`) } catch (e: any) {
    toast({ title: 'Dokumen tidak dapat dibuka', description: e?.message, variant: 'destructive' })
  }
}

// Dialog unggah
const target = ref<any>(null)
const file = ref<File | null>(null)
const saving = ref(false)
function openUpload(c: any) {
  target.value = c
  file.value = null
}
async function upload() {
  if (!target.value) return
  if (!file.value) return toast({ title: 'Pilih berkas dokumen dulu', variant: 'destructive' })
  saving.value = true
  try {
    await apiUpload('/documents/upload', file.value, { credentialId: target.value.id })
    toast({ title: 'Dokumen terunggah', description: `${target.value.type} — ${target.value.practitionerName}` })
    target.value = null
    load()
  } catch (e: any) {
    toast({ title: 'Gagal mengunggah', description: e?.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function toneCls(tone: string) {
  return tone === 'danger' ? 'bg-danger-light text-danger' : tone === 'warning' ? 'bg-warning-light text-warning' : tone === 'success' ? 'bg-success-light text-success' : 'bg-muted text-muted-foreground'
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Dokumen Kredensial"
      sub="Berkas STR, SIP, dan sertifikat tiap praktisi. Berkas disimpan terenkripsi dan setiap kali dibuka tercatat di Audit Trail."
    />

    <div class="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <div class="relative w-72">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="q" placeholder="Cari praktisi, jenis, atau nomor…" class="h-9 pl-8 text-xs" />
      </div>
      <div class="w-44">
        <Select v-model="docFilter">
          <SelectOption value="all">Semua Kredensial</SelectOption>
          <SelectOption value="ada">Sudah ada berkas</SelectOption>
          <SelectOption value="belum">Belum ada berkas</SelectOption>
        </Select>
      </div>
      <span class="ml-auto text-xs text-muted-foreground">{{ list.length }} kredensial · {{ documents.filter((d) => d.hasFile).length }} berkas</span>
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">Memuat dokumen…</div>
    <EmptyState v-else-if="!list.length" title="Tidak ada kredensial yang cocok" />
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="c in list" :key="c.id" class="rounded-xl border bg-card p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <Badge variant="outline" class="text-[9px] font-bold">{{ c.type }}</Badge>
            <div class="mt-1.5 truncate text-xs font-semibold" :title="c.name">{{ c.name.split('—')[0] }}</div>
            <div class="mt-0.5 text-[10px] text-muted-foreground">{{ c.practitionerName }}<template v-if="c.number"> · {{ c.number }}</template></div>
          </div>
          <StatusBadge :status="c.status" />
        </div>
        <div class="mt-2 space-y-1">
          <div v-for="d in docsByCred[c.id] ?? []" :key="d.id" class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <FileText class="h-3 w-3 shrink-0" />
            <span class="truncate" :title="d.fileName">{{ d.fileName }}</span>
            <span v-if="!d.hasFile" class="shrink-0 italic">(belum ada berkas)</span>
          </div>
          <div v-if="!(docsByCred[c.id] ?? []).length" class="text-[10px] italic text-muted-foreground">Belum ada dokumen diunggah.</div>
        </div>
        <div class="mt-3 flex items-center gap-1.5 border-t pt-2.5">
          <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', toneCls(expiryLabel(c.expiryDate).tone)]">
            <Clock class="h-3 w-3" /> {{ expiryLabel(c.expiryDate).text }}
          </span>
          <Button v-if="canEdit" size="sm" variant="ghost" class="ml-auto h-6 gap-1 px-2 text-[10px]" @click="openUpload(c)">
            <Upload class="h-3 w-3" /> Unggah
          </Button>
          <Button
            size="sm" variant="outline" :class="['h-6 gap-1 px-2 text-[10px]', canEdit ? '' : 'ml-auto']"
            :disabled="!latestFile(c.id)" :title="latestFile(c.id) ? 'Buka berkas terbaru' : 'Belum ada berkas'"
            @click="view(latestFile(c.id))"
          >
            <Eye class="h-3 w-3" /> Lihat
          </Button>
        </div>
      </div>
    </div>

    <Dialog :open="!!target" @update:open="(o) => !o && !saving && (target = null)">
      <template v-if="target">
        <h2 class="font-display text-base font-semibold">Unggah Dokumen — {{ target.type }}</h2>
        <p class="mt-1 text-xs text-muted-foreground">{{ target.practitionerName }}<template v-if="target.number"> · {{ target.number }}</template>. Berkas baru tercatat di Audit Trail.</p>
        <FileDrop v-model="file" class="mt-4" :disabled="saving" />
        <div class="mt-5 flex justify-end gap-2">
          <Button variant="outline" :disabled="saving" @click="target = null">Batal</Button>
          <Button :disabled="saving || !file" @click="upload">{{ saving ? 'Mengunggah…' : 'Unggah' }}</Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
