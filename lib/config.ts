// Satu-satunya sumber kebenaran untuk seluruh angkatan. Ubah nilai = redeploy.
export const CONFIG = {
  END_TARGET: { y: 2027, m: 0, d: 29, hour: 16, minute: 0 },
  // ponytail: null = progress bar tidak dirender. Isi { y, m, d } untuk mengaktifkan (PRD §13).
  INTERNSHIP_START: null as { y: number; m: number; d: number } | null,
  WORK_START: { hour: 7, minute: 30 },
  WORK_END: { hour: 16, minute: 0 },
  // Istirahat siang. ponytail: hanya memengaruhi pilihan kalimat, bukan hitungan
  // jam kerja. Kurangi dari workRemainingMs kalau nanti mau dihitung bersih.
  BREAK_START: { hour: 12, minute: 0 },
  BREAK_END: { hour: 13, minute: 0 },
  WORK_DAYS: [1, 2, 3, 4, 5],
  CONFETTI_GRACE_MINUTES: 60,
  SHOW_SECONDARY_BEFORE_WORK_START: true,
  TREAT_CUTI_BERSAMA_AS_HOLIDAY: true,
};

export const END_TARGET = new Date(
  CONFIG.END_TARGET.y, CONFIG.END_TARGET.m, CONFIG.END_TARGET.d,
  CONFIG.END_TARGET.hour, CONFIG.END_TARGET.minute, 0, 0,
);
