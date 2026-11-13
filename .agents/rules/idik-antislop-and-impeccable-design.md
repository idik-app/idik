# IDIK App - Anti-Slop, Impeccable Design & AI Writing Hygiene

Aturan wajib untuk setiap pembuatan, penyuntingan, atau refactoring komponen UI, frontend, dan copy/teks di seluruh `app/**` dan `components/**`.
Terintegrasi langsung dengan global skills: `antislop`, `impeccable`, `taste-skill`, `humanizer`, dan `avoid-ai-writing`.

---

## 1. UI & Visual Craft (Impeccable & Taste-Skill)
- **Kualitas Visual & Hierarki:** Setiap komponen harus memiliki titik fokus visual yang jelas, spasi konsisten (*spacing rhythm*), dan tipografi yang proporsional.
- **Bebas AI Template Defaults:**
  - DILARANG menggunakan gradien warna klise (seperti *blue-to-purple* atau *cyan-to-pink*) sebagai default dekorasi tanpa alasan fungsi/branding.
  - Batasi glassmorphism (`backdrop-blur`): maksimal 1 layer pada overlay/modal aktif, jangan menumpuk blur di dalam dialog bersarang.
  - Jangan buat semua elemen berbentuk kapsul (*full pill* `rounded-full`). Gunakan radius yang terukur (`rounded-md`, `rounded-lg`, `rounded-xl`) sesuai hierarki komponen.
- **Dark Mode & Aksesibilitas:** Wajib mematuhi standar dark mode IDIK (`dark:text-white` untuk teks utama, placeholder terang, rasio kontras WCAG AA).

---

## 2. Standar Copywriting & Bahasa (Humanizer & Stop-Slop)
- **Bahasa Alami & Lugas:** Gunakan bahasa Indonesia yang natural, profesional, dan mudah dipahami tenaga medis/staf klinik.
- **Kata & Frasa yang DILARANG (AI Tells):**
  - Hindari kata klise AI: *delve, foster, leverage, streamline, supercharge, seamless, robust, game changer, in today's world/era*.
  - Hindari pembuka berputar-putar (*throat-clearing*): *"Penting untuk dicatat bahwa..."*, *"Perlu diingat..."*, *"Di era modern ini..."*. Langsung ke intinya.
  - Hindari pola kontras klise: *"Bukan hanya X, tapi juga Y"*. Tulis langsung fakta atau instruksi positifnya.
- **Teks Notifikasi & Modal:** Pesan konfirmasi atau kesalahan harus menyebutkan secara spesifik apa yang terjadi dan tindakan apa yang harus diambil pengguna.

---

## 3. Kebersihan Komentar Kode (Anti-Slop Code)
- **Hapus Komentar Robotik:** Jangan menulis komentar yang hanya mengulang baris kode (misal: `// render button`, `// handle click`, `// update state`).
- **Simpan Komentar Berbobot:** Komentar hanya boleh ditulis jika menjelaskan alasan bisnis non-trivial, penanganan *edge cases*, atau batasan teknis arsitektur.
