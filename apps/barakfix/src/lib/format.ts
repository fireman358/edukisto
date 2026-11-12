export function formatEUR(n: number): string {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "short" }).format(new Date(iso));
}
