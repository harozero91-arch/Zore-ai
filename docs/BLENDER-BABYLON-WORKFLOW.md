# Aset Blender untuk ZORE AI

1. Buat atau edit kantor di Blender.
2. Terapkan transformasi (Ctrl+A → Rotation & Scale).
3. Pilih File → Export → glTF 2.0.
4. Pilih glTF Binary (.glb), aktifkan Apply Modifiers, dan ekspor material/tekstur.
5. Buka halaman Babylon preview lalu tekan Muat model Blender dan pilih file .glb.
6. Untuk aset default website setelah migrasi mesin utama disetujui, simpan model bernama zore-office.glb di public/models/ dan hubungkan pemuatan otomatis pada halaman utama.

Pedoman: pisahkan objek statis kantor, furnitur bergerak, dan karakter ber-rig. Gunakan material PBR dan tekstur 2K untuk Android kelas menengah. Halaman Babylon masih preview terpisah; Three.js pada halaman utama serta sistem karyawan belum diganti oleh perubahan ini.


## Menjalankan Blender tanpa komputer pribadi

Notebook cloud tersedia di [Google Colab — ZORE AI Blender Worker](https://colab.research.google.com/github/harozero91-arch/Zore-ai/blob/main/cloud/blender_colab.ipynb).

1. Buka tautan Colab dan login ke akun Google.
2. Pilih **Runtime → Run all** (atau jalankan sel satu per satu dari atas).
3. Izinkan Colab mengakses Google Drive agar file hasil tersimpan di folder `MyDrive/ZORE-AI/Blender`.
4. Tunggu Blender terpasang dan contoh scene selesai dibuat.
5. Periksa dua file: `zore-cloud-test.blend` dan `zore-cloud-test.glb`.

**Batasan penting:** Colab gratis menyediakan sesi komputasi sementara, bukan server 24 jam. Notebook ini membuktikan Blender dapat dijalankan di cloud dan mengekspor aset; notebook ini belum mengambil antrean tugas karyawan, belum mengirim status otomatis ke ZORE AI, dan belum mengunggah hasil langsung ke Supabase. Jangan menaruh service-role key atau kredensial rahasia di notebook. Integrasi antrean otomatis adalah tahap lanjutan setelah jalur ekspor dasar diuji.


## Model kantor eksekutif 3D ZORE AI

Notebook cloud kini membuat model kantor eksekutif yang lebih lengkap, bukan kubus uji:
- lantai marmer, dinding panel walnut dengan lis brass, jendela dan cornice;
- meja direktur, monitor, kursi eksekutif, meja rapat dan kursi yang menghadap meja;
- workstation, partisi, tanaman dekoratif, serta figur karyawan 3D sederhana.

Setelah menjalankan notebook sampai tulisan **SELESAI**, ambil file:
- `zore-ai-executive-office.blend`
- `zore-ai-executive-office.glb`

Buka [halaman preview Babylon ZORE AI](https://zore-ai-web.vercel.app/babylon-preview.html), tekan **Muat model Blender**, lalu pilih file GLB tersebut dari perangkat. Tombol **Kembalikan kantor** akan memulihkan tampilan prosedural bawaan.

Catatan: notebook menghasilkan aset 3D statis untuk tahap desain dan pemeriksaan. Figur karyawan belum memiliki rig/siklus animasi, dan aset belum dipasang otomatis ke kantor utama Three.js. Perlu validasi tampilan GLB di Android sebelum migrasi atau integrasi produksi.
