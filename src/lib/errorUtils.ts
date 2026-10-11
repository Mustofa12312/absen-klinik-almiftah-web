/**
 * Utilitas penerjemah pesan error dan status ke Bahasa Indonesia.
 * Menjamin semua keterangan error maupun non-error tampil ramah dan profesional dalam Bahasa Indonesia.
 */

export function formatErrorMessage(error: any): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';

  // Jika error adalah string biasa
  const rawMsg = typeof error === 'string' ? error : (error.message || error.code || String(error));

  // Firebase Auth Error Codes & Messages
  if (rawMsg.includes('auth/invalid-credential') || rawMsg.includes('invalid-credential')) {
    return 'Email/Nomor HP atau kata sandi salah. Silakan periksa kembali.';
  }
  if (rawMsg.includes('auth/user-not-found') || rawMsg.includes('user-not-found')) {
    return 'Akun tidak ditemukan. Pastikan email atau nomor HP sudah terdaftar.';
  }
  if (rawMsg.includes('auth/wrong-password') || rawMsg.includes('wrong-password')) {
    return 'Kata sandi salah. Silakan coba lagi.';
  }
  if (rawMsg.includes('auth/invalid-email') || rawMsg.includes('invalid-email')) {
    return 'Format alamat email tidak valid.';
  }
  if (rawMsg.includes('auth/user-disabled') || rawMsg.includes('user-disabled')) {
    return 'Akun pegawai ini telah dinonaktifkan. Hubungi admin klinik.';
  }
  if (rawMsg.includes('auth/too-many-requests') || rawMsg.includes('too-many-requests')) {
    return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.';
  }
  if (rawMsg.includes('auth/email-already-in-use') || rawMsg.includes('email-already-in-use')) {
    return 'Email atau nomor HP ini sudah digunakan oleh akun lain.';
  }
  if (rawMsg.includes('auth/weak-password') || rawMsg.includes('weak-password')) {
    return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
  }
  if (rawMsg.includes('auth/network-request-failed') || rawMsg.includes('network-request-failed')) {
    return 'Gagal terhubung ke jaringan. Periksa koneksi internet Anda.';
  }

  // Firestore / Permission Error Codes & Messages
  if (
    rawMsg.includes('permission-denied') ||
    rawMsg.includes('Missing or insufficient permissions') ||
    rawMsg.includes('insufficient permissions')
  ) {
    return 'Akses ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini. Pastikan Anda telah login dengan akun yang sesuai.';
  }
  if (rawMsg.includes('not-found')) {
    return 'Data yang diminta tidak ditemukan di database.';
  }
  if (rawMsg.includes('already-exists')) {
    return 'Data sudah terdaftar di sistem.';
  }
  if (rawMsg.includes('resource-exhausted') || rawMsg.includes('quota')) {
    return 'Batas kuota sistem terlampaui. Silakan coba beberapa saat lagi.';
  }
  if (rawMsg.includes('unavailable') || rawMsg.includes('Failed to fetch')) {
    return 'Layanan server sedang tidak tersedia atau koneksi terputus. Periksa jaringan internet Anda.';
  }
  if (rawMsg.includes('deadline-exceeded')) {
    return 'Waktu permintaan habis (timeout). Silakan ulangi beberapa saat lagi.';
  }
  if (rawMsg.includes('unauthenticated')) {
    return 'Sesi login Anda telah berakhir. Silakan login kembali.';
  }

  // Geolocation Errors
  if (rawMsg.includes('User denied Geolocation') || rawMsg.includes('denied Geolocation') || rawMsg.includes('permission denied') && rawMsg.includes('location')) {
    return 'Izin lokasi (GPS) ditolak oleh browser/perangkat Anda. Mohon izinkan akses lokasi untuk absensi.';
  }
  if (rawMsg.includes('position unavailable') || rawMsg.includes('Position unavailable')) {
    return 'Sinyal lokasi GPS tidak tersedia atau tidak akurat. Coba lagi di tempat terbuka.';
  }
  if (rawMsg.includes('timeout') && rawMsg.includes('location')) {
    return 'Waktu pencarian lokasi GPS habis. Silakan coba lagi.';
  }

  // Jika pesan sudah dalam bahasa indonesia, bersihkan prefix bawaan jika ada
  let cleaned = rawMsg.replace(/^FirebaseError:\s*/i, '').replace(/^Error:\s*/i, '');
  return cleaned || 'Terjadi kesalahan sistem. Silakan coba lagi.';
}
