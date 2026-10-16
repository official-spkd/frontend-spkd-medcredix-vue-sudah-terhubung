// Satu pop-up pada satu waktu: setiap Dialog/Sheet yang baru terbuka menutup pop-up lain yang masih terbuka.
// Contoh: di detail klaim klik "Lihat Bukti" atau "Buat Tindakan", detail klaim otomatis tertutup
// sehingga panel yang baru tidak tertutup pop-up lama (tidak perlu klik X dulu).
let seq = 0
const closers = new Map<number, () => void>()

// Dipanggil saat pop-up terbuka. Mengembalikan fungsi untuk melepas pendaftaran saat pop-up tertutup.
export function openOverlay(close: () => void): () => void {
  for (const c of [...closers.values()]) c()
  const id = ++seq
  closers.set(id, close)
  return () => { closers.delete(id) }
}
