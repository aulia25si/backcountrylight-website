export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
}

export const PAYMENT_CONFIG = {
  bankAccounts: [
    {
      bankName: process.env.PAYMENT_BANK_NAME || "Bank Central Asia (BCA)",
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || "(014) 730-0808-098",
      accountHolder: process.env.PAYMENT_ACCOUNT_HOLDER || "PT. Rajawali Khatulistiwa Indonesia",
      branch: process.env.PAYMENT_BANK_BRANCH || "KCP Fatmawati",
    },
  ] as BankAccount[],
  instructions: [
    "Transfer tepat sesuai total nominal pembayaran.",
    "Cantumkan Order ID pada kolom berita/keterangan transfer.",
    "Setelah transfer berhasil, pesanan Anda akan diverifikasi secara manual oleh staf Backcountry Light.",
    "Verifikasi pembayaran diproses maksimal dalam 1x24 jam kerja.",
  ],
  flatShippingFee: 25000, // Rp 25.000 flat shipping fee used across BCL
};
