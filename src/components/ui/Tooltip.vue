<script setup lang="ts">
// Tooltip — info hover (padanan shadcn/ui Tooltip).
// Isi tooltip di-teleport ke <body> dengan posisi fixed, jadi tidak terpotong oleh
// wadah yang ber-overflow (mis. isi Dialog yang bisa di-scroll). Posisi otomatis
// pindah ke bawah bila ruang di atas tidak cukup, dan digeser agar tetap di dalam layar.
import { nextTick, onBeforeUnmount, ref } from 'vue'
defineProps<{ delay?: number }>()
const show = ref(false)
const anchor = ref<HTMLElement | null>(null)
const tip = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })
const MARGIN = 8 // jarak minimum dari tepi layar
const GAP = 6 // jarak tooltip dari pemicu
let timer: ReturnType<typeof setTimeout> | null = null

async function place() {
  await nextTick()
  const a = anchor.value?.getBoundingClientRect()
  const t = tip.value?.getBoundingClientRect()
  if (!a || !t) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  let top = a.top - t.height - GAP
  if (top < MARGIN) top = Math.min(a.bottom + GAP, vh - t.height - MARGIN) // tidak muat di atas → taruh di bawah
  let left = a.left + a.width / 2 - t.width / 2
  left = Math.max(MARGIN, Math.min(left, vw - t.width - MARGIN))
  pos.value = { top, left }
}
function open() {
  show.value = true
  place()
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
}
function hide() {
  if (timer) clearTimeout(timer)
  show.value = false
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
}
function enter() {
  timer = setTimeout(open, 200)
}
onBeforeUnmount(hide)
</script>
<template>
  <span ref="anchor" class="relative inline-flex" @mouseenter="enter" @mouseleave="hide" @focusin="open" @focusout="hide">
    <slot name="trigger" />
    <Teleport to="body">
      <transition name="fade">
        <span
          v-if="show"
          ref="tip"
          role="tooltip"
          :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
          class="pointer-events-none fixed z-[100] w-max max-w-64 rounded-md bg-brand px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-md"
        >
          <slot />
        </span>
      </transition>
    </Teleport>
  </span>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
