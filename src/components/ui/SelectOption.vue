<script setup lang="ts">
// SelectOption — item opsi untuk Select. Label diambil dari teks slot.
import { getCurrentInstance, inject, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'

const props = defineProps<{ value: string }>()
const ctx = inject<{ set: (uid: number, value: string, label: string) => void; remove: (uid: number) => void } | null>('select-ctx', null)
const uid = getCurrentInstance()!.uid
const el = ref<HTMLElement | null>(null)

function sync() {
  ctx?.set(uid, props.value, el.value?.textContent?.trim() || props.value)
}
onMounted(sync)
onUpdated(sync)
watch(() => props.value, sync)
onBeforeUnmount(() => ctx?.remove(uid))
</script>
<template>
  <span ref="el"><slot /></span>
</template>
