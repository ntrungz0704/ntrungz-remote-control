// ============================================================================
// FAST-SHIP-HUB — CARRIER ADAPTER REGISTRY
// Central Factory & Pluggable Registry for All Carrier Adapters
// ============================================================================

import type { CarrierCode } from '@/types/carrier.types';
import type { ICarrierAdapter } from './carrier-adapter.interface';
import { GrabExpressAdapter } from './grab.adapter';
import { ShopeeFoodAdapter } from './shopeefood.adapter';
import { XanhSMAdapter } from './xanhsm.adapter';
import { AhamoveAdapter } from './ahamove.adapter';
import { BeDeliveryAdapter } from './be.adapter';
import { MockSandboxCarrierAdapter } from './mock-sandbox.adapter';

export class CarrierAdapterRegistry {
  private adapters = new Map<CarrierCode, ICarrierAdapter>();

  constructor() {
    this.register(new MockSandboxCarrierAdapter());
    this.register(new XanhSMAdapter());
    this.register(new ShopeeFoodAdapter());
    this.register(new GrabExpressAdapter());
    this.register(new AhamoveAdapter());
    this.register(new BeDeliveryAdapter());
  }

  register(adapter: ICarrierAdapter): void {
    this.adapters.set(adapter.carrierCode, adapter);
  }

  getAdapter(carrierCode: CarrierCode): ICarrierAdapter {
    const adapter = this.adapters.get(carrierCode);
    if (!adapter) {
      throw new Error(`CARRIER_NOT_SUPPORTED: Hãng ${carrierCode} chưa được kích hoạt trong hệ thống`);
    }
    return adapter;
  }

  getAllAdapters(): ICarrierAdapter[] {
    return Array.from(this.adapters.values());
  }

  hasAdapter(carrierCode: CarrierCode): boolean {
    return this.adapters.has(carrierCode);
  }
}

export const carrierAdapterRegistry = new CarrierAdapterRegistry();
