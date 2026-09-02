// ponytail: cn seminimal mungkin. Tanpa clsx/tailwind-merge. Belum ada kelas
// Tailwind yang saling bertabrakan di proyek ini. Pasang tailwind-merge kalau nanti ada.
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
