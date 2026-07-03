const categoryLabels: Record<string, string> = {
  account: "Akun",
  app_error: "Gangguan Aplikasi",
  cancellation: "Pembatalan",
  delay: "Keterlambatan",
  facility: "Fasilitas",
  lost_item: "Barang Tertinggal",
  other: "Lainnya",
  payment: "Pembayaran",
  refund: "Pengembalian Dana",
};

export const getCategoryLabel = (category: string): string =>
  categoryLabels[category] ?? category;
