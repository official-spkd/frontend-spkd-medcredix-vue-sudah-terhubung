<script setup lang="ts">
// Dialog — modal overlay (padanan shadcn/ui Dialog). Slot: default (konten).
// Isi yang panjang bisa di-scroll di dalam pop-up; tombol X, Esc, atau klik latar untuk menutup.
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, watch } from 'vue'
import { lockScroll, unlockScroll } from '~/composables/useScrollLock'

const props = withDefaults(defineProps<{ open: boolean; size?: 'sm' | 'md' | 'lg' | 'xl'; closable?: boolean }>(), {
  size: 'md',
  closable: true,
})
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

function close() {
  if (props.closable) emit('update:open', false)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

let locked = false
function sync(v: boolean) {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKey)
  if (v) document.addEventListener('keydown', onKey)
  if (v && !locked) { lockScroll(); locked = true }
  if (!v && locked) { unlockScroll(); locked = false }
}
watch(() => props.open, sync, { immediate: true })
onBeforeUnmount(() => sync(false))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px]" @click="close" />
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          :class="[
            'pointer-events-auto relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
            widths[size],
          ]"
        >
          <button
            v-if="closable"
            type="button"
            aria-label="Tutup"
            class="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pr-12 scrollbar-thin">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
