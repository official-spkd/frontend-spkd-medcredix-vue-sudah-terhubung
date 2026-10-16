<script setup lang="ts">
// ReportsView — port dari views-assurance.tsx (ReportsView).
// Lihat dan Cetak memakai susunan isi yang sama (buildSections), jadi angka di layar dan di kertas/PDF selalu sama.
// Isi laporan adalah snapshot saat Generate. Skor Dashboard dihitung ulang terus (data & tanggal berubah),
// jadi Lihat dan Cetak juga menampilkan perbandingan snapshot vs skor terkini (compareScores) dari respons yang sama.
// Tombol mengikuti izin peran: Generate butuh CREATE, CSV butuh EXPORT, Cetak butuh EXPORT atau PRINT.
import { FileBarChart, Search, Download, FileText, Printer, PlusCircle, Loader2, Info } from 'lucide-vue-next'
import { toast } from '~/composables/useToast'
import { computed, onMounted, ref } from 'vue'
import { api, downloadCsv } from '~/composables/useApi'
import { useMedCredix } from '~/stores/medcredix'
import { fmtDateTime } from '~/utils/format'
import Badge from '~/components/ui/Badge.vue'
import Button from '~/components/ui/Button.vue'
import Dialog from '~/components/ui/Dialog.vue'
import DemoBadge from '~/components/medcredix/DemoBadge.vue'
import EmptyState from '~/components/medcredix/EmptyState.vue'
import PageHeader from '~/components/medcredix/PageHeader.vue'
import SectionCard from '~/components/medcredix/SectionCard.vue'

const store = useMedCredix()
const can = (p: string) => !!store.user?.permissions.includes(p)
const canCreate = computed(() => can('CREATE'))
const canExport = computed(() => can('EXPORT'))
const canPrint = computed(() => can('EXPORT') || can('PRINT'))

const generating = ref<string | null>(null)
const printing = ref<string | null>(null)
const selected = ref<any>(null)
const data = ref<any>(null)

async function load() {
  try { data.value = await api('/reports') } catch { data.value = null }
}
onMounted(load)

async function generate(type: string): Promise<any> {
  if (!canCreate.value) return null
  generating.value = type
  try {
    const rep = await api<any>('/reports', { method: 'POST', body: { type } })
    toast({ title: 'Laporan dibuat', description: 'Snapshot tersimpan dengan referensi audit.' })
    await load()
    return rep
  } catch (e: any) {
    toast({ title: 'Gagal membuat laporan', description: e?.message, variant: 'destructive' })
    return null
  } finally {
    generating.value = null
  }
}

// Generate ulang jenis laporan yang sama dengan skor terbaru, lalu langsung buka versinya yang baru.
async function regenerate(r: any) {
  const rep = await generate(r.type)
  if (rep?.id) await openReport(reports.value.find((x: any) => x.id === rep.id) ?? rep)
}

async function openReport(r: any) {
  try {
    const res = await api<any>(`/reports?id=${r.id}`)
    selected.value = { ...r, content: res.content, current: res.current }
  } catch (e: any) {
    toast({ title: 'Gagal membuka laporan', description: e?.message, variant: 'destructive' })
  }
}

function exportCsv(r: any) {
  if (!canExport.value) return
  downloadCsv(`/reports?export=${r.id}`)
}

const reports = computed(() => data.value?.reports ?? [])

// ---------- Susunan isi laporan (dipakai pop-up Lihat dan Cetak) ----------

type Field = { label: string; value: string }
type Block =
  | { kind: 'text'; text: string }
  | { kind: 'fields'; fields: Field[] }
  | { kind: 'table'; title?: string; columns: string[]; rows: string[][] }
type Section = { key: string; title: string; blocks: Block[] }

// Judul bagian dan nama field yang mudah dibaca. Key yang tidak terdaftar diubah dari camelCase.
const LABELS: Record<string, string> = {
  ringkasan: 'Ringkasan', namaRS: 'Nama RS', kelas: 'Kelas', kota: 'Kota', periode: 'Periode',
  healthScore: 'Hospital Health Score', health: 'Health Score', bcds: 'Skor Kredensial BPJS (BDCS)',
  stage: 'Stage', trust: 'Trust Score', ccs: 'Skor Integritas Klaim (CCS)', cpcs: 'Skor Clinical Pathway (CPCS)',
  safety: 'Patient Safety', period: 'Periode', dihitungPada: 'Skor dihitung pada', versiFormula: 'Versi formula',
  bdcS: 'Skor Kredensial BPJS (BDCS)', final: 'Skor akhir', raw: 'Skor mentah', multiplier: 'Pengali Trust',
  prereqOk: 'Prasyarat terpenuhi', lulus: 'Lulus',
  tenagaMedis: 'Tenaga Medis', total: 'Total', kredensial: 'Status Kredensial', prasyarat: 'Prasyarat Wajib',
  kelompok: 'Skor Kelompok A–D', workforce: 'Clinical Workforce', coverage: 'Cakupan (%)', practitioners: 'Jumlah praktisi',
  specialistCov: 'Cakupan spesialis', specialty: 'Spesialisasi', required: 'Dibutuhkan', available: 'Tersedia', note: 'Catatan',
  kode: 'Kode', nama: 'Nama', status: 'Status', kedaluwarsa: 'Kedaluwarsa',
  risiko: 'Risiko Aktif', kategori: 'Kategori', level: 'Level', judul: 'Judul', owner: 'Penanggung jawab', tenggat: 'Tenggat',
  aksi: 'Aksi Perbaikan', prioritas: 'Prioritas', resolusi: 'Resolusi', catatan: 'Catatan',
  matriks: 'Matriks Kepatuhan', regulasi: 'Regulasi', pasal: 'Pasal', requirement: 'Requirement', modul: 'Modul', review: 'Review',
  disclaimer: 'Disclaimer',
  klaim: 'Klaim', ditunda: 'Ditunda', ditolak: 'Ditolak', anomali: 'Anomali Klaim', tinggi: 'Keparahan tinggi',
  perluTinjauan: 'Perlu tinjauan', flaggedClaims: 'Klaim ditandai', grade: 'Grade', score: 'Skor', subs: 'Sub-skor',
  totalClaims: 'Total klaim', label: 'Kategori', weight: 'Bobot', ok: 'Sesuai', warn: 'Peringatan', bad: 'Tidak sesuai',
  domain: 'Domain', skor: 'Skor', bobot: 'Bobot', tren: 'Tren 6 Bulan', saran: 'Saran Perbaikan',
}
// Kolom teknis yang tidak perlu ditampilkan.
const HIDDEN = new Set(['key'])
// Urutan field di bagian Ringkasan (key lain menyusul sesuai urutan aslinya).
const ORDER = ['namaRS', 'kelas', 'kota', 'periode', 'healthScore', 'bcds', 'stage', 'trust', 'ccs', 'cpcs', 'dihitungPada', 'versiFormula']
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length)
// Urutan kolom tabel dan urutan bagian. Backend mengirim key urut abjad, jadi disusun ulang di sini.
const COL_ORDER = ['period', 'kode', 'domain', 'judul', 'nama', 'label', 'specialty', 'regulasi', 'pasal', 'health', 'bcds', 'trust', 'ccs', 'cpcs', 'safety', 'skor', 'score', 'bobot', 'weight']
const SECTION_FIRST = ['ringkasan', 'domain']
const SECTION_LAST = ['catatan', 'disclaimer']
const colRank = (k: string) => (COL_ORDER.includes(k) ? COL_ORDER.indexOf(k) : COL_ORDER.length)
const sectionRank = (k: string) => (SECTION_FIRST.includes(k) ? SECTION_FIRST.indexOf(k) - SECTION_FIRST.length : SECTION_LAST.includes(k) ? 1 : 0)

function labelOf(k: string): string {
  if (LABELS[k]) return LABELS[k]
  const s = k.replace(/([a-z])([A-Z])/g, '$1 $2')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtValue(key: string, v: any): string {
  if (v == null || v === '') return '—'
  if (key === 'dihitungPada') return fmtDateTime(v)
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  if (typeof v === 'number') {
    if ((key === 'weight' || key === 'bobot') && v <= 1) return `${Math.round(v * 1000) / 10}%`
    return String(v)
  }
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const isRowList = (v: any) => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))

function toTable(list: any[], title?: string): Block {
  const cols: string[] = []
  for (const row of list) for (const k of Object.keys(row)) if (!HIDDEN.has(k) && !cols.includes(k)) cols.push(k)
  cols.sort((a, b) => colRank(a) - colRank(b))
  return {
    kind: 'table', title, columns: cols.map(labelOf),
    rows: list.map((row) => cols.map((k) => fmtValue(k, row[k]))),
  }
}

function buildSections(content: any): Section[] {
  if (!content || typeof content !== 'object') return []
  return Object.entries(content).sort(([a], [b]) => sectionRank(a) - sectionRank(b)).map(([key, val]) => {
    const blocks: Block[] = []
    if (isRowList(val)) {
      blocks.push(toTable(val as any[]))
    } else if (Array.isArray(val)) {
      blocks.push({ kind: 'text', text: val.length ? val.map((x) => fmtValue(key, x)).join(', ') : '—' })
    } else if (val && typeof val === 'object') {
      const fields: Field[] = []
      const tables: Block[] = []
      const entries = Object.entries(val as Record<string, any>).sort(([a], [b]) => rank(a) - rank(b))
      for (const [k, v] of entries) {
        if (HIDDEN.has(k)) continue
        if (isRowList(v)) tables.push(toTable(v, labelOf(k)))
        else fields.push({ label: labelOf(k), value: fmtValue(k, v) })
      }
      if (fields.length) blocks.push({ kind: 'fields', fields })
      blocks.push(...tables)
    } else {
      blocks.push({ kind: 'text', text: fmtValue(key, val) })
    }
    return { key, title: labelOf(key), blocks }
  })
}

const sections = computed(() => buildSections(selected.value?.content))

// ---------- Perbandingan snapshot laporan vs skor terkini (Dashboard) ----------

type CmpRow = { label: string; snap: string; now: string; diff: string; changed: boolean }
type Cmp = { rows: CmpRow[]; changed: number; computedAt: any }

const CMP_FIELDS: [string, string][] = [
  ['healthScore', 'Hospital Health Score'], ['bcds', 'Skor Kredensial BPJS (BDCS)'], ['stage', 'Stage'],
  ['trust', 'Trust Score'], ['ccs', 'Skor Integritas Klaim (CCS)'], ['cpcs', 'Skor Clinical Pathway (CPCS)'],
]
const num = (v: any) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const r1 = (v: number) => Math.round(v * 10) / 10

function compareScores(content: any, current: any): Cmp | null {
  const snap = content?.ringkasan
  if (!snap || !current) return null
  const rows: CmpRow[] = []
  const add = (label: string, a: any, b: any) => {
    const x = num(a), y = num(b)
    const d = x != null && y != null ? r1(y - x) : null
    rows.push({
      label, snap: x == null ? '—' : String(x), now: y == null ? '—' : String(y),
      diff: d == null ? '—' : d === 0 ? '0' : `${d > 0 ? '+' : ''}${d}`,
      changed: d != null && d !== 0,
    })
  }
  for (const [k, label] of CMP_FIELDS) add(label, snap[k], current[k])
  // 9 domain: hanya bila snapshot menyimpannya (laporan lama jenis selain Hospital Health belum punya).
  const snapDom: any[] = Array.isArray(content?.domain) ? content.domain : []
  if (snapDom.length) {
    for (const d of current.domain ?? []) add(`Domain ${d.domain}`, snapDom.find((x) => x.domain === d.domain)?.skor, d.skor)
  }
  return { rows, changed: rows.filter((r) => r.changed).length, computedAt: current.computedAt }
}

const comparison = computed(() => compareScores(selected.value?.content, selected.value?.current))

// Tanda "skor berubah" di daftar Riwayat Laporan (contentJson sudah ikut di daftar, skor terkini dari GET /reports).
function parseContent(r: any) {
  try { return typeof r.contentJson === 'string' ? JSON.parse(r.contentJson) : r.contentJson } catch { return null }
}
const staleIds = computed(() => {
  const out = new Set<string>()
  for (const r of reports.value) if ((compareScores(parseContent(r), data.value?.current)?.changed ?? 0) > 0) out.add(r.id)
  return out
})

function snapshotNote(r: any) {
  return `Skor di laporan ini adalah snapshot saat laporan dibuat (${fmtDateTime(r.generatedAt)}) dan tidak ikut berubah. Skor Dashboard dihitung ulang dari data terbaru, termasuk sisa masa berlaku STR/SIP yang berkurang setiap hari, jadi laporan yang dibuat di hari lain bisa berbeda dengan Dashboard. Tabel "Perbandingan dengan Dashboard" menunjukkan selisihnya.`
}

function comparisonNote(c: Cmp | null): string {
  if (!c) return 'Skor terkini tidak tersedia, perbandingan dengan Dashboard tidak bisa ditampilkan.'
  if (c.changed === 0) return `Semua skor di laporan ini sama dengan Dashboard saat ini (dihitung ${fmtDateTime(c.computedAt)}).`
  return `${c.changed} skor di laporan ini berbeda dengan Dashboard saat ini (dihitung ${fmtDateTime(c.computedAt)}). Angka laporan tetap sesuai snapshot; generate ulang laporan untuk mendapatkan skor terbaru.`
}

// ---------- Cetak / Simpan PDF ----------

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

function blockHtml(b: Block): string {
  if (b.kind === 'text') return `<p class="txt">${esc(b.text)}</p>`
  if (b.kind === 'fields') {
    return `<table class="kv">${b.fields.map((f) => `<tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join('')}</table>`
  }
  return `${b.title ? `<div class="sub">${esc(b.title)}</div>` : ''}<table class="grid"><thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function comparisonHtml(c: Cmp | null): string {
  const note = `<p class="txt">${esc(comparisonNote(c))}</p>`
  if (!c) return `<section><h2>Perbandingan dengan Dashboard</h2>${note}</section>`
  return `<section><h2>Perbandingan dengan Dashboard</h2>${note}<table class="grid"><thead><tr><th>Skor</th><th>Di laporan (snapshot)</th><th>Dashboard saat ini</th><th>Selisih</th></tr></thead><tbody>${c.rows.map((x) => `<tr${x.changed ? ' class="chg"' : ''}><td>${esc(x.label)}</td><td>${esc(x.snap)}</td><td>${esc(x.now)}</td><td>${esc(x.diff)}</td></tr>`).join('')}</tbody></table></section>`
}

function printHtml(r: any, content: any, current: any): string {
  const secs = buildSections(content)
  const rs = content?.ringkasan?.namaRS ?? ''
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(`MedCredix ${r.title} ${r.version}`)}</title>
<style>
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10.5px; margin: 0; }
.brand { font-size: 11px; font-weight: 700; color: #0b5c6b; letter-spacing: .3px; }
h1 { font-size: 18px; margin: 4px 0 2px; }
.meta { color: #475569; font-size: 10px; margin-bottom: 10px; }
.box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; background: #f8fafc; }
.box b { display: block; margin-bottom: 3px; }
.mgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; margin-top: 6px; color: #475569; font-size: 9.5px; }
.note { border-left: 3px solid #0b5c6b; padding: 6px 8px; background: #ecfeff; margin-bottom: 12px; font-size: 9.5px; color: #334155; }
section { margin-bottom: 12px; page-break-inside: auto; }
h2 { font-size: 12px; margin: 0 0 4px; padding: 4px 6px; background: #e2e8f0; border-radius: 4px; }
.sub { font-weight: 700; margin: 6px 0 3px; }
table { width: 100%; border-collapse: collapse; font-size: inherit; }
tr { page-break-inside: avoid; }
.kv th { text-align: left; font-weight: 400; color: #475569; width: 42%; padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
.kv td { font-weight: 700; padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
.grid th { text-align: left; background: #f1f5f9; padding: 4px 5px; border: 1px solid #cbd5e1; font-size: 9.5px; }
.grid td { padding: 3px 5px; border: 1px solid #e2e8f0; vertical-align: top; }
.txt { margin: 2px 6px; }
.chg td { background: #fef3c7; font-weight: 700; }
.foot { margin-top: 14px; color: #64748b; font-size: 9px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style></head><body>
<div class="brand">MedCredix · Medical Credentialing Intelligence</div>
<h1>${esc(r.title)}</h1>
<div class="meta">${esc(rs)}${rs ? ' · ' : ''}Versi ${esc(r.version)} · Periode ${esc(r.period)}</div>
<div class="box"><b>Metodologi</b>${esc(r.methodology)}
<div class="mgrid"><span>Dibuat: ${esc(fmtDateTime(r.generatedAt))}</span><span>Oleh: ${esc(r.generatedBy)}</span><span>Ref. Audit: ${esc(r.auditRef)}</span><span>Versi: ${esc(r.version)}</span></div></div>
<div class="note">${esc(snapshotNote(r))}</div>
${comparisonHtml(compareScores(content, current))}
${secs.map((s) => `<section><h2>${esc(s.title)}</h2>${s.blocks.map(blockHtml).join('')}</section>`).join('')}
<div class="foot">Dicetak ${esc(fmtDateTime(new Date()))} oleh ${esc(store.user?.name ?? '')}. Dokumen ini dibuat dari snapshot laporan ${esc(r.auditRef)} dan tidak berubah walau data RS berubah.</div>
</body></html>`
}

// Cetak lewat iframe tersembunyi: hanya isi laporan yang tercetak, dan "Simpan sebagai PDF" tersedia di dialog print browser.
function sendToPrinter(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const cleanup = () => setTimeout(() => frame.remove(), 500)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  const win = frame.contentWindow!
  win.addEventListener('afterprint', cleanup)
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(() => frame.isConnected && frame.remove(), 60_000)
  }, 250)
}

async function printReport(r: any) {
  if (!canPrint.value) return
  printing.value = r.id
  try {
    const res = await api<any>(`/reports?id=${r.id}&print=1`)
    sendToPrinter(printHtml(r, res.content, res.current))
  } catch (e: any) {
    toast({ title: 'Gagal mencetak laporan', description: e?.message, variant: 'destructive' })
  } finally {
    printing.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="MedCredix Reports"
      sub="Setiap laporan memuat: tanggal generate, periode, sumber data, metodologi, versi, pembuat, dan referensi audit." demo
    />
    <div v-if="!canCreate" class="flex items-start gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-[11px] text-muted-foreground">
      <Info class="mt-px h-3.5 w-3.5 shrink-0" />
      <span>Peran Anda tidak memiliki izin CREATE, jadi tombol Generate dinonaktifkan. Anda tetap bisa melihat laporan yang sudah ada.</span>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="t in data?.types ?? []" :key="t.type" class="rounded-xl border bg-card p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-xs font-bold">{{ t.title }}</div>
            <div class="mt-0.5 text-[10px] leading-snug text-muted-foreground">{{ t.desc }}</div>
          </div>
          <FileBarChart class="h-4 w-4 shrink-0 text-brand-2" />
        </div>
        <Button
          size="sm" class="mt-3 w-full gap-1.5 bg-brand text-xs hover:bg-brand-hover"
          :disabled="!canCreate || generating === t.type"
          :title="canCreate ? undefined : 'Butuh izin CREATE'"
          @click="generate(t.type)"
        >
          <Loader2 v-if="generating === t.type" class="h-3.5 w-3.5 animate-spin" /><PlusCircle v-else class="h-3.5 w-3.5" /> Generate
        </Button>
      </div>
    </div>

    <SectionCard title="Riwayat Laporan" :sub="`${reports.length} snapshot tersimpan`">
      <EmptyState
        v-if="reports.length === 0" title="Belum ada laporan"
        :desc="canCreate ? 'Generate laporan pertama Anda — snapshot tersimpan permanen dengan referensi audit.' : 'Belum ada laporan yang dibuat untuk rumah sakit ini.'"
      >
        <template #icon><FileText class="h-5 w-5" /></template>
      </EmptyState>
      <div v-else class="space-y-2">
        <div v-if="!canExport || !canPrint" class="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <Info class="mt-px h-3.5 w-3.5 shrink-0" />
          <span v-if="!canPrint">Peran Anda tidak memiliki izin EXPORT, jadi tombol CSV dan Cetak dinonaktifkan.</span>
          <span v-else>Peran Anda tidak memiliki izin EXPORT, jadi tombol CSV dinonaktifkan.</span>
        </div>
        <div v-for="r in reports" :key="r.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5">
          <div class="min-w-0">
            <div class="text-xs font-semibold">
              {{ r.title }} <Badge variant="outline" class="ml-1 text-[9px]">{{ r.version }}</Badge>
              <Badge
                v-if="staleIds.has(r.id)" variant="outline" class="ml-1 border-warning/40 bg-warning-light text-[9px] text-warning"
                title="Skor snapshot laporan ini sudah berbeda dengan Dashboard saat ini"
              >Beda dengan Dashboard</Badge>
            </div>
            <div class="mt-0.5 text-[10px] text-muted-foreground">
              {{ fmtDateTime(r.generatedAt) }} · oleh {{ r.generatedBy }} · Periode {{ r.period }} · Audit {{ r.auditRef }}
            </div>
          </div>
          <div class="flex gap-1.5">
            <Button size="sm" variant="outline" class="h-7 gap-1 text-[11px]" @click="openReport(r)"><Search class="h-3 w-3" /> Lihat</Button>
            <Button
              size="sm" variant="outline" class="h-7 gap-1 text-[11px]"
              :disabled="!canExport" :title="canExport ? undefined : 'Butuh izin EXPORT'"
              @click="exportCsv(r)"
            >
              <Download class="h-3 w-3" /> CSV
            </Button>
            <Button
              size="sm" variant="outline" class="h-7 gap-1 text-[11px]"
              :disabled="!canPrint || printing === r.id" :title="canPrint ? undefined : 'Butuh izin EXPORT'"
              @click="printReport(r)"
            >
              <Loader2 v-if="printing === r.id" class="h-3 w-3 animate-spin" /><Printer v-else class="h-3 w-3" /> Cetak
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>

    <!-- Detail laporan -->
    <Dialog size="lg" :open="!!selected" @update:open="(o) => !o && (selected = null)">
      <template v-if="selected">
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {{ selected.version }} · Periode {{ selected.period }} <DemoBadge />
        </div>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-left text-lg font-bold">{{ selected.title }}</h2>
          <Button
            v-if="canPrint" size="sm" variant="outline" class="h-7 gap-1 text-[11px]"
            :disabled="printing === selected.id" @click="printReport(selected)"
          >
            <Loader2 v-if="printing === selected.id" class="h-3 w-3 animate-spin" /><Printer v-else class="h-3 w-3" /> Cetak / Simpan PDF
          </Button>
        </div>
        <div class="mt-4 space-y-4 text-sm">
          <div class="rounded-xl border bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
            <div class="mb-1 font-semibold text-foreground">Metodologi</div>
            {{ selected.methodology }}
            <div class="mt-2 grid grid-cols-2 gap-1 text-[10px]">
              <span>Dibuat: {{ fmtDateTime(selected.generatedAt) }}</span>
              <span>Oleh: {{ selected.generatedBy }}</span>
              <span>Ref. Audit: {{ selected.auditRef }}</span>
              <span>Versi: {{ selected.version }}</span>
            </div>
          </div>
          <div class="flex items-start gap-2 rounded-lg border-l-2 border-brand-2 bg-brand-light/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info class="mt-px h-3.5 w-3.5 shrink-0 text-brand-2" />
            <span>{{ snapshotNote(selected) }}</span>
          </div>
          <!-- Perbandingan snapshot vs skor terkini (isi yang sama juga dicetak) -->
          <div class="overflow-hidden rounded-xl border">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-3.5 py-2">
              <span class="font-display text-xs font-semibold">Perbandingan dengan Dashboard</span>
              <Button
                v-if="canCreate && comparison && comparison.changed > 0" size="sm" variant="outline" class="h-7 gap-1 text-[11px]"
                :disabled="generating === selected.type" @click="regenerate(selected)"
              >
                <Loader2 v-if="generating === selected.type" class="h-3 w-3 animate-spin" /><PlusCircle v-else class="h-3 w-3" /> Generate ulang (skor terbaru)
              </Button>
            </div>
            <div :class="['px-3.5 py-2.5 text-[11px]', comparison && comparison.changed > 0 ? 'bg-warning-light/60 text-foreground' : 'text-muted-foreground']">
              {{ comparisonNote(comparison) }}
            </div>
            <div v-if="comparison" class="overflow-x-auto px-3.5 pb-2.5">
              <table class="w-full text-[11px]">
                <thead class="text-left text-[10px] text-muted-foreground">
                  <tr>
                    <th class="border-b px-2 py-1.5 font-medium">Skor</th>
                    <th class="border-b px-2 py-1.5 font-medium">Di laporan (snapshot)</th>
                    <th class="border-b px-2 py-1.5 font-medium">Dashboard saat ini</th>
                    <th class="border-b px-2 py-1.5 font-medium">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparison.rows" :key="row.label" :class="['border-b last:border-b-0', row.changed ? 'bg-warning-light/60 font-semibold' : '']">
                    <td class="px-2 py-1.5">{{ row.label }}</td>
                    <td class="px-2 py-1.5">{{ row.snap }}</td>
                    <td class="px-2 py-1.5">{{ row.now }}</td>
                    <td class="px-2 py-1.5">{{ row.diff }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-for="s in sections" :key="s.key" class="overflow-hidden rounded-xl border">
            <div class="border-b bg-muted/50 px-3.5 py-2 font-display text-xs font-semibold">{{ s.title }}</div>
            <template v-for="(b, bi) in s.blocks" :key="bi">
              <div v-if="b.kind === 'text'" class="px-3.5 py-3 text-xs">{{ b.text }}</div>
              <div v-else-if="b.kind === 'fields'" class="grid gap-1.5 px-3.5 py-3 text-[11px] sm:grid-cols-2">
                <div v-for="f in b.fields" :key="f.label">
                  <span class="text-muted-foreground">{{ f.label }}:</span> <strong>{{ f.value }}</strong>
                </div>
              </div>
              <div v-else class="border-t first:border-t-0">
                <div v-if="b.title" class="px-3.5 pt-2.5 text-[11px] font-semibold">{{ b.title }}</div>
                <div class="overflow-x-auto px-3.5 py-2.5">
                  <table class="w-full text-[11px]">
                    <thead class="text-left text-[10px] text-muted-foreground">
                      <tr><th v-for="c in b.columns" :key="c" class="whitespace-nowrap border-b px-2 py-1.5 font-medium">{{ c }}</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in b.rows" :key="ri" class="border-b last:border-b-0 align-top">
                        <td v-for="(cell, ci) in row" :key="ci" class="px-2 py-1.5">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>
