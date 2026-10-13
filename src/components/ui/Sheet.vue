<script setup lang="ts">
// Sheet — panel samping (padanan shadcn/ui Sheet). Slot: default (konten).
// Tombol X, Esc, atau klik latar untuk menutup; isi panjang di-scroll di dalam panel.
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, watch } from 'vue'
import { lockScroll, unlockScroll } from '~/composables/useScrollLock'
const props = defineProps<{ open: boolean; side?: 'right' | 'left' }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const side = props.side ?? 'right'

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
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
      <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px]" @click="emit('update:open', false)" />
      <transition :name="side === 'left' ? 'slide-l' : 'slide-r'">
        <div
          role="dialog"
          aria-modal="true"
          :class="[
            'absolute top-0 z-10 flex h-full w-full flex-col bg-card shadow-xl outline-none',
            side === 'right' ? 'right-0 sm:max-w-2xl' : 'left-0 w-64 border-r border-sidebar-border bg-sidebar',
          ]"
        >
          <button
            type="button"
            aria-label="Tutup"
            :class="[
              'absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              side === 'right'
                ? 'bg-card/90 text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground'
                : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white',
            ]"
            @click="emit('update:open', false)"
          >
            <X class="h-4 w-4" />
          </button>
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-thin">
            <slot />
          </div>
        </div>
      </transition>
    </div>
  </Teleport>
</template>

<style scoped>
.slide-r-enter-active,
.slide-r-leave-active,
.slide-l-enter-active,
.slide-l-leave-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.slide-r-enter-from,
.slide-r-leave-to {
  transform: translateX(100%);
}
.slide-l-enter-from,
.slide-l-leave-to {
  transform: translateX(-100%);
}
</style>
