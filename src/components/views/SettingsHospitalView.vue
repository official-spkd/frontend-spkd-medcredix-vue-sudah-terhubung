<script setup lang="ts">
// SettingsHospitalView — port dari views-settings.tsx.
// Validasi sebelum simpan (sama dengan backend): Kelas RS hanya A/B/C/D, Jumlah TT bilangan bulat > 0.
import { Building, Cable, Save } from 'lucide-vue-next'
import { useMedCredix } from '~/stores/medcredix'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref } from 'vue'
import { api } from '~/composables/useApi'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import Label from '~/components/ui/Label.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import RegionSelect from '~/components/medcredix/RegionSelect.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const data = ref<any>(null)
const src = ref<any>(null)
const form = ref<any>(null)
const saving = ref(false)

onMounted(async () => {
  try {
    data.value = await api('/settings')
    src.value = await api('/data?type=sources')
  } catch { /* ignore */ }
})
const h = computed(() => form.value ?? data.value?.hospital)
// Profil RS hanya Admin RS & Super Admin (sama dengan backend). IT / SIMRS punya CONFIGURE, tapi hanya untuk integrasi.
const canEdit = computed(() => ['admin_rs', 'super_admin'].includes(store.user?.role ?? ''))
// Kelas RS dan wilayah (provinsi s.d. kelurahan) punya pilihan sendiri, jadi tidak ada di daftar isian teks ini.
const fields = [
  ['bpjsFacilityCode', 'Kode Faskes BPJS'], ['satusehatOrgId', 'SATUSEHAT Organization ID'],
]
const CLASSES = ['A', 'B', 'C', 'D']
// Kode faskes BPJS RS (kode PPK di PKS BPJS): 4 angka + R + 3 angka, mis. 0137R038. Spasi diabaikan.
const BPJS_RE = /^\d{4}R\d{3}$/
const bpjsClean = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toUpperCase()

const touched = ref<Set<string>>(new Set())
function setField(k: string, v: any) {
  form.value = { ...h.value, [k]: v }
  touched.value = new Set(touched.value).add(k)
}

// Pesan error per isian; kosong berarti valid.
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!h.value) return e
  if (!String(h.value.name ?? '').trim()) e.name = 'Nama RS wajib diisi.'
  if (!CLASSES.includes(String(h.value.class ?? ''))) e.class = 'Pilih kelas A, B, C, atau D.'
  const beds = String(h.value.bedLicensed ?? '').trim()
  if (beds === '') e.bedLicensed = 'Jumlah TT terlisensi wajib diisi.'
  else if (!/^\d+$/.test(beds)) e.bedLicensed = 'Harus bilangan bulat, tanpa koma, titik, atau tanda minus.'
  else if (Number(beds) <= 0) e.bedLicensed = 'Harus lebih dari 0.'
  // Hanya dicek bila diubah, supaya nilai lama tetap bisa disimpan.
  const bpjs = bpjsClean(h.value.bpjsFacilityCode)
  if (touched.value.has('bpjsFacilityCode') && bpjs && !BPJS_RE.test(bpjs))
    e.bpjsFacilityCode = '8 karakter: 4 angka + R + 3 angka (mis. 0137R038).'
  return e
})
const showErrors = ref(false)
const errorOf = (k: string) => (showErrors.value || touched.value.has(k) ? errors.value[k] ?? '' : '')

async function save() {
  showErrors.value = true
  if (Object.keys(errors.value).length) {
    toast({ title: 'Profil RS belum disimpan', description: Object.values(errors.value).join(' '), variant: 'destructive' })
    return
  }
  saving.value = true
  try {
    await api('/settings', {
      method: 'PATCH',
      body: {
        target: 'hospital', name: h.value.name, class: h.value.class,
        province: h.value.province ?? '', city: h.value.city ?? '', district: h.value.district ?? '', village: h.value.village ?? '',
        bedLicensed: Number(String(h.value.bedLicensed).trim()),
        bpjsFacilityCode: touched.value.has('bpjsFacilityCode') ? bpjsClean(h.value.bpjsFacilityCode) : h.value.bpjsFacilityCode, satusehatOrgId: h.value.satusehatOrgId,
      },
    })
    toast({ title: 'Profil RS tersimpan', description: 'Perubahan tercatat di Audit Trail.' })
    data.value = await api('/settings')
    form.value = null
    showErrors.value = false
    touched.value = new Set()
  } catch (e: any) {
    toast({ title: 'Gagal menyimpan', description: e?.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Profil RS & Integrasi"
      sub="Konfigurasi koneksi API RS (GET-only), SATUSEHAT Organization ID, dan kredensial BPJS. Secret tidak pernah dikirim balik ke browser." demo
    />
    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Profil Rumah Sakit" sub="Hanya Admin RS & Super Admin dapat menyimpan">
        <template #icon><Building class="h-4 w-4" /></template>
        <template #action>
          <Button v-if="canEdit" size="sm" class="h-7 gap-1 bg-brand text-xs hover:bg-brand-hover" :disabled="saving" @click="save">
            <Save class="h-3 w-3" /> Simpan
          </Button>
        </template>
        <div class="grid gap-3">
          <p v-if="!canEdit" class="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            Mode lihat saja. Profil RS hanya dapat diubah oleh Admin RS atau Super Admin.
          </p>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Nama RS</Label>
            <Input
              :model-value="h?.name ?? ''" :disabled="!canEdit"
              :class="['text-xs', errorOf('name') && 'ring-1 ring-danger focus-visible:ring-danger']"
              @update:model-value="(v) => setField('name', v)"
            />
            <p v-if="errorOf('name')" class="text-[10px] text-danger">{{ errorOf('name') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Kelas RS</Label>
            <Select
              :model-value="CLASSES.includes(h?.class) ? h.class : ''" :disabled="!canEdit"
              placeholder="Pilih kelas…" label="Pilih Kelas RS"
              @update:model-value="(v) => setField('class', v)"
            >
              <SelectOption v-for="c in CLASSES" :key="c" :value="c">Kelas {{ c }}</SelectOption>
            </Select>
            <p v-if="errorOf('class') || (h?.class && !CLASSES.includes(h.class))" class="text-[10px] text-danger">
              {{ errorOf('class') || `Kelas tersimpan "${h.class}" tidak valid. Pilih A, B, C, atau D lalu simpan.` }}
            </p>
          </div>
          <RegionSelect
            :province="h?.province ?? ''" :city="h?.city ?? ''" :district="h?.district ?? ''" :village="h?.village ?? ''" :disabled="!canEdit"
            @update:province="(v) => setField('province', v)" @update:city="(v) => setField('city', v)"
            @update:district="(v) => setField('district', v)" @update:village="(v) => setField('village', v)"
          />
          <div v-for="[k, label] in fields" :key="k" class="grid gap-1">
            <Label class="text-xs font-semibold">{{ label }}</Label>
            <Input
              :model-value="(h?.[k] as any) ?? ''" :disabled="!canEdit"
              :maxlength="k === 'bpjsFacilityCode' ? 10 : undefined" :placeholder="k === 'bpjsFacilityCode' ? 'mis. 0137R038' : undefined"
              :class="['text-xs', k === 'bpjsFacilityCode' && 'uppercase placeholder:normal-case', errorOf(k) && 'ring-1 ring-danger focus-visible:ring-danger']"
              @update:model-value="(v) => setField(k, v)"
            />
            <p v-if="errorOf(k)" class="text-[10px] text-danger">{{ errorOf(k) }}</p>
            <p v-else-if="k === 'bpjsFacilityCode'" class="text-[10px] text-muted-foreground">Kode PPK di PKS BPJS: 4 angka + R + 3 angka.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1">
              <Label class="text-xs font-semibold">Jumlah TT Terlisensi</Label>
              <Input
                :model-value="h?.bedLicensed ?? ''" inputmode="numeric" :disabled="!canEdit"
                :class="['text-xs', errorOf('bedLicensed') && 'ring-1 ring-danger focus-visible:ring-danger']"
                @update:model-value="(v) => setField('bedLicensed', v)"
              />
              <p v-if="errorOf('bedLicensed')" class="text-[10px] text-danger">{{ errorOf('bedLicensed') }}</p>
            </div>
            <div class="grid gap-1">
              <Label class="text-xs font-semibold">Tier Langganan SPKD</Label>
              <Input :model-value="h?.tier ?? ''" disabled class="text-xs" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Konfigurasi API RS" sub="Base URL FHIR internal + autentikasi OAuth 2.0 (direkomendasikan) — diuji lewat tombol Test Koneksi">
        <template #icon><Cable class="h-4 w-4" /></template>
        <div class="space-y-2.5">
          <div v-for="s in (src?.sources ?? []).slice(0, 6)" :key="s.id" class="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div class="min-w-0">
              <div class="truncate text-xs font-semibold">{{ s.name }}</div>
              <div class="text-[10px] text-muted-foreground">{{ s.authMethod }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline" class="text-[9px]">Secret tersimpan ●</Badge>
              <StatusBadge :status="s.status" />
            </div>
          </div>
          <div class="rounded-lg bg-info-light px-3 py-2.5 text-[11px] leading-relaxed text-info">
            Platform hanya melakukan panggilan <strong>GET</strong> ke sistem RS — tidak pernah POST/PUT/DELETE. Data pasien mentah dibuang segera setelah dihitung; hanya hasil komputasi &amp; metadata yang disimpan.
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
