<script setup lang="ts">
// RegionSelect — dropdown wilayah bertingkat: Provinsi > Kabupaten/Kota > Kecamatan > Kelurahan/Desa.
// Data dari GET /api/regions (Kepmendagri 2025: 38 provinsi, ter-embed di backend). Nilai yang disimpan = nama wilayah.
// Memilih tingkat atas mengosongkan tingkat di bawahnya. Nilai lama yang tidak ada di daftar tetap tampil dengan catatan.
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import Label from '~/components/ui/Label.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'

type Region = { code: string; name: string; level: number }

const province = defineModel<string>('province', { default: '' })
const city = defineModel<string>('city', { default: '' })
const district = defineModel<string>('district', { default: '' })
const village = defineModel<string>('village', { default: '' })
const props = defineProps<{ disabled?: boolean; requireCity?: boolean; errors?: Record<string, string> }>()

// Cache per kode induk (selama form terbuka), supaya daftar yang sama tidak diminta ulang.
const cache = new Map<string, Promise<Region[]>>()
function children(parent: string): Promise<Region[]> {
  if (!cache.has(parent)) {
    const p = api<Region[]>(`/regions${parent ? `?parent=${encodeURIComponent(parent)}` : ''}`).catch(() => {
      cache.delete(parent) // gagal: boleh dicoba lagi
      return [] as Region[]
    })
    cache.set(parent, p)
  }
  return cache.get(parent)!
}

const lists = ref<Region[][]>([[], [], [], []])
const loading = ref([false, false, false, false])
const values = computed(() => [province.value, city.value, district.value, village.value])
const codeOf = (level: number) => lists.value[level].find((r) => r.name.toLowerCase() === (values.value[level] ?? '').toLowerCase())?.code ?? ''

async function load(level: number, parent: string) {
  if (level > 0 && !parent) {
    lists.value[level] = []
    return
  }
  loading.value[level] = true
  lists.value[level] = await children(parent)
  loading.value[level] = false
}
onMounted(() => load(0, ''))
// Tingkat bawah dimuat ulang setiap kode tingkat atasnya berubah (termasuk saat data awal datang).
watch(() => codeOf(0), (c) => load(1, c), { immediate: true })
watch(() => codeOf(1), (c) => load(2, c), { immediate: true })
watch(() => codeOf(2), (c) => load(3, c), { immediate: true })

const models = [province, city, district, village]
function choose(level: number, v: string) {
  if (v === values.value[level]) return
  models[level].value = v
  for (let i = level + 1; i < 4; i++) models[i].value = '' // tingkat bawah harus dipilih ulang
}

const LEVELS = [
  { label: 'Provinsi', placeholder: 'Pilih provinsi' },
  { label: 'Kabupaten/Kota', placeholder: 'Pilih kabupaten/kota' },
  { label: 'Kecamatan', placeholder: 'Pilih kecamatan' },
  { label: 'Kelurahan/Desa', placeholder: 'Pilih kelurahan/desa' },
]
const KEYS = ['province', 'city', 'district', 'village']
const optional = (i: number) => (i === 0 ? false : i === 1 ? !props.requireCity : true)
// Nilai tersimpan yang tidak ada di daftar resmi (data lama), hanya dicek setelah daftarnya termuat.
const legacy = (i: number) =>
  !!values.value[i] && !loading.value[i] && !codeOf(i) && (lists.value[i].length > 0 || (i > 0 && !codeOf(i - 1)))
const lockedBy = (i: number) => (i > 0 && !codeOf(i - 1) ? LEVELS[i - 1].label.toLowerCase() : '')
// Kelurahan berkode 1xxx, desa 2xxx (aturan kode Kepmendagri).
const villageKind = (r: Region) => (r.code.split('.')[3]?.startsWith('1') ? 'Kel.' : 'Desa')
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div v-for="(lv, i) in LEVELS" :key="lv.label" class="grid content-start gap-1">
      <Label class="text-xs font-semibold">
        {{ lv.label }} <span v-if="optional(i)" class="font-normal text-muted-foreground">(opsional)</span>
      </Label>
      <Select
        :model-value="values[i]"
        :disabled="disabled || (i > 0 && !codeOf(i - 1) && !values[i])"
        :placeholder="loading[i] ? 'Memuat…' : lockedBy(i) ? `Pilih ${lockedBy(i)} dulu` : lv.placeholder"
        :label="lv.placeholder"
        searchable
        @update:model-value="(v) => choose(i, v)"
      >
        <SelectOption v-for="r in lists[i]" :key="r.code" :value="r.name">
          {{ i === 3 ? `${r.name} (${villageKind(r)})` : r.name }}
        </SelectOption>
      </Select>
      <p v-if="errors?.[KEYS[i]]" class="text-[10px] text-danger">{{ errors[KEYS[i]] }}</p>
      <p v-else-if="legacy(i)" class="text-[10px] text-warning">Data lama, belum sesuai daftar Kepmendagri. Pilih ulang dari daftar.</p>
    </div>
  </div>
</template>
