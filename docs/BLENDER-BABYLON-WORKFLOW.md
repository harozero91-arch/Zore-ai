# Aset Blender untuk ZORE AI

1. Buat atau edit kantor di Blender.
2. Terapkan transformasi (Ctrl+A → Rotation & Scale).
3. Pilih File → Export → glTF 2.0.
4. Pilih glTF Binary (.glb), aktifkan Apply Modifiers, dan ekspor material/tekstur.
5. Buka halaman Babylon preview lalu tekan Muat model Blender dan pilih file .glb.
6. Untuk aset default website setelah migrasi mesin utama disetujui, simpan model bernama zore-office.glb di public/models/ dan hubungkan pemuatan otomatis pada halaman utama.

Pedoman: pisahkan objek statis kantor, furnitur bergerak, dan karakter ber-rig. Gunakan material PBR dan tekstur 2K untuk Android kelas menengah. Halaman Babylon masih preview terpisah; Three.js pada halaman utama serta sistem karyawan belum diganti oleh perubahan ini.
