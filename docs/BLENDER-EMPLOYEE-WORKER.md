# Blender Worker Karyawan ZORE AI

## Status dan cara menjalankan

Workflow tersedia di GitHub Actions dengan nama **ZORE AI Employee Blender Worker**:
https://github.com/harozero91-arch/Zore-ai/actions/workflows/employee-blender-worker.yml

1. Karyawan 3D menyiapkan skrip Python Blender sesuai brief tugas.
2. CEO/operator memeriksa skrip dan memastikan hasil disimpan di folder yang ditunjuk variabel lingkungan `ZORE_OUTPUT_DIR`.
3. Buka workflow di atas, tekan **Run workflow**, isi nama tugas, karyawan, dan kode Python Blender.
4. Tunggu job selesai.
5. Unduh ZIP pada bagian **Artifacts**. Isi folder output dapat berupa .blend, .glb, .png, .mp4, atau berkas lain yang memang dihasilkan skrip.

## Batasan penting

- Runner berjalan sementara di GitHub-hosted Ubuntu, bukan Blender yang berjalan terus-menerus.
- Artefak disimpan 7 hari.
- Batas eksekusi satu job 20 menit.
- Workflow hanya membaca repository; tidak diberi secret Supabase/GitHub dan tidak mempunyai izin menulis ke repository.
- Skrip yang dimasukkan akan dieksekusi sebagai kode Python di runner. Jalankan hanya skrip yang sudah diperiksa dan dipercaya.
- Workflow ini adalah jalur eksekusi cloud awal. Tombol penugasan di website ZORE AI belum terhubung otomatis untuk memanggil workflow; hasil perlu diunduh dan dimasukkan kembali ke proyek/tugas.
- Workflow tidak mengubah prompt teks menjadi model 3D dengan sendirinya. Karyawan AI harus menghasilkan skrip Blender Python terlebih dahulu, lalu skrip dijalankan oleh worker.
- Paket Blender tersedia gratis pada runner; penggunaan runner mengikuti kuota dan kebijakan GitHub Actions akun/repository.
