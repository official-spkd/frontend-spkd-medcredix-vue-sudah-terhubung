<script setup lang="ts">
// Select — listbox ringan (padanan shadcn/ui Select) dengan v-model.
// Opsi: <SelectOption value="...">Label</SelectOption>
// Di layar HP (< 640px) daftar tampil sebagai panel dari bawah layar dengan pilihan yang besar.
// searchable: menampilkan kotak cari di atas daftar (untuk daftar panjang, mis. wilayah).
import { onClickOutside } from '@vueuse/core'
import { Check, ChevronDown, Search, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, provide, ref } from 'vue'
import { lockScroll, unlockScroll } from '~/composables/useScrollLock'

const model = defineModel<string>({ default: '' })
const props = defineProps<{ placeholder?: string; disabled?: boolean; label?: string; searchable?: boolean }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
onClickOutside(root, () => { if (open.value) close() }, { ignore: [list] })

// Daftar opsi milik Select ini sendiri (reaktif), diisi oleh SelectOption.
type Opt = { uid: number; value: string; label: string }
const items = ref<Opt[]>([])
provide('select-ctx', {
  set(uid: number, value: string, label: string) {
    const o = items.value.find((i) => i.uid === uid)
    if (o) Object.assign(o, { value, label })
    else items.value.push({ uid, value, label })
  },
  remove(uid: number) {
    items.value = items.value.filter((i) => i.uid !== uid)
  },
})

const selectedLabel = computed(() => items.value.find((i) => i.value === model.value)?.label ?? model.value ?? '')

// Pencarian (hanya bila searchable): cocokkan tanpa membedakan huruf besar/kecil.
const query = ref('')
const searchBox = ref<HTMLInputElement | null>(null)
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? items.value.filter((i) => i.label.toLowerCase().includes(q)) : items.value
})

// Mode HP: panel bawah. Judul panel dari prop label, "Semua X" → "Pilih X", atau placeholder.
const sheet = ref(false)
let locked = false
function setLock(on: boolean) {
  if (on && !locked) { lockScroll(); locked = true }
  if (!on && locked) { unlockScroll(); locked = false }
}
const sheetTitle = computed(() => {
  if (props.label) return props.label
  const first = items.value[0]?.label ?? ''
  if (/^Semua\s/i.test(first)) return `Pilih ${first.replace(/^Semua\s+/i, '')}`
  return props.placeholder?.replace(/…$/, '') || 'Pilih salah satu'
})

// Daftar dirender di <body> dengan posisi fixed, supaya tidak terpotong
// oleh pop-up / kartu yang punya scroll sendiri. Membuka ke atas bila ruang bawah sempit.
const pos = ref<Record<string, string>>({})
function place() {
  const btn = root.value?.querySelector('button')
  if (!btn) return
  const r = btn.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const up = below < 220 && r.top > below
  const maxH = Math.min(256, (up ? r.top : below) - 12)
  pos.value = {
    left: `${r.left}px`,
    minWidth: `${r.width}px`,
    maxHeight: `${Math.max(120, maxH)}px`,
    ...(up ? { bottom: `${window.innerHeight - r.top + 4}px` } : { top: `${r.bottom + 4}px` }),
  }
}
function onScroll(e: Event) {
  if (sheet.value) return
  // scroll di dalam daftar sendiri tidak menutup
  if (list.value && e.target instanceof Node && list.value.contains(e.target)) return
  open.value = false
}
function listen(on: boolean) {
  const fn = on ? window.addEventListener : window.removeEventListener
  fn('scroll', onScroll, true)
  fn('resize', onScroll)
}

function close() {
  open.value = false
  query.value = ''
  listen(false)
  setLock(false)
}
async function toggle() {
  if (open.value) return close()
  sheet.value = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  open.value = true
  if (sheet.value) setLock(true)
  else listen(true)
  if (open.value) {
    if (!sheet.value) place()
    await nextTick()
    list.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    if (props.searchable && !sheet.value) searchBox.value?.focus()
  }
}
function pick(value: string) {
  model.value = value
  close()
}
onBeforeUnmount(() => { listen(false); setLock(false) })
// Esc menutup daftar dulu; Esc berikutnya baru diteruskan (mis. menutup pop-up).
function onEsc(e: KeyboardEvent) {
  if (!open.value) return
  e.stopPropagation()
  close()
}
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="onEsc">
    <!-- SelectOption dirender tersembunyi supaya bisa mendaftarkan diri -->
    <div class="hidden" aria-hidden="true"><slot /></div>
    <button
      type="button"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :class="[
        'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs',
        'focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      ]"
      @click="toggle"
    >
      <span :class="['truncate', selectedLabel ? '' : 'text-muted-foreground']">{{ selectedLabel || placeholder || 'Pilih…' }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>
    <Teleport to="body">
    <!-- HP: panel dari bawah -->
    <div v-if="open && sheet" class="fixed inset-0 z-[60]" @keydown.esc="onEsc">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" @click="close" />
      <div
        ref="list"
        role="listbox"
        :aria-label="sheetTitle"
        class="sheet-up absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        <div class="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <div class="font-display text-sm font-bold">{{ sheetTitle }}</div>
          <button type="button" aria-label="Tutup" class="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" @click="close">
            <X class="h-4 w-4" />
          </button>
        </div>
        <div v-if="searchable" class="relative shrink-0 px-4 pb-2">
          <Search class="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-[calc(50%+4px)] text-muted-foreground" />
          <input v-model="query" type="search" @keydown.enter.prevent="shown[0] && pick(shown[0].value)" placeholder="Cari…" class="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] scrollbar-thin">
          <button
            v-for="opt in shown"
            :key="opt.uid"
            type="button"
            role="option"
            :aria-selected="opt.value === model"
            :class="[
              'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors',
              opt.value === model ? 'bg-brand-light font-semibold text-brand' : 'active:bg-muted/70',
            ]"
            @click="pick(opt.value)"
          >
            <span>{{ opt.label }}</span>
            <Check v-if="opt.value === model" class="h-4 w-4 shrink-0" />
          </button>
          <p v-if="!shown.length" class="px-3 py-3 text-sm text-muted-foreground">{{ query ? 'Tidak ditemukan' : 'Tidak ada pilihan' }}</p>
        </div>
      </div>
    </div>
    <div
      v-else-if="open"
      ref="list"
      role="listbox"
      :style="pos"
      class="fixed z-[60] max-w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md scrollbar-thin"
      @keydown.esc="onEsc"
    >
      <div v-if="searchable" class="sticky -top-1 z-10 -mx-1 -mt-1 mb-1 border-b border-border bg-popover p-1.5">
        <div class="relative">
          <Search class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input ref="searchBox" v-model="query" type="search" @keydown.enter.prevent="shown[0] && pick(shown[0].value)" placeholder="Cari…" class="h-8 w-full rounded-md border border-input bg-card pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <button
        v-for="opt in shown"
        :key="opt.uid"
        type="button"
        role="option"
        :aria-selected="opt.value === model"
        :class="[
          'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-left text-xs outline-none transition-colors',
          opt.value === model ? 'bg-brand-light font-semibold text-brand' : 'hover:bg-muted/70 focus:bg-muted/70',
        ]"
        @click="pick(opt.value)"
      >
        {{ opt.label }}
      </button>
      <p v-if="!shown.length" class="px-2 py-1.5 text-xs text-muted-foreground">{{ query ? 'Tidak ditemukan' : 'Tidak ada pilihan' }}</p>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sheet-up {
  animation: sheet-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
