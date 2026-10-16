<script setup lang="ts">
// AuditView — port dari views-assurance.tsx (AuditView).
// Deskripsi tampil utuh (tidak terpotong). Kolom Perubahan hanya menampilkan field yang berubah
// (mis. "Status: Aktif → Ditangguhkan"); bila lebih dari 3 field, sisanya dibuka lewat "+N lainnya".
import { Search } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import { fmtDateTime } from '~/utils/format'
import Badge from '~/components/ui/Badge.vue'
import Input from '~/components/ui/Input.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'

type Change = { field: string; label: string; from: string; to: string }

const action = ref('all')
const q = ref('')
const data = ref<any>(null)

async function load() {
  try {
    const params = new URLSearchParams()
    if (action.value !== 'all') params.set('action', action.value)
    if (q.value) params.set('q', q.value)
    data.value = await api(`/audit?${params}`)
  } catch { data.value = null }
}
onMounted(load)
watch(action, load)
let t: ReturnType<typeof setTimeout> | null = null
watch(q, () => { if (t) clearTimeout(t); t = setTimeout(load, 300) })
const logs = computed(() => data.value?.logs ?? [])

// Baris yang daftar perubahannya sedang dibuka penuh
const opened = ref<Set<string>>(new Set())
function toggle(id: string) {
  const s = new Set(opened.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  opened.value = s
}

const MAX_SHOWN = 3
function changesOf(l: any): Change[] {
  return Array.isArray(l.changes) ? l.changes : []
}
function shownChanges(l: any): Change[] {
  const all = changesOf(l)
  return opened.value.has(l.id) ? all : all.slice(0, MAX_SHOWN)
}
function hasSnapshot(l: any) {
  return !!(l.before || l.after)
}
function entityText(l: any) {
  const name = l.entityLabel && l.entityLabel !== '—' ? l.entityLabel : l.entityType
  return name ?? '—'
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Audit Trail"
      sub="Log immutable: siapa, apa, kapan, sebelum/sesudah, IP, correlation ID. Tidak dapat diubah atau dihapus siapa pun." demo
    />
    <div class="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 sm:flex sm:flex-wrap sm:items-center">
      <div class="relative col-span-2 sm:w-72">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="q" placeholder="Cari aktor, deskripsi, atau ID entitas…" class="h-9 w-full pl-8 text-xs" />
      </div>
      <div class="col-span-2 w-full sm:w-44">
        <Select v-model="action">
          <SelectOption value="all">Semua Aksi</SelectOption>
          <SelectOption v-for="a in ['login', 'create', 'update', 'approve', 'verify', 'export', 'config', 'scoring', 'sync', 'detect']" :key="a" :value="a">{{ a }}</SelectOption>
        </Select>
      </div>
      <span class="col-span-2 text-right text-xs text-muted-foreground sm:ml-auto">{{ logs.length }} log (maks 200 terakhir)</span>
    </div>

    <!-- HP: daftar kartu -->
    <div class="space-y-2 sm:hidden">
      <div v-for="l in logs" :key="l.id" class="rounded-xl border bg-card p-3.5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-semibold leading-snug">{{ l.actorName }}</div>
            <div class="text-[10px] text-muted-foreground">{{ l.actorRole }}</div>
          </div>
          <Badge variant="outline" class="shrink-0 font-mono text-[10px]">{{ l.action }}</Badge>
        </div>
        <p class="mt-2 break-words text-xs leading-relaxed">{{ l.description || '—' }}</p>
        <ul v-if="changesOf(l).length" class="mt-2 space-y-1 rounded-lg bg-muted/50 px-2.5 py-2 text-[11px]">
          <li v-for="c in shownChanges(l)" :key="c.field" class="flex flex-wrap items-baseline gap-x-1 break-words">
            <span class="text-muted-foreground">{{ c.label }}:</span>
            <span :class="['text-muted-foreground', c.from !== '—' && 'line-through decoration-muted-foreground/50']">{{ c.from }}</span>
            <span class="text-muted-foreground">→</span>
            <span class="font-semibold">{{ c.to }}</span>
          </li>
          <li v-if="changesOf(l).length > MAX_SHOWN">
            <button class="font-semibold text-brand-2" @click="toggle(l.id)">
              {{ opened.has(l.id) ? 'Tampilkan lebih sedikit' : `+${changesOf(l).length - MAX_SHOWN} lainnya` }}
            </button>
          </li>
        </ul>
        <div v-else-if="hasSnapshot(l)" class="mt-2 text-[11px] text-muted-foreground">Tidak ada nilai yang berubah.</div>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
          <span>{{ fmtDateTime(l.createdAt) }}</span>
          <span>{{ entityText(l) }}{{ l.entityId && l.entityId !== '-' ? ` · ${l.entityId.slice(0, 14)}` : '' }}</span>
          <span v-if="l.ip">IP {{ l.ip }}</span>
        </div>
      </div>
      <div v-if="!logs.length" class="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">Belum ada log.</div>
    </div>

    <!-- Desktop: tabel -->
    <div class="hidden overflow-x-auto rounded-xl border bg-card sm:block">
      <table class="w-full text-xs">
        <thead class="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th class="px-3 py-2.5">Waktu</th><th class="px-3 py-2.5">Aktor</th><th class="px-3 py-2.5">Aksi</th>
            <th class="px-3 py-2.5">Entitas</th><th class="px-3 py-2.5">Deskripsi</th><th class="px-3 py-2.5">Sebelum → Sesudah</th><th class="px-3 py-2.5">IP</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="l in logs" :key="l.id">
            <tr class="border-t align-top">
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{{ fmtDateTime(l.createdAt) }}</td>
              <td class="min-w-32 px-3 py-2.5"><div class="font-semibold">{{ l.actorName }}</div><div class="text-[9px] text-muted-foreground">{{ l.actorRole }}</div></td>
              <td class="px-3 py-2.5"><Badge variant="outline" class="font-mono text-[9px]">{{ l.action }}</Badge></td>
              <td class="min-w-28 px-3 py-2.5">
                <div class="text-[11px] font-medium">{{ entityText(l) }}</div>
                <div v-if="l.entityId && l.entityId !== '-'" class="font-mono text-[9px] text-muted-foreground">{{ l.entityId.slice(0, 18) }}</div>
              </td>
              <td class="min-w-56 max-w-80 px-3 py-2.5 leading-relaxed">
                <div class="whitespace-normal break-words">{{ l.description || '—' }}</div>
              </td>
              <td class="min-w-60 max-w-96 px-3 py-2.5">
                <ul v-if="changesOf(l).length" class="space-y-0.5 text-[11px] leading-relaxed">
                  <li v-for="c in shownChanges(l)" :key="c.field" class="flex flex-wrap items-baseline gap-x-1 break-words">
                    <span class="text-muted-foreground">{{ c.label }}:</span>
                    <span :class="['text-muted-foreground', c.from !== '—' && 'line-through decoration-muted-foreground/50']">{{ c.from }}</span>
                    <span class="text-muted-foreground">→</span>
                    <span class="font-semibold">{{ c.to }}</span>
                  </li>
                </ul>
                <div v-else-if="hasSnapshot(l)" class="text-[11px] text-muted-foreground">Tidak ada nilai yang berubah</div>
                <span v-else class="text-muted-foreground">—</span>
                <button
                  v-if="changesOf(l).length > MAX_SHOWN"
                  class="mt-1 text-[10px] font-semibold text-brand-2 hover:underline"
                  @click="toggle(l.id)"
                >
                  {{ opened.has(l.id) ? 'Tampilkan lebih sedikit' : `+${changesOf(l).length - MAX_SHOWN} lainnya` }}
                </button>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">{{ l.ip }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
