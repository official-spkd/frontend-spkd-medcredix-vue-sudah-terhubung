<script setup lang="ts">
// SideNavContent — isi navigasi sidebar (dipakai desktop & mobile).
import {
  LayoutDashboard, Radar, AlertTriangle, CheckCircle2, Users, IdCard, FileText, BadgeCheck, ShieldCheck,
  Stethoscope, Building2, MonitorSmartphone, Network, GitBranch, BedDouble, HeartPulse, FileCheck2,
  ScanSearch, Database, ShieldHalf, Cable, Fingerprint, Scale, History, FileBarChart, Settings, UserCog,
  Bell, Globe2,
} from 'lucide-vue-next'
import type { NavGroup } from '~/utils/nav'
import type { SessionUser } from '~/stores/medcredix'

const props = defineProps<{ nav: NavGroup[]; view: string; user: SessionUser | null; badges?: any }>()
const emit = defineEmits<{ navigate: [view: string] }>()

const ICONS: Record<string, any> = {
  LayoutDashboard, Radar, AlertTriangle, CheckCircle2, Users, IdCard, FileText, BadgeCheck, ShieldCheck,
  Stethoscope, Building2, MonitorSmartphone, Network, GitBranch, BedDouble, HeartPulse, FileCheck2,
  ScanSearch, Database, ShieldHalf, Cable, Fingerprint, Scale, History, FileBarChart, Settings, UserCog,
  Bell, Globe2,
}
function badge(key?: string): number {
  if (!key || !props.badges) return 0
  return props.badges[key] ?? 0
}
</script>

<template>
  <nav class="flex h-full flex-col" aria-label="Navigasi utama">
    <!-- pr-12 di layar kecil: beri ruang tombol tutup (X) menu mobile -->
    <div class="px-4 pb-4 pr-12 pt-5 lg:pr-4">
      <img src="/logo/logo.svg" alt="MedCredix — Medical Credentialing Intelligence" class="h-14 w-auto max-w-full object-contain" />
    </div>
    <div class="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4 scrollbar-thin">
      <div v-for="g in nav" :key="g.id">
        <div class="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">{{ g.label }}</div>
        <div class="space-y-0.5">
          <button
            v-for="item in g.items" :key="item.id"
            :aria-current="view === item.id ? 'page' : undefined"
            :class="[
              'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all',
              view === item.id ? 'bg-sidebar-accent text-white shadow-sm' : 'text-sidebar-foreground/85 hover:bg-white/5 hover:text-white',
            ]"
            @click="emit('navigate', item.id)"
          >
            <component :is="ICONS[item.icon] ?? LayoutDashboard" :class="['h-4 w-4 shrink-0', view === item.id ? 'text-brand-2' : 'text-sidebar-foreground/60 group-hover:text-white/80']" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span v-if="badge(item.badgeKey) > 0" class="rounded-full bg-brand-2 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {{ badge(item.badgeKey) }}
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="border-t border-sidebar-border px-4 py-3">
      <div class="truncate text-[11px] font-medium text-white/70">{{ user?.name }}</div>
      <div class="truncate text-[10px] text-white/40">{{ user?.roleLabel }}</div>
    </div>
  </nav>
</template>
