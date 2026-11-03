// ============================================================================
// FAST-SHIP-HUB — VIETQR NAPAS 247 GENERATOR
// Standard EMVCo QR Code & VietQR Quick Pay Builder
// ============================================================================

export interface VietQrBankInfo {
  bankCode: string; // Mã BIN ngân hàng (VD: 970422 - MBBank)
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
}

export interface GeneratedVietQrResult {
  transactionCode: string;
  amount: number;
  currency: 'VND';
  bankInfo: VietQrBankInfo;
  vietQrString: string;
  qrImageUrl: string;
  expiresAt: Date;
}

/** Cấu hình tài khoản nhận tiền thụ hưởng của sàn FAST-SHIP-HUB */
export const PLATFORM_RECEIVING_BANK: VietQrBankInfo = {
  bankCode: '970422', // MBBank
  bankName: 'Ngân hàng TMCP Quân Đội (MBBank)',
  accountNumber: '098811122299',
  accountName: 'CONG TY CONG NGHE FAST SHIP HUB',
  transferContent: '',
};

/**
 * Tạo dữ liệu VietQR và link ảnh QR thanh toán động cho nạp ví cước
 */
export function generateVietQrTopup(
  amount: number,
  transactionSuffix?: string
): GeneratedVietQrResult {
  const code = transactionSuffix || Math.floor(10000 + Math.random() * 90000).toString();
  const transactionCode = `TOPUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${code}`;
  const transferContent = `FSH TOPUP ${code}`;

  const bankInfo: VietQrBankInfo = {
    ...PLATFORM_RECEIVING_BANK,
    transferContent,
  };

  // URL ảnh VietQR chuẩn cộng đồng VietQR.io (hỗ trợ hiển thị trực quan trên Web & Mobile)
  const encodedContent = encodeURIComponent(transferContent);
  const encodedAccountName = encodeURIComponent(bankInfo.accountName);
  const qrImageUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedAccountName}`;

  // Chuỗi định dạng mô phỏng EMVCo VietQR Napas247 Quick Pay
  const vietQrString = `00020101021238540010A00000072701240006${bankInfo.bankCode}0112${bankInfo.accountNumber}0208QRIBFTTA5303704540${amount.toString().length}${amount}5802VN62${transferContent.length + 4}08${transferContent.length}${transferContent}6304C92A`;

  // Thời hạn thanh toán của mã QR: 30 phút
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  return {
    transactionCode,
    amount,
    currency: 'VND',
    bankInfo,
    vietQrString,
    qrImageUrl,
    expiresAt,
  };
}
