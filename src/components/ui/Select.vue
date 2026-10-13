<script setup lang="ts">
// Select — listbox ringan (padanan shadcn/ui Select) dengan v-model.
// Opsi: <SelectOption value="...">Label</SelectOption>
import { onClickOutside } from '@vueuse/core'
import { ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, provide, ref } from 'vue'

const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string; disabled?: boolean }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false), { ignore: [list] })

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
  // scroll di dalam daftar sendiri tidak menutup
  if (list.value && e.target instanceof Node && list.value.contains(e.target)) return
  open.value = false
}
function listen(on: boolean) {
  const fn = on ? window.addEventListener : window.removeEventListener
  fn('scroll', onScroll, true)
  fn('resize', onScroll)
}

async function toggle() {
  open.value = !open.value
  listen(open.value)
  if (open.value) {
    place()
    await nextTick()
    list.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }
}
function pick(value: string) {
  model.value = value
  open.value = false
  listen(false)
}
onBeforeUnmount(() => listen(false))
// Esc menutup daftar dulu; Esc berikutnya baru diteruskan (mis. menutup pop-up).
function onEsc(e: KeyboardEvent) {
  if (!open.value) return
  e.stopPropagation()
  open.value = false
  listen(false)
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
    <div
      v-if="open"
      ref="list"
      role="listbox"
      :style="pos"
      class="fixed z-[60] max-w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md scrollbar-thin"
      @keydown.esc="onEsc"
    >
      <button
        v-for="opt in items"
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
      <p v-if="!items.length" class="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada pilihan</p>
    </div>
    </Teleport>
  </div>
</template>
