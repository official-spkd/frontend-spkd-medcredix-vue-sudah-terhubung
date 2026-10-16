<script setup lang="ts">
// AdminView — Panel Admin SPKD (port dari views-settings.tsx).
// Super Admin bisa menambah RS mitra baru sekaligus akun Admin RS pertamanya (POST /api/hospitals).
import { Building, Award, TrendingUp, ShieldCheck, Globe2, Plus, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useMedCredix } from '~/stores/medcredix'
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import { toast } from '~/composables/useToast'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Dialog from '~/components/ui/Dialog.vue'
import Input from '~/components/ui/Input.vue'
import Label from '~/components/ui/Label.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import ChartBar from '~/components/medcredix/ChartBar.vue'
import KpiCard from '~/components/medcredix/KpiCard.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import RegionSelect from '~/components/medcredix/RegionSelect.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'
import StatusBadge from '~/components/medcredix/StatusBadge.vue'

const store = useMedCredix()
const data = ref<any>(null)
async function load() {
  try { data.value = await api('/admin') } catch { data.value = null }
}
onMounted(load)
const hospitals = computed(() => data.value?.hospitals ?? [])
const stageColors = (stage: number) => (stage >= 5 ? '#059669' : stage >= 3 ? '#D97706' : '#DC2626')
const isSuper = computed(() => store.user?.role === 'super_admin')

// ---------- Tambah RS ----------
const blankForm = () => ({
  name: '', code: '', cls: '', province: '', city: '', district: '', village: '', beds: '', bpjs: '',
  adminName: '', adminTitle: '', adminEmail: '', adminPassword: '',
})
const form = ref(blankForm())
const adding = ref(false)
const showPw = ref(false)
const tried = ref(false)
const saving = ref(false)
const apiError = ref('')
function openAdd() {
  form.value = blankForm()
  dirSel.value = ''
  showPw.value = false; tried.value = false; apiError.value = ''
  adding.value = true
}

// ---------- Daftar RS Kemenkes (GET /api/hospital-directory) ----------
// Setelah kab/kota dipilih, Super Admin memilih RS dari daftar; nama, kode, kelas, dan TT terisi otomatis.
const MANUAL = '__manual'
const dir = ref<any[]>([])
const dirLoading = ref(false)
const dirSel = ref('')
const dirFree = computed(() => dir.value.filter((h) => !h.registered))
const dirTaken = computed(() => dir.value.length - dirFree.value.length)
const dirPick = computed(() => dir.value.find((h) => h.code === dirSel.value) ?? null)
watch(() => [form.value.province, form.value.city], async ([prov, city]) => {
  dir.value = []
  dirSel.value = ''
  if (!prov || !city) return
  dirLoading.value = true
  try {
    const q = new URLSearchParams({ province: prov, city }).toString()
    const res = await api<any>(`/hospital-directory?${q}`)
    if (form.value.city === city) dir.value = res.hospitals ?? []
  } catch { dir.value = [] } finally { dirLoading.value = false }
})
function pickDirectory(code: string) {
  dirSel.value = code
  const h = dir.value.find((x) => x.code === code)
  if (!h) return // isi manual: biarkan isian apa adanya
  form.value.name = h.name
  form.value.code = h.code
  if (['A', 'B', 'C', 'D'].includes(h.class)) form.value.cls = h.class
  if (h.beds > 0) form.value.beds = String(h.beds)
}
const dirPlaceholder = computed(() => {
  if (!form.value.city) return 'Pilih kabupaten/kota dulu'
  if (dirLoading.value) return 'Memuat…'
  return dirFree.value.length ? `Pilih dari ${dirFree.value.length} RS di ${form.value.city}` : 'Tidak ada RS di daftar, isi manual'
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/
// Kode faskes BPJS RS (kode PPK di PKS BPJS): 4 angka + R + 3 angka, mis. 0137R038. Spasi diabaikan.
const BPJS_RE = /^\d{4}R\d{3}$/
const bpjsClean = (v: string) => v.replace(/\s+/g, '').toUpperCase()
const errors = computed(() => {
  const e: Record<string, string> = {}
  const f = form.value
  if (!f.name.trim()) e.name = 'Nama RS wajib diisi.'
  if (!f.code.trim()) e.code = 'Kode RS wajib diisi.'
  else if (!CODE_RE.test(f.code.trim())) e.code = '2-20 karakter: huruf, angka, atau tanda hubung.'
  if (!f.cls) e.cls = 'Pilih kelas RS.'
  if (!f.province) e.province = 'Pilih provinsi.'
  if (!f.city) e.city = 'Pilih kabupaten/kota.'
  if (!String(f.beds).trim()) e.beds = 'Jumlah TT wajib diisi.'
  else if (!/^\d+$/.test(String(f.beds).trim()) || Number(f.beds) <= 0) e.beds = 'Bilangan bulat lebih dari 0.'
  if (f.bpjs.trim() && !BPJS_RE.test(bpjsClean(f.bpjs))) e.bpjs = '8 karakter: 4 angka + R + 3 angka (mis. 0137R038).'
  if (!f.adminName.trim()) e.adminName = 'Nama Admin RS wajib diisi.'
  if (!f.adminEmail.trim()) e.adminEmail = 'Email wajib diisi.'
  else if (!EMAIL_RE.test(f.adminEmail.trim())) e.adminEmail = 'Format email tidak valid.'
  if (!f.adminPassword) e.adminPassword = 'Kata sandi wajib diisi.'
  else if (f.adminPassword.length < 8) e.adminPassword = 'Kata sandi minimal 8 karakter.'
  else if (f.adminPassword.length > 72) e.adminPassword = 'Kata sandi maksimal 72 karakter.'
  return e
})
const err = (k: string) => (tried.value ? errors.value[k] ?? '' : '')

async function save() {
  tried.value = true
  apiError.value = ''
  if (Object.keys(errors.value).length) return
  const f = form.value
  saving.value = true
  try {
    const res = await api<any>('/hospitals', {
      method: 'POST',
      body: {
        name: f.name.trim(), code: f.code.trim(), class: f.cls,
        province: f.province, city: f.city, district: f.district, village: f.village,
        bedLicensed: Number(f.beds), bpjsFacilityCode: bpjsClean(f.bpjs),
        admin: { name: f.adminName.trim(), title: f.adminTitle.trim(), email: f.adminEmail.trim(), password: f.adminPassword },
      },
    })
    toast({ title: 'Rumah sakit ditambahkan', description: `${res.hospital.name}. Admin RS login dengan ${res.admin.email}.` })
    adding.value = false
    store.bumpData() // daftar RS di navbar ikut diperbarui
    await load()
  } catch (e: any) {
    apiError.value = e?.message ?? 'Gagal menyimpan.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Panel Admin SPKD"
      sub="Gambaran nasional lintas rumah sakit — untuk Super Admin & Auditor BPJS. Isolasi tenant tetap ditegakkan: auditor melihat agregat, bukan data mentah RS lain." demo
    />
    <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
      <KpiCard label="Total RS" :value="data?.summary?.totalRS ?? 0" tone="info">
        <template #icon><Building class="h-4 w-4" /></template>
      </KpiCard>
      <KpiCard label="Rata-rata BDCS" :value="data?.summary?.rataBdc ?? 0" tone="info">
        <template #icon><Award class="h-4 w-4" /></template>
      </KpiCard>
      <KpiCard label="Rata-rata Health" :value="data?.summary?.rataHealth ?? 0" tone="success">
        <template #icon><TrendingUp class="h-4 w-4" /></template>
      </KpiCard>
      <KpiCard label="Lulus Kredensial" :value="data?.summary?.lulus ?? 0" unit="RS" tone="success">
        <template #icon><ShieldCheck class="h-4 w-4" /></template>
      </KpiCard>
      <KpiCard label="Under Review" :value="data?.summary?.underReview ?? 0" unit="RS" :tone="(data?.summary?.underReview ?? 0) > 0 ? 'danger' : 'muted'">
        <template #icon><Globe2 class="h-4 w-4" /></template>
      </KpiCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <SectionCard title="Manajemen Rumah Sakit" sub="Klik untuk membuka konteks RS (super admin)">
        <template v-if="isSuper" #action>
          <Button size="sm" class="h-7 gap-1 bg-brand text-xs hover:bg-brand-hover" @click="openAdd">
            <Plus class="h-3 w-3" /> Tambah RS
          </Button>
        </template>
        <div class="overflow-x-auto rounded-xl border">
          <table class="w-full text-xs">
            <thead class="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th class="px-3 py-2.5">Rumah Sakit</th><th class="px-3 py-2.5">Kelas</th><th class="px-3 py-2.5 text-right">Health</th>
                <th class="px-3 py-2.5 text-right">BDCS</th><th class="px-3 py-2.5 text-center">Stage</th>
                <th class="px-3 py-2.5 text-right">Trust</th><th class="px-3 py-2.5 text-right">CCS</th><th class="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="h in hospitals" :key="h.id"
                class="cursor-pointer border-t transition-colors hover:bg-muted/30"
                @click="store.setHospital(h.id); store.navigate('dashboard')"
              >
                <td class="px-3 py-2.5">
                  <div class="font-semibold">
                    {{ h.name }}
                    <Badge v-if="h.onboarding" variant="outline" class="ml-1 border-brand-2/40 bg-brand-2-light text-[9px] text-brand-2-dark">Onboarding</Badge>
                  </div>
                  <div class="text-[9px] text-muted-foreground">{{ [h.city, h.province].filter(Boolean).join(', ') || h.code }}<template v-if="h.tier"> · Tier {{ h.tier }}</template></div>
                </td>
                <td class="px-3 py-2.5">{{ h.class }}</td>
                <td class="px-3 py-2.5 text-right font-display font-bold">{{ h.healthScore }}</td>
                <td class="px-3 py-2.5 text-right font-display font-bold text-brand">{{ h.bcds }}</td>
                <td class="px-3 py-2.5 text-center">
                  <Badge :class="['whitespace-nowrap text-[10px]', h.lulus ? 'bg-success-light text-success' : 'bg-danger-light text-danger']">S{{ h.stage }} {{ h.lulus ? 'LULUS' : 'TIDAK' }}</Badge>
                </td>
                <td class="px-3 py-2.5 text-right">{{ h.trust }}</td>
                <td class="px-3 py-2.5 text-right">{{ h.ccs }}</td>
                <td class="px-3 py-2.5"><StatusBadge :status="h.underReview ? 'Under Review' : 'Normal'" :tone="h.underReview ? 'danger' : 'success'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div class="space-y-4">
        <SectionCard title="Distribusi Stage Nasional" sub="Stage 0–7 (kelulusan ≥ Stage 5)">
          <ChartBar
            :labels="(data?.stageDist ?? []).map((s: any) => `S${s.stage}`)"
            :datasets="[{ label: 'Jumlah RS', data: (data?.stageDist ?? []).map((s: any) => s.count), color: (data?.stageDist ?? []).map((s: any) => stageColors(s.stage)) }]"
            :height="176" :suggested-max="4"
          />
        </SectionCard>
        <SectionCard title="Tren BDCS per RS" sub="6 bulan terakhir">
          <div class="space-y-2.5">
            <div v-for="h in hospitals" :key="h.id">
              <div class="mb-1 flex items-center justify-between text-[10px]">
                <span class="font-semibold">{{ h.name }}</span>
                <span class="font-display font-bold text-brand">{{ h.trend[h.trend.length - 1]?.bcds ?? '—' }}</span>
              </div>
              <div class="flex h-6 items-end gap-1">
                <div
                  v-for="t in h.trend" :key="t.period"
                  class="flex-1 rounded-sm bg-brand-2/80" :style="{ height: `${Math.max(12, ((t.bcds - 40) / 60) * 100)}%` }"
                  :title="`${t.period}: ${t.bcds}`"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>

    <!-- Tambah RS mitra + akun Admin RS pertama -->
    <Dialog size="lg" :open="adding" @update:open="(o) => !o && !saving && (adding = false)">
      <h2 class="text-left text-lg font-bold">Tambah Rumah Sakit</h2>
      <p class="mt-0.5 text-xs text-muted-foreground">
        RS baru langsung aktif bersama satu akun Admin RS. Admin RS itulah yang membuat akun staf lainnya di Pengaturan &gt; Pengguna.
      </p>
      <form class="mt-4 grid gap-4" @submit.prevent="save">
        <fieldset class="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
          <legend class="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Data rumah sakit</legend>
          <RegionSelect
            v-model:province="form.province" v-model:city="form.city" v-model:district="form.district" v-model:village="form.village"
            require-city class="sm:col-span-2" :errors="{ province: err('province'), city: err('city') }"
          />
          <div class="grid gap-1 sm:col-span-2">
            <Label class="text-xs font-semibold">Pilih dari daftar RS Kemenkes <span class="font-normal text-muted-foreground">(opsional)</span></Label>
            <Select
              :model-value="dirSel" :disabled="!form.city || dirLoading" :placeholder="dirPlaceholder" label="Pilih Rumah Sakit" searchable
              @update:model-value="pickDirectory"
            >
              <SelectOption :value="MANUAL">RS belum ada di daftar, isi manual</SelectOption>
              <SelectOption v-for="h in dirFree" :key="h.code" :value="h.code">{{ h.name }}{{ h.class ? ` · Kelas ${h.class}` : '' }}</SelectOption>
            </Select>
            <p v-if="dirPick" class="text-[10px] leading-relaxed text-muted-foreground">
              {{ dirPick.type }} · {{ dirPick.ownership }} · {{ dirPick.beds }} TT<template v-if="dirPick.address"> · {{ dirPick.address }}</template><br />
              Terisi otomatis dari data SIRS Kemenkes 2024. Cek lagi kelas dan jumlah TT, lalu ubah bila sudah berbeda.
            </p>
            <p v-else-if="dirTaken" class="text-[10px] text-muted-foreground">{{ dirTaken }} RS di kota ini sudah terdaftar di MedCredix, jadi tidak ditampilkan.</p>
          </div>
          <div class="grid gap-1 sm:col-span-2">
            <Label class="text-xs font-semibold">Nama RS</Label>
            <Input v-model="form.name" class="text-xs" placeholder="mis. RS Harapan Bunda" />
            <p v-if="err('name')" class="text-[10px] text-danger">{{ err('name') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Kode RS</Label>
            <Input v-model="form.code" class="text-xs uppercase placeholder:normal-case" placeholder="mis. 3275414 (kode RS Kemenkes)" />
            <p v-if="err('code')" class="text-[10px] text-danger">{{ err('code') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Kelas RS</Label>
            <Select v-model="form.cls" label="Pilih Kelas" placeholder="Pilih kelas">
              <SelectOption v-for="k in ['A', 'B', 'C', 'D']" :key="k" :value="k">Kelas {{ k }}</SelectOption>
            </Select>
            <p v-if="err('cls')" class="text-[10px] text-danger">{{ err('cls') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Jumlah TT terlisensi</Label>
            <Input v-model="form.beds" inputmode="numeric" class="text-xs" placeholder="mis. 150" />
            <p v-if="err('beds')" class="text-[10px] text-danger">{{ err('beds') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Kode faskes BPJS <span class="font-normal text-muted-foreground">(opsional)</span></Label>
            <Input v-model="form.bpjs" maxlength="10" class="text-xs uppercase placeholder:normal-case" placeholder="mis. 0137R038" />
            <p v-if="err('bpjs')" class="text-[10px] text-danger">{{ err('bpjs') }}</p>
            <p v-else class="text-[10px] text-muted-foreground">Kode PPK di PKS BPJS. Boleh dikosongkan dulu.</p>
          </div>
        </fieldset>

        <fieldset class="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
          <legend class="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Akun Admin RS pertama</legend>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Nama lengkap</Label>
            <Input v-model="form.adminName" class="text-xs" placeholder="mis. dr. Sinta Lestari" />
            <p v-if="err('adminName')" class="text-[10px] text-danger">{{ err('adminName') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Jabatan <span class="font-normal text-muted-foreground">(opsional)</span></Label>
            <Input v-model="form.adminTitle" class="text-xs" placeholder="mis. Kepala Instalasi SIMRS" />
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Email (dipakai untuk login)</Label>
            <Input v-model="form.adminEmail" type="email" autocomplete="off" class="text-xs" placeholder="admin@rumahsakit.co.id" />
            <p v-if="err('adminEmail')" class="text-[10px] text-danger">{{ err('adminEmail') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Kata sandi awal</Label>
            <div class="relative">
              <Input v-model="form.adminPassword" :type="showPw ? 'text' : 'password'" autocomplete="new-password" class="pr-9 text-xs" placeholder="Minimal 8 karakter" />
              <button
                type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                :aria-label="showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPw = !showPw"
              >
                <EyeOff v-if="showPw" class="h-3.5 w-3.5" /><Eye v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p v-if="err('adminPassword')" class="text-[10px] text-danger">{{ err('adminPassword') }}</p>
          </div>
        </fieldset>

        <p v-if="apiError" class="rounded-lg bg-danger/10 px-3 py-2 text-[11px] text-danger">{{ apiError }}</p>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" class="h-8 text-xs" :disabled="saving" @click="adding = false">Batal</Button>
          <Button type="submit" size="sm" class="h-8 gap-1 bg-brand text-xs hover:bg-brand-hover" :disabled="saving">
            <Loader2 v-if="saving" class="h-3 w-3 animate-spin" /> Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  </div>
</template>
