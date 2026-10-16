<script setup lang="ts">
// Button — padanan shadcn/ui Button (New York style) dengan varian SPKD.
import { computed, normalizeClass, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'brand' | 'inverse'
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
  disabled?: boolean
  type?: 'button' | 'submit'
}>()
const attrs = useAttrs()

const variantCls: Record<string, string> = {
  default: 'bg-brand text-white shadow-xs hover:bg-brand-hover',
  outline: 'border border-input bg-card shadow-xs hover:bg-muted/60',
  ghost: 'hover:bg-muted/70',
  secondary: 'bg-muted text-foreground shadow-xs hover:bg-muted/70',
  link: 'text-brand-2 underline-offset-4 hover:underline',
  brand: 'bg-brand-2 text-white shadow-xs hover:bg-brand-2-hover',
  inverse: 'bg-white text-brand shadow-xs hover:bg-white/90 hover:text-brand-hover dark:text-[#14285c] dark:hover:text-[#1b3878]', // latar tetap putih di mode gelap, jadi teksnya tetap navy
}
const sizeCls: Record<string, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
}

// Kelompok kelas yang saling menimpa. Tanpa ini, "bg-white" dari pemanggil
// bisa kalah oleh "bg-brand" bawaan varian (urutan CSS, bukan urutan class).
const TEXT_SIZE = /^text-(xs|sm|base|lg|[2-9]?xl|\[\d)/
function group(c: string): string | null {
  const m = c.match(/^((?:[a-z-]+:)*)(.*)$/)!
  const [, mod, base] = m
  if (base.startsWith('bg-')) return mod + 'bg'
  if (base.startsWith('text-')) return mod + (TEXT_SIZE.test(base) ? 'text-size' : 'text-color')
  if (/^h-/.test(base)) return mod + 'h'
  if (/^px-/.test(base)) return mod + 'px'
  return null
}
function merge(base: string, extra: string) {
  const extraList = extra.split(/\s+/).filter(Boolean)
  const taken = new Set(extraList.map(group).filter(Boolean))
  const kept = base.split(/\s+/).filter((c) => c && !taken.has(group(c)))
  return [...kept, ...extraList].join(' ')
}

const cls = computed(() => {
  const base = [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0',
    variantCls[props.variant ?? 'default'],
    sizeCls[props.size ?? 'default'],
  ].join(' ')
  const extra = normalizeClass(attrs.class)
  return merge(base, extra)
})
const rest = computed(() => {
  const { class: _c, ...r } = attrs
  return r
})
</script>

<template>
  <button v-bind="rest" :type="type ?? 'button'" :disabled="disabled" :class="cls">
    <slot />
  </button>
</template>
