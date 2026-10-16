<script setup lang="ts">
// SettingsUsersView — port dari views-settings.tsx.
// Admin RS & Super Admin bisa menambah pengguna, mengubah data akun (nama, jabatan, email, peran, kata sandi),
// serta menonaktifkan/mengaktifkan akun. Aturan yang sama ditegakkan backend (POST/PATCH /api/users).
import { Users, UserCog, UserPlus, Pencil, Power, Eye, EyeOff, Loader2, Info } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '~/composables/useApi'
import { toast } from '~/composables/useToast'
import { useMedCredix } from '~/stores/medcredix'
import { fmtDateTime } from '~/utils/format'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Dialog from '~/components/ui/Dialog.vue'
import Input from '~/components/ui/Input.vue'
import Label from '~/components/ui/Label.vue'
import Select from '~/components/ui/Select.vue'
import SelectOption from '~/components/ui/SelectOption.vue'
import Switch from '~/components/ui/Switch.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'

const store = useMedCredix()
const data = ref<any>(null)
const roleSel = ref('')
async function load() {
  try { data.value = await api('/settings') } catch { data.value = null }
}
onMounted(load)
const roles = computed(() => data.value?.roles ?? [])
const selectedRole = computed(() => roles.value.find((r: any) => r.key === roleSel.value) ?? roles.value[0])
watch(selectedRole, (r) => { if (r && !roleSel.value) roleSel.value = r.key })

const users = computed<any[]>(() => data.value?.users ?? [])
const activeCount = computed(() => users.value.filter((u) => u.active).length)

// ---------- Hak kelola (sama dengan backend) ----------
const isSuper = computed(() => store.user?.role === 'super_admin')
const isAdmin = computed(() => isSuper.value || store.user?.role === 'admin_rs')
const isSelf = (u: any) => u.id === store.user?.id
function canManage(u: any) {
  if (!isAdmin.value) return false
  if (u.role === 'super_admin' && !isSuper.value) return false // akun Super Admin hanya diubah Super Admin
  if (!u.hospitalId && !isSuper.value) return false // akun lintas RS (mis. Auditor BPJS)
  return true
}
// Peran yang boleh diberikan: Super Admin hanya oleh Super Admin.
const roleOptions = computed(() => roles.value.filter((r: any) => r.key !== 'super_admin' || isSuper.value))

// ---------- Form tambah / ubah ----------
type Form = { id: string; name: string; title: string; email: string; role: string; password: string; active: boolean }
const editing = ref<null | { mode: 'create' | 'edit'; orig: any }>(null)
const form = ref<Form>({ id: '', name: '', title: '', email: '', role: '', password: '', active: true })
const showPw = ref(false)
const tried = ref(false)
const saving = ref(false)
const apiError = ref('')

function openCreate() {
  form.value = { id: '', name: '', title: '', email: '', role: 'viewer', password: '', active: true }
  editing.value = { mode: 'create', orig: null }
  showPw.value = false; tried.value = false; apiError.value = ''
}
function openEdit(u: any) {
  form.value = { id: u.id, name: u.name ?? '', title: u.title ?? '', email: u.email ?? '', role: u.role, password: '', active: u.active }
  editing.value = { mode: 'edit', orig: u }
  showPw.value = false; tried.value = false; apiError.value = ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const errors = computed(() => {
  const e: Record<string, string> = {}
  const f = form.value
  if (!f.name.trim()) e.name = 'Nama wajib diisi.'
  if (!f.email.trim()) e.email = 'Email wajib diisi.'
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Format email tidak valid.'
  if (!f.role) e.role = 'Pilih peran.'
  const creating = editing.value?.mode === 'create'
  if (creating && !f.password) e.password = 'Kata sandi wajib diisi.'
  else if (f.password && f.password.length < 8) e.password = 'Kata sandi minimal 8 karakter.'
  else if (f.password.length > 72) e.password = 'Kata sandi maksimal 72 karakter.'
  return e
})
const err = (k: string) => (tried.value ? errors.value[k] ?? '' : '')

async function save() {
  tried.value = true
  apiError.value = ''
  if (Object.keys(errors.value).length || !editing.value) return
  const f = form.value
  saving.value = true
  try {
    if (editing.value.mode === 'create') {
      await api('/users', {
        method: 'POST',
        body: { name: f.name.trim(), title: f.title.trim(), email: f.email.trim(), role: f.role, password: f.password },
      })
      toast({ title: 'Pengguna ditambahkan', description: `${f.name.trim()} bisa login dengan email ${f.email.trim().toLowerCase()}.` })
    } else {
      const o = editing.value.orig
      const body: Record<string, any> = { id: f.id }
      if (f.name.trim() !== o.name) body.name = f.name.trim()
      if (f.title.trim() !== (o.title ?? '')) body.title = f.title.trim()
      if (f.email.trim().toLowerCase() !== o.email) body.email = f.email.trim()
      if (f.role !== o.role) body.role = f.role
      if (f.active !== o.active) body.active = f.active
      if (f.password) body.password = f.password
      if (Object.keys(body).length === 1) {
        editing.value = null
        return
      }
      await api('/users', { method: 'PATCH', body })
      toast({ title: 'Pengguna diperbarui', description: 'Perubahan tercatat di Audit Trail.' })
    }
    editing.value = null
    await load()
  } catch (e: any) {
    apiError.value = e?.message ?? 'Gagal menyimpan.'
  } finally {
    saving.value = false
  }
}

// ---------- Nonaktifkan / aktifkan ----------
const confirming = ref<any>(null)
const toggling = ref(false)
async function confirmToggle() {
  const u = confirming.value
  if (!u) return
  toggling.value = true
  try {
    await api('/users', { method: 'PATCH', body: { id: u.id, active: !u.active } })
    toast({ title: u.active ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan', description: u.name })
    confirming.value = null
    await load()
  } catch (e: any) {
    toast({ title: 'Gagal', description: e?.message, variant: 'destructive' })
  } finally {
    toggling.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Pengguna & Peran"
      sub="RBAC — 13 izin dasar, ditegakkan di sisi server untuk setiap endpoint. Akun dibuatkan oleh Admin RS / Super Admin (tanpa registrasi mandiri)." demo
    />
    <div class="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <SectionCard title="Pengguna" :sub="`${activeCount} akun aktif dari ${users.length}`">
        <template #icon><Users class="h-4 w-4" /></template>
        <template #action>
          <Button v-if="isAdmin" size="sm" class="h-7 gap-1 bg-brand text-xs hover:bg-brand-hover" @click="openCreate">
            <UserPlus class="h-3 w-3" /> Tambah Pengguna
          </Button>
        </template>
        <p v-if="isAdmin" class="mb-3 text-[10px] text-muted-foreground">
          Kolom Aksi: <Pencil class="inline h-3 w-3" /> ubah data akun (nama, email, peran, kata sandi), <Power class="inline h-3 w-3" /> nonaktifkan atau aktifkan akun.
        </p>
        <div v-if="!isAdmin" class="mb-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <Info class="mt-px h-3.5 w-3.5 shrink-0" />
          <span>Mode lihat saja. Menambah, mengubah, dan menonaktifkan pengguna hanya dapat dilakukan Admin RS atau Super Admin.</span>
        </div>
        <div class="overflow-x-auto rounded-xl border">
          <table class="w-full text-xs">
            <thead class="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th class="px-3 py-2.5">Pengguna</th><th class="px-3 py-2.5">Peran</th>
                <th class="px-3 py-2.5">Login Terakhir</th><th v-if="isAdmin" class="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" :class="['border-t align-top', !u.active && 'bg-muted/30']">
                <td class="min-w-44 px-3 py-2.5">
                  <div :class="['font-semibold', !u.active && 'text-muted-foreground']">
                    {{ u.name }}
                    <Badge v-if="!u.active" variant="outline" class="ml-1 border-danger/40 text-[9px] text-danger">Nonaktif</Badge>
                    <span v-if="isSelf(u)" class="ml-1 text-[9px] font-normal text-muted-foreground">(Anda)</span>
                  </div>
                  <div class="break-all text-[10px] text-muted-foreground">{{ u.email }}</div>
                  <div v-if="u.title" class="text-[9px] text-muted-foreground">{{ u.title }}</div>
                </td>
                <td class="px-3 py-2.5"><Badge class="whitespace-nowrap bg-brand-light text-[10px] font-semibold text-brand hover:bg-brand-light">{{ u.roleLabel }}</Badge></td>
                <td class="px-3 py-2.5 text-[10px] text-muted-foreground">{{ fmtDateTime(u.lastLogin) }}</td>
                <td v-if="isAdmin" class="px-3 py-2">
                  <div v-if="canManage(u)" class="flex justify-end gap-1">
                    <Button size="sm" variant="outline" class="h-7 w-7 px-0" :title="`Ubah ${u.name}`" :aria-label="`Ubah ${u.name}`" @click="openEdit(u)">
                      <Pencil class="h-3 w-3" />
                    </Button>
                    <Button
                      v-if="!isSelf(u)" size="sm" variant="outline"
                      :class="['h-7 w-7 px-0', u.active ? 'text-danger' : 'text-success']"
                      :title="`${u.active ? 'Nonaktifkan' : 'Aktifkan'} ${u.name}`" :aria-label="`${u.active ? 'Nonaktifkan' : 'Aktifkan'} ${u.name}`"
                      @click="confirming = u"
                    >
                      <Power class="h-3 w-3" />
                    </Button>
                  </div>
                  <div v-else class="text-right text-[10px] leading-tight text-muted-foreground">Dikelola<br />Super Admin</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Matriks Peran & Izin" sub="Pilih peran untuk melihat izinnya">
        <template #icon><UserCog class="h-4 w-4" /></template>
        <div v-if="roles.length">
          <Select v-model="roleSel">
            <SelectOption v-for="r in roles" :key="r.key" :value="r.key">{{ r.label }}</SelectOption>
          </Select>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <Badge
              v-for="p in selectedRole?.permissions ?? []" :key="p" variant="outline"
              :class="['text-[10px] font-semibold', p === 'VIEW' ? 'text-muted-foreground' : 'border-brand-2/40 bg-brand-2-light text-brand-2-dark']"
            >{{ p }}</Badge>
          </div>
          <p class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Izin diperiksa server pada setiap request. Peran tanpa izin CONFIGURE tetap dapat membuka halaman pengaturan, tetapi setiap upaya penyimpanan ditolak sistem dan tercatat di audit.
            Kelola pengguna dan Profil RS khusus Admin RS & Super Admin.
          </p>
        </div>
      </SectionCard>
    </div>

    <!-- Tambah / ubah pengguna -->
    <Dialog :open="!!editing" @update:open="(o) => !o && !saving && (editing = null)">
      <template v-if="editing">
        <h2 class="text-left text-lg font-bold">{{ editing.mode === 'create' ? 'Tambah Pengguna' : 'Ubah Pengguna' }}</h2>
        <p class="mt-0.5 text-xs text-muted-foreground">
          {{ editing.mode === 'create' ? 'Akun baru langsung aktif dan terikat ke RS yang sedang dipilih.' : 'Kosongkan kata sandi bila tidak ingin menggantinya.' }}
        </p>
        <form class="mt-4 grid gap-3" @submit.prevent="save">
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Nama lengkap</Label>
            <Input v-model="form.name" class="text-xs" placeholder="mis. dr. Sinta Lestari" />
            <p v-if="err('name')" class="text-[10px] text-danger">{{ err('name') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Jabatan <span class="font-normal text-muted-foreground">(opsional)</span></Label>
            <Input v-model="form.title" class="text-xs" placeholder="mis. Kepala Unit Rekam Medis" />
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Email (dipakai untuk login)</Label>
            <Input v-model="form.email" type="email" autocomplete="off" class="text-xs" placeholder="nama@rumahsakit.co.id" />
            <p v-if="err('email')" class="text-[10px] text-danger">{{ err('email') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">Peran</Label>
            <Select v-model="form.role" :disabled="editing.mode === 'edit' && isSelf(editing.orig)" label="Pilih Peran">
              <SelectOption v-for="r in roleOptions" :key="r.key" :value="r.key">{{ r.label }}</SelectOption>
            </Select>
            <p v-if="editing.mode === 'edit' && isSelf(editing.orig)" class="text-[10px] text-muted-foreground">Peran akun sendiri tidak dapat diubah.</p>
            <p v-if="err('role')" class="text-[10px] text-danger">{{ err('role') }}</p>
          </div>
          <div class="grid gap-1">
            <Label class="text-xs font-semibold">{{ editing.mode === 'create' ? 'Kata sandi awal' : 'Kata sandi baru' }}</Label>
            <div class="relative">
              <Input
                v-model="form.password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" class="pr-9 text-xs"
                :placeholder="editing.mode === 'create' ? 'Minimal 8 karakter' : 'Biarkan kosong bila tidak diganti'"
              />
              <button
                type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                :aria-label="showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPw = !showPw"
              >
                <EyeOff v-if="showPw" class="h-3.5 w-3.5" /><Eye v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p v-if="err('password')" class="text-[10px] text-danger">{{ err('password') }}</p>
          </div>
          <div v-if="editing.mode === 'edit' && !isSelf(editing.orig)" class="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <div class="text-xs font-semibold">Akun aktif</div>
              <div class="text-[10px] text-muted-foreground">Akun nonaktif tidak bisa login, dan sesi yang sedang berjalan langsung terputus.</div>
            </div>
            <Switch v-model="form.active" aria-label="Akun aktif" />
          </div>
          <p v-if="apiError" class="rounded-lg bg-danger/10 px-3 py-2 text-[11px] text-danger">{{ apiError }}</p>
          <div class="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" :disabled="saving" @click="editing = null">Batal</Button>
            <Button type="submit" size="sm" class="h-8 gap-1 bg-brand text-xs hover:bg-brand-hover" :disabled="saving">
              <Loader2 v-if="saving" class="h-3 w-3 animate-spin" /> Simpan
            </Button>
          </div>
        </form>
      </template>
    </Dialog>

    <!-- Konfirmasi nonaktifkan / aktifkan -->
    <Dialog size="sm" :open="!!confirming" @update:open="(o) => !o && !toggling && (confirming = null)">
      <template v-if="confirming">
        <h2 class="text-left text-base font-bold">{{ confirming.active ? 'Nonaktifkan' : 'Aktifkan' }} {{ confirming.name }}?</h2>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
          <template v-if="confirming.active">Akun ini tidak bisa login lagi dan sesi yang sedang berjalan langsung terputus. Data dan jejak auditnya tetap tersimpan, dan akun bisa diaktifkan kembali kapan saja.</template>
          <template v-else>Akun ini bisa login kembali dengan email dan kata sandi terakhirnya.</template>
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" class="h-8 text-xs" :disabled="toggling" @click="confirming = null">Batal</Button>
          <Button
            size="sm" :class="['h-8 gap-1 text-xs text-white', confirming.active ? 'bg-danger hover:bg-danger/90' : 'bg-brand hover:bg-brand-hover']"
            :disabled="toggling" @click="confirmToggle"
          >
            <Loader2 v-if="toggling" class="h-3 w-3 animate-spin" /> {{ confirming.active ? 'Nonaktifkan' : 'Aktifkan' }}
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
