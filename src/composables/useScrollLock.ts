// Kunci scroll halaman di belakang pop-up. Pakai hitungan supaya
// beberapa pop-up yang terbuka bersamaan tidak saling membuka kunci.
let count = 0
let saved = ''

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (count++ === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}

export function unlockScroll() {
  if (typeof document === 'undefined' || count === 0) return
  if (--count === 0) document.body.style.overflow = saved
}
