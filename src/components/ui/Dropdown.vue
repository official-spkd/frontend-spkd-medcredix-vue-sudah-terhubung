<script setup lang="ts">
// Dropdown — menu dropdown (padanan shadcn/ui DropdownMenu).
// Slot: trigger; konten ditampilkan sebagai menu mengambang.
// Di HP (< 640px) menu dibuat selebar layar di bawah topbar supaya tidak terpotong di tepi.
import { onClickOutside } from '@vueuse/core'
import { provide, ref } from 'vue'
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))
provide('dropdown-close', () => (open.value = false))
// Elemen ber-atribut data-dropdown-close (mis. baris notifikasi) ikut menutup menu saat diklik.
function onContentClick(e: MouseEvent) {
  if ((e.target as HTMLElement)?.closest('[data-dropdown-close]')) open.value = false
}
</script>
<template>
  <div ref="root" class="relative inline-flex">
    <div class="inline-flex" @click="open = !open"><slot name="trigger" /></div>
    <div
      v-if="open"
      @click="onContentClick"
      class="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md max-sm:fixed max-sm:inset-x-3 max-sm:top-14 max-sm:mt-0 max-sm:rounded-xl max-sm:shadow-xl"
    >
      <slot />
    </div>
  </div>
</template>
