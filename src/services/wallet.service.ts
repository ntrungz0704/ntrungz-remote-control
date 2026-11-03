// ============================================================================
// FAST-SHIP-HUB — PREPAID WALLET SERVICE
// Financial Integrity, Hold Reservation, VietQR Topup & ACID Controls
// ============================================================================

import { generateVietQrTopup, type GeneratedVietQrResult } from '@/lib/vietqr';
import { randomUUID } from 'node:crypto';

export interface WalletTransactionRecord {
  id: string;
  transactionCode: string;
  walletId: string;
  orderId?: string;
  type:
    | 'TOPUP'
    | 'SHIPPING_PAYMENT'
    | 'HOLD_RESERVATION'
    | 'HOLD_RELEASE'
    | 'REFUND'
    | 'PLATFORM_FEE';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: 'WALLET' | 'VIETQR' | 'COD';
  referenceId?: string;
  note?: string;
  createdAt: Date;
}

export interface WalletRecord {
  id: string;
  userId: string;
  balance: number;
  holdBalance: number;
  currency: 'VND';
  transactions: WalletTransactionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export class WalletService {
  // Kho lưu trữ trong bộ nhớ phục vụ chạy độc lập, đồng bộ với Prisma Seed (2.000.000 VNĐ ban đầu)
  private wallets = new Map<string, WalletRecord>();

  constructor() {
    this.seedDefaultMerchantWallet();
  }

  private seedDefaultMerchantWallet(): void {
    const defaultUserId = 'usr_merchant_001';
    const walletId = 'wal_merchant_001';

    const initialTx: WalletTransactionRecord = {
      id: randomUUID(),
      transactionCode: 'TX-SEED-INIT-20261103',
      walletId,
      type: 'TOPUP',
      status: 'SUCCESS',
      amount: 2000000,
      balanceBefore: 0,
      balanceAfter: 2000000,
      paymentMethod: 'VIETQR',
      referenceId: 'NAPAS247-INIT-001',
      note: 'Số dư khởi tạo ban đầu cho Merchant thử nghiệm',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    this.wallets.set(defaultUserId, {
      id: walletId,
      userId: defaultUserId,
      balance: 2000000,
      holdBalance: 0,
      currency: 'VND',
      transactions: [initialTx],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Lấy thông tin ví và kiểm tra số dư khả dụng
   */
  getWallet(userId: string): {
    balance: number;
    holdBalance: number;
    availableBalance: number;
    currency: 'VND';
    recentTransactions: WalletTransactionRecord[];
  } {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      // Khởi tạo ví mới nếu chưa có
      wallet = {
        id: randomUUID(),
        userId,
        balance: 0,
        holdBalance: 0,
        currency: 'VND',
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.wallets.set(userId, wallet);
    }

    const availableBalance = Math.max(0, wallet.balance - wallet.holdBalance);

    return {
      balance: wallet.balance,
      holdBalance: wallet.holdBalance,
      availableBalance,
      currency: wallet.currency,
      recentTransactions: wallet.transactions.slice(-20).reverse(),
    };
  }

  /**
   * Tạo yêu cầu nạp tiền ví qua mã VietQR động Napas 247
   */
  createTopupRequest(userId: string, amount: number): GeneratedVietQrResult {
    if (amount < 50000) {
      throw new Error('Số tiền nạp tối thiểu là 50.000 VNĐ');
    }
    if (amount > 20000000) {
      throw new Error('Số tiền nạp tối đa là 20.000.000 VNĐ cho mỗi giao dịch');
    }

    const qrResult = generateVietQrTopup(amount);

    let wallet = this.wallets.get(userId);
    if (!wallet) {
      wallet = {
        id: randomUUID(),
        userId,
        balance: 0,
        holdBalance: 0,
        currency: 'VND',
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.wallets.set(userId, wallet);
    }

    // Ghi nhận giao dịch nạp đang chờ xử lý
    const tx: WalletTransactionRecord = {
      id: randomUUID(),
      transactionCode: qrResult.transactionCode,
      walletId: wallet.id,
      type: 'TOPUP',
      status: 'PENDING',
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      paymentMethod: 'VIETQR',
      referenceId: qrResult.transactionCode,
      note: `Yêu cầu nạp tiền ví qua VietQR Napas 247 (${qrResult.bankInfo.transferContent})`,
      createdAt: new Date(),
    };

    wallet.transactions.push(tx);
    wallet.updatedAt = new Date();

    return qrResult;
  }

  /**
   * Tạm giữ số dư khi đặt đơn (Hold balance)
   */
  reserveHold(
    userId: string,
    amount: number,
    orderCode: string,
    carrierName: string
  ): { success: boolean; availableAfter: number } {
    const wallet = this.wallets.get(userId);
    if (!wallet) {
      throw new Error('Không tìm thấy tài khoản ví');
    }

    const available = wallet.balance - wallet.holdBalance;
    if (available < amount) {
      throw new Error(
        `Số dư khả dụng (${available.toLocaleString()}đ) không đủ để thanh toán cước (${amount.toLocaleString()}đ)`
      );
    }

    // Cập nhật số dư tạm giữ
    wallet.holdBalance += amount;
    const availableAfter = wallet.balance - wallet.holdBalance;

    const tx: WalletTransactionRecord = {
      id: randomUUID(),
      transactionCode: `TX-HOLD-${orderCode}`,
      walletId: wallet.id,
      orderId: orderCode,
      type: 'HOLD_RESERVATION',
      status: 'SUCCESS',
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: availableAfter,
      paymentMethod: 'WALLET',
      referenceId: orderCode,
      note: `Tạm giữ cước đơn hàng ${orderCode} (${carrierName})`,
      createdAt: new Date(),
    };

    wallet.transactions.push(tx);
    wallet.updatedAt = new Date();

    return { success: true, availableAfter };
  }

  /**
   * Giải phóng số dư tạm giữ khi đơn bị hủy hoặc điều xe thất bại (Refund hold)
   */
  releaseHold(
    userId: string,
    amount: number,
    orderCode: string,
    reason: string
  ): void {
    const wallet = this.wallets.get(userId);
    if (!wallet) return;

    wallet.holdBalance = Math.max(0, wallet.holdBalance - amount);
    const availableAfter = wallet.balance - wallet.holdBalance;

    const tx: WalletTransactionRecord = {
      id: randomUUID(),
      transactionCode: `TX-REL-${orderCode}`,
      walletId: wallet.id,
      orderId: orderCode,
      type: 'HOLD_RELEASE',
      status: 'SUCCESS',
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: availableAfter,
      paymentMethod: 'WALLET',
      referenceId: orderCode,
      note: `Hoàn trả số dư tạm giữ đơn ${orderCode}. Lý do: ${reason}`,
      createdAt: new Date(),
    };

    wallet.transactions.push(tx);
    wallet.updatedAt = new Date();
  }

  /**
   * Quyết toán trừ tiền vĩnh viễn khi đơn giao hoàn tất (Capture / Settle)
   */
  settlePayment(userId: string, amount: number, orderCode: string): void {
    const wallet = this.wallets.get(userId);
    if (!wallet) return;

    // Trừ đồng thời cả số dư tổng và số dư tạm giữ
    wallet.balance = Math.max(0, wallet.balance - amount);
    wallet.holdBalance = Math.max(0, wallet.holdBalance - amount);

    const tx: WalletTransactionRecord = {
      id: randomUUID(),
      transactionCode: `TX-SETTLE-${orderCode}`,
      walletId: wallet.id,
      orderId: orderCode,
      type: 'SHIPPING_PAYMENT',
      status: 'SUCCESS',
      amount,
      balanceBefore: wallet.balance + amount,
      balanceAfter: wallet.balance,
      paymentMethod: 'WALLET',
      referenceId: orderCode,
      note: `Quyết toán cước giao dịch thành công cho đơn ${orderCode}`,
      createdAt: new Date(),
    };

    wallet.transactions.push(tx);
    wallet.updatedAt = new Date();
  }
}

export const walletService = new WalletService();
