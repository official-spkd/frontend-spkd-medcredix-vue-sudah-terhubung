<script setup lang="ts">
// PathwayView — port dari views-clinical.tsx (PathwayView).
import { GitBranch } from 'lucide-vue-next'
import { useMedCredix } from '~/stores/medcredix'
import { computed, onMounted, ref } from 'vue'
import { api } from '~/composables/useApi'
import Button from '~/components/ui/Button.vue'
import Dialog from '~/components/ui/Dialog.vue'
import DemoBadge from '~/components/medcredix/DemoBadge.vue'
import Hint from '~/components/medcredix/Hint.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import ScoreRing from '~/components/medcredix/ScoreRing.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const selected = ref<any>(null)
const data = ref<any>(null)
onMounted(async () => {
  try { data.value = await api('/clinical?type=pathway') } catch { data.value = null }
})
const pathways = computed(() => data.value?.pathways ?? [])
const episodes = computed(() => data.value?.episodes ?? [])
// Nilai yang belum ada sumber datanya (null) ditampilkan "Belum tersedia", bukan "%" kosong.
const has = (v: unknown) => v !== null && v !== undefined && v !== ''
const adhCls = (v: number) => (v < 70 ? 'text-danger' : v < 80 ? 'text-warning' : 'text-success')
const cpcs = computed(() => data.value?.cpcs ?? { score: 0, coverage: 0, adherence: 0, documentation: 0 })
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Clinical Pathway Compliance"
      sub="CPCS = Coverage 25% + Adherence 50% + Dokumentasi Deviasi 25%. Deviasi klinis yang sah tidak dihukum — yang diukur adalah dokumentasinya." demo
    />
    <div class="grid gap-4 md:grid-cols-4">
      <div class="rounded-2xl border bg-card p-5 text-center">
        <ScoreRing :value="cpcs.score ?? 0" :size="104" label="CPCS" @click="store.openWhy('pathway')" />
        <Button variant="outline" size="sm" class="mt-3 w-full text-xs" @click="store.openWhy('pathway')">Mengapa?</Button>
      </div>
      <div v-for="s in [
        { label: 'Coverage Panduan', value: `${cpcs.coverage ?? 0}%`, sub: `${data?.coverage?.covered ?? 16}/${data?.coverage?.total ?? 20} diagnosis utama` },
        { label: 'Adherence Klinisi', value: `${cpcs.adherence ?? 0}%`, sub: `${episodes.length} episode dianalisis` },
        { label: 'Dokumentasi Deviasi', value: `${cpcs.documentation ?? 0}%`, sub: 'alasan klinis terdokumentasi' },
      ]" :key="s.label" class="rounded-xl border bg-card p-4">
        <div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{{ s.label }}</div>
        <div class="mt-1 font-display text-2xl font-bold text-brand">{{ s.value }}</div>
        <div class="mt-1 text-[10px] text-muted-foreground">{{ s.sub }}</div>
      </div>
    </div>

    <SectionCard title="Kepatuhan per Diagnosis" sub="Diurutkan dari kepatuhan terendah — klik untuk melihat episode & deviasi">
      <template #icon><GitBranch class="h-4 w-4" /></template>
      <div class="overflow-x-auto rounded-xl border">
        <table class="w-full text-xs">
          <thead class="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="px-3 py-2.5">Diagnosis (ICD-10)</th><th class="px-3 py-2.5 text-center">Episode</th>
              <th class="px-3 py-2.5 text-center">Adherence</th><th class="px-3 py-2.5 text-center">LOS Std</th>
              <th class="px-3 py-2.5 text-center">Deviasi</th><th class="px-3 py-2.5 text-center">Doc. Deviasi</th><th class="px-3 py-2.5 text-center">Cost Ratio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pathways" :key="p.id" class="cursor-pointer border-t transition-colors hover:bg-muted/30" @click="selected = p">
              <td class="px-3 py-2.5"><div class="font-semibold">{{ p.diagnosis }}</div><div class="text-[9px] text-muted-foreground">{{ p.icd10 }}</div></td>
              <td class="px-3 py-2.5 text-center">{{ p.episodeCount }}</td>
              <td class="px-3 py-2.5 text-center">
                <span v-if="has(p.avgAdherence)" :class="['font-display font-bold', adhCls(p.avgAdherence)]">{{ p.avgAdherence }}%</span>
                <span v-else class="text-[10px] text-muted-foreground">Belum tersedia</span>
              </td>
              <td class="px-3 py-2.5 text-center text-muted-foreground">{{ p.standardLos }} hari</td>
              <td class="px-3 py-2.5 text-center">{{ p.deviationCount }}</td>
              <td class="px-3 py-2.5 text-center">
                <template v-if="has(p.documentedDeviation)">{{ p.documentedDeviation }}%</template>
                <span v-else class="text-[10px] text-muted-foreground">Belum tersedia</span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <span v-if="has(p.costRatio)" :class="['font-display font-bold', p.costRatio > 1.1 ? 'text-danger' : p.costRatio > 1 ? 'text-warning' : 'text-success']">{{ p.costRatio }}</span>
                <span v-else class="text-[10px] text-muted-foreground">Belum tersedia</span>
                <Hint>{{ has(p.costRatio) ? 'Cost ratio = biaya aktual episode ÷ tarif INA-CBGs. Di atas 1 berarti biaya melebihi tarif.' : 'Cost ratio butuh data biaya episode dari billing SIMRS dan tarif INA-CBGs. Belum terintegrasi.' }}</Hint>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>

    <!-- Detail drawer -->
    <Dialog size="lg" :open="!!selected" @update:open="(o) => !o && (selected = null)">
      <template v-if="selected">
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          ICD-10 {{ selected.icd10 }} · LOS standar {{ selected.standardLos }} hari <DemoBadge />
        </div>
        <h2 class="mt-1 text-left text-lg font-bold">{{ selected.diagnosis }}</h2>
        <div class="mt-4 space-y-4">
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div v-for="[l, v] in [['Obat', selected.medicationAdherence], ['Lab', selected.labAdherence], ['Prosedur', selected.procedureAdherence], ['LOS', selected.losAdherence]]" :key="l" class="rounded-xl border bg-card p-3 text-center">
              <div class="text-[9px] font-bold uppercase text-muted-foreground">Kepatuhan {{ l }}</div>
              <div v-if="has(v)" :class="['mt-0.5 font-display text-lg font-bold', adhCls(v as number)]">{{ v }}%</div>
              <div v-else class="mt-1.5 text-xs font-semibold text-muted-foreground">Belum tersedia</div>
            </div>
          </div>
          <p
            v-if="[selected.medicationAdherence, selected.labAdherence, selected.procedureAdherence, selected.losAdherence].some((v) => !has(v))"
            class="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
          >
            Kepatuhan yang "Belum tersedia" butuh integrasi data dari SIMRS rumah sakit: e-resep/farmasi (obat), LIS (lab),
            dan order tindakan (prosedur). Perlu dikonfirmasi ke pihak RS terkait jalur integrasinya.
            <template v-if="has(selected.losAdherence)">Kepatuhan LOS dihitung dari episode dengan LOS aktual ≤ LOS standar.</template>
          </p>
          <SectionCard title="Episode & Deviasi" sub="Deviasi klinis yang terdokumentasi tidak menghukum skor — yang tercatat sah secara klinis">
            <div class="space-y-2">
              <div v-for="e in episodes.filter((x: any) => x.pathwayId === selected.id)" :key="e.id" class="rounded-xl border p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] text-muted-foreground">{{ e.episodeNumber }}</span>
                    <span v-if="has(e.patientInit)" class="text-xs font-semibold">Pasien {{ e.patientInit }}</span>
                    <span v-if="has(e.dpjp)" class="text-[10px] text-muted-foreground">DPJP: {{ e.dpjp }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <StatusBadge
                      :status="e.deviationType === 'Tidak Ada' ? 'Terpenuhi' : e.documented ? 'Deviasi Terdokumentasi' : 'Deviasi Tanpa Dokumentasi'"
                      :tone="e.deviationType === 'Tidak Ada' ? 'success' : e.documented ? 'info' : 'warning'"
                    />
                    <span v-if="has(e.adherence)" :class="['font-display text-sm font-bold', adhCls(e.adherence)]">{{ e.adherence }}%</span>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span v-if="has(e.losActual)">LOS aktual {{ e.losActual }} hari vs standar {{ e.losStandard }}</span>
                  <span v-if="has(e.costRatio)">Cost ratio {{ e.costRatio }}</span>
                  <span v-if="!['Tidak Ada', 'Deviasi'].includes(e.deviationType)">Deviasi: {{ e.deviationType }}</span>
                </div>
                <p v-if="e.deviationReason" class="mt-1.5 rounded-lg bg-info-light px-2.5 py-1.5 text-[10px] leading-relaxed text-info">Alasan klinis: {{ e.deviationReason }}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </template>
    </Dialog>
  </div>
</template>
