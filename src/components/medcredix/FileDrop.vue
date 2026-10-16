<script setup lang="ts">
// FileDrop — area unggah berkas: klik untuk memilih atau tarik & lepas.
// v-model = File terpilih (null bila belum ada). Validasi jenis & ukuran di sini,
// backend tetap memeriksa ulang dari isi berkas.
import { FileText, Upload, X } from 'lucide-vue-next'
import { ref } from 'vue'

const model = defineModel<File | null>({ default: null })
const props = withDefaults(defineProps<{ maxMb?: number; current?: string | null; disabled?: boolean }>(), { maxMb: 5 })

// Hanya PDF dan Word (DOC/DOCX), sama dengan internal/storage di backend. Gambar (JPG/PNG) ditolak.
const ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const EXT = /\.(pdf|docx?)$/i
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const error = ref('')

function choose(f: File | undefined | null) {
  error.value = ''
  if (!f) return
  // Ekstensi wajib cocok; tipe dari browser bisa kosong untuk .doc, jadi ekstensi yang jadi patokan.
  const okType = EXT.test(f.name) && (!f.type || ACCEPT.includes(f.type))
  if (!okType) {
    error.value = 'Jenis berkas harus PDF atau Word (DOC/DOCX). Gambar seperti JPG/PNG tidak diterima.'
    return
  }
  if (f.size > props.maxMb * 1024 * 1024) {
    error.value = `Ukuran berkas melebihi ${props.maxMb} MB.`
    return
  }
  model.value = f
}
function onDrop(e: DragEvent) {
  dragging.value = false
  if (!props.disabled) choose(e.dataTransfer?.files?.[0])
}
function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  choose(el.files?.[0])
  el.value = '' // supaya berkas yang sama bisa dipilih lagi
}
function clear() {
  model.value = null
  error.value = ''
}
function sizeLabel(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}
</script>

<template>
  <div>
    <input ref="input" type="file" class="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :disabled="disabled" @change="onPick" />
    <div
      v-if="model"
      class="flex items-center gap-2.5 rounded-lg border border-brand-2/40 bg-brand-2-light/40 p-3 text-xs"
    >
      <FileText class="h-4 w-4 shrink-0 text-brand-2" />
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">{{ model.name }}</div>
        <div class="text-[10px] text-muted-foreground">{{ sizeLabel(model.size) }}</div>
      </div>
      <button type="button" class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Hapus berkas" @click="clear">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
    <button
      v-else
      type="button"
      :disabled="disabled"
      :class="[
        'w-full rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground transition-colors',
        'hover:border-brand-2 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        dragging ? 'border-brand-2 bg-brand-2-light/40' : '',
      ]"
      @click="input?.click()"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <Upload class="mx-auto mb-1.5 h-4 w-4" />
      <span class="font-semibold text-brand-2">Klik untuk memilih</span> atau tarik berkas PDF/DOC/DOCX ke sini (maks {{ maxMb }} MB).
      <span v-if="current" class="mt-1 block text-[10px]">Berkas saat ini: {{ current }} (biarkan kosong untuk tetap memakainya)</span>
    </button>
    <p v-if="error" class="mt-1.5 text-[11px] font-medium text-danger">{{ error }}</p>
  </div>
</template>
