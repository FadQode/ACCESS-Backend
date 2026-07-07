const categoryLabels: Record<string, string> = {
  account: "Login / OTP / Akun",
  app_error: "App Crash / Lemot",
  app_update: "App Update / Complaint Update",
  facility: "Fasilitas",
  lost_item: "Barang Tertinggal",
  no_response_cs: "CS Tidak Merespons",
  other: "Lainnya",
  payment: "Payment Error / Bayar",
  queue_problem: "Queue / Promo War",
  refund_cancel: "Refund / Cancel",
  ticket_booking: "Ticket / Booking Tiket",
};

export const getCategoryLabel = (category: string): string =>
  categoryLabels[category] ?? category;
