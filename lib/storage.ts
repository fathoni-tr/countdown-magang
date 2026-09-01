// ponytail: localStorage bisa diblokir (T-17) -> gagal diam-diam, app tetap jalan.
export const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { /* diblokir */ }
  },
};
