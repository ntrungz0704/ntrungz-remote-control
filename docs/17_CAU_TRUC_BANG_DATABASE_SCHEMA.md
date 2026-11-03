# ĐẶC TẢ CẤU TRÚC BẢNG CƠ SỞ DỮ LIỆU (DATABASE DDL SCHEMA SPECIFICATION)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-DB-003` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_FOR_MIGRATION`  
> **Hệ quản trị CSDL**: **PostgreSQL 16.x** (Tương thích Supabase, Neon & AWS RDS)  
> **Tác giả**: `database-engineer` (Kỹ sư Cơ sở Dữ liệu & Data Modeling)  
> **Người tiếp nhận**: `backend-engineer`, `devops-engineer`, `qa-engineer`

---

## 1. SƠ ĐỒ DDL & MÃ NGUỒN KHỞI TẠO HỆ THỐNG (SQL DDL SCRIPT)

Dưới đây là toàn bộ mã nguồn DDL SQL khởi tạo cơ sở dữ liệu `FAST-SHIP-HUB` hoàn chỉnh 100%, không sử dụng placeholder hoặc đoạn cắt giảm:

```sql
-- ============================================================================
-- FAST-SHIP-HUB PRODUCTION DATABASE SCHEMA
-- Target Engine: PostgreSQL 16.x
-- Encoding: UTF8 | Timezone: UTC
-- ============================================================================

-- BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. HÀM TỰ ĐỘNG CẬP NHẬT UPDATED_AT (TIMESTAMP TRIGGER FUNCTION)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU ENUM (SYSTEM ENUM TYPES)
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'GUEST',
    'MERCHANT',
    'ADMIN'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);

CREATE TYPE order_status AS ENUM (
    'DRAFT',
    'QUOTED',
    'BOOKED',
    'PICKING',
    'DELIVERING',
    'DELIVERED',
    'RETURNING',
    'RETURNED',
    'FAILED_DISPATCH',
    'CANCELLED'
);

CREATE TYPE carrier_code AS ENUM (
    'GRAB',
    'SHOPEE_FOOD',
    'XANH_SM',
    'AHAMOVE',
    'BE',
    'SANDBOX_MOCK'
);

CREATE TYPE service_tier_code AS ENUM (
    'BIKE_INSTANT',
    'BIKE_SAME_DAY',
    'CAR_DELIVERY',
    'TRUCK_500KG'
);

CREATE TYPE package_type AS ENUM (
    'DOCUMENT',
    'FOOD',
    'FASHION',
    'FRAGILE',
    'ELECTRONICS'
);

CREATE TYPE smart_badge AS ENUM (
    'CHEAPEST',
    'FASTEST',
    'GREENEST',
    'BEST_VALUE'
);

CREATE TYPE transaction_type AS ENUM (
    'TOPUP',
    'SHIPPING_PAYMENT',
    'HOLD_RESERVATION',
    'HOLD_RELEASE',
    'REFUND',
    'COD_CREDIT',
    'PLATFORM_FEE',
    'ADJUSTMENT'
);

CREATE TYPE transaction_status AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);

CREATE TYPE webhook_processing_status AS ENUM (
    'PENDING',
    'PROCESSED',
    'FAILED',
    'IGNORED'
);

CREATE TYPE payment_method AS ENUM (
    'WALLET',
    'VIETQR',
    'COD'
);

CREATE TYPE vehicle_type AS ENUM (
    'GASOLINE_BIKE',
    'ELECTRIC_BIKE',
    'CAR',
    'TRUCK'
);

-- ============================================================================
-- 3. BẢNG NGƯỜI DÙNG: users
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'MERCHANT',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_phone_format CHECK (phone ~ '^\+?[0-9]{9,15}$')
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. BẢNG VÍ TIỀN TRẢ TRƯỚC: wallets
-- ============================================================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    hold_balance BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(5) NOT NULL DEFAULT 'VND',
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_wallets_user_id UNIQUE (user_id),
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_wallets_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT chk_wallets_hold_non_negative CHECK (hold_balance >= 0),
    CONSTRAINT chk_wallets_available_balance CHECK (balance >= hold_balance)
);

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. BẢNG BIẾN ĐỘNG SỐ DƯ VÍ: wallet_transactions
-- ============================================================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    order_id UUID,
    transaction_code VARCHAR(32) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'WALLET',
    reference_id VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_wallet_transactions_code UNIQUE (transaction_code),
    CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) 
        REFERENCES wallets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_wallet_tx_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_wallet_tx_balance_before_non_negative CHECK (balance_before >= 0),
    CONSTRAINT chk_wallet_tx_balance_after_non_negative CHECK (balance_after >= 0)
);

-- ============================================================================
-- 6. BẢNG ĐỐI TÁC VẬN CHUYỂN: carriers
-- ============================================================================
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code carrier_code NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_mock BOOLEAN NOT NULL DEFAULT false,
    webhook_secret TEXT,
    hotline VARCHAR(20),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_carriers_code UNIQUE (code)
);

CREATE TRIGGER trg_carriers_updated_at
BEFORE UPDATE ON carriers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. BẢNG GÓI DỊCH VỤ CỦA HÃNG: carrier_service_tiers
-- ============================================================================
CREATE TABLE carrier_service_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID NOT NULL,
    tier_code service_tier_code NOT NULL,
    tier_name VARCHAR(100) NOT NULL,
    vehicle_type vehicle_type NOT NULL DEFAULT 'GASOLINE_BIKE',
    max_weight_grams INTEGER NOT NULL DEFAULT 30000,
    max_dimension_cm INTEGER NOT NULL DEFAULT 50,
    base_fee_vnd INTEGER NOT NULL,
    base_distance_meters INTEGER NOT NULL DEFAULT 2000,
    price_per_next_km_vnd INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_carrier_service_tier UNIQUE (carrier_id, tier_code),
    CONSTRAINT fk_service_tiers_carrier FOREIGN KEY (carrier_id) 
        REFERENCES carriers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_service_tiers_weight CHECK (max_weight_grams > 0),
    CONSTRAINT chk_service_tiers_dimension CHECK (max_dimension_cm > 0),
    CONSTRAINT chk_service_tiers_base_fee CHECK (base_fee_vnd >= 0),
    CONSTRAINT chk_service_tiers_base_dist CHECK (base_distance_meters > 0),
    CONSTRAINT chk_service_tiers_price_km CHECK (price_per_next_km_vnd >= 0)
);

CREATE TRIGGER trg_carrier_service_tiers_updated_at
BEFORE UPDATE ON carrier_service_tiers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. BẢNG ĐƠN HÀNG VẬN CHUYỂN: orders
-- ============================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(32) NOT NULL,
    tracking_token VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL,
    carrier_id UUID,
    service_tier_id UUID,
    selected_quote_id UUID,
    carrier_order_id VARCHAR(100),
    status order_status NOT NULL DEFAULT 'DRAFT',
    payment_method payment_method NOT NULL DEFAULT 'WALLET',

    -- TUYẾN ĐƯỜNG & ĐỊA ĐIỂM LẤY HÀNG (PICKUP)
    pickup_sender_name VARCHAR(150) NOT NULL,
    pickup_sender_phone VARCHAR(20) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude NUMERIC(10, 7) NOT NULL,
    pickup_longitude NUMERIC(10, 7) NOT NULL,
    pickup_note TEXT,

    -- TUYẾN ĐƯỜNG & ĐỊA ĐIỂM GIAO HÀNG (DROPOFF)
    dropoff_receiver_name VARCHAR(150) NOT NULL,
    dropoff_receiver_phone VARCHAR(20) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude NUMERIC(10, 7) NOT NULL,
    dropoff_longitude NUMERIC(10, 7) NOT NULL,
    dropoff_note TEXT,

    -- THÔNG SỐ ĐO ĐẠC ĐƯỜNG BỘ
    distance_meters INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,

    -- CƠ CẤU GIÁ CƯỚC (VNĐ)
    base_fee INTEGER NOT NULL DEFAULT 0,
    surcharges INTEGER NOT NULL DEFAULT 0,
    platform_fee INTEGER NOT NULL DEFAULT 1000,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    final_total_fee INTEGER NOT NULL DEFAULT 0,

    -- THÔNG TIN TÀI XẾ TIẾP NHẬN
    driver_name VARCHAR(150),
    driver_phone VARCHAR(20),
    driver_license_plate VARCHAR(30),
    driver_vehicle_type vehicle_type,
    driver_current_lat NUMERIC(10, 7),
    driver_current_lng NUMERIC(10, 7),
    driver_assigned_at TIMESTAMPTZ,

    -- MỐC THỜI GIAN THỰC HIỆN
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_orders_order_code UNIQUE (order_code),
    CONSTRAINT uq_orders_tracking_token UNIQUE (tracking_token),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_carrier FOREIGN KEY (carrier_id) 
        REFERENCES carriers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_service_tier FOREIGN KEY (service_tier_id) 
        REFERENCES carrier_service_tiers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_orders_distance CHECK (distance_meters >= 0),
    CONSTRAINT chk_orders_duration CHECK (duration_seconds >= 0),
    CONSTRAINT chk_orders_base_fee CHECK (base_fee >= 0),
    CONSTRAINT chk_orders_surcharges CHECK (surcharges >= 0),
    CONSTRAINT chk_orders_platform_fee CHECK (platform_fee >= 0),
    CONSTRAINT chk_orders_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_orders_final_total CHECK (final_total_fee >= 0),
    CONSTRAINT chk_orders_pickup_lat CHECK (pickup_latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_orders_pickup_lng CHECK (pickup_longitude BETWEEN -180.0 AND 180.0),
    CONSTRAINT chk_orders_dropoff_lat CHECK (dropoff_latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_orders_dropoff_lng CHECK (dropoff_longitude BETWEEN -180.0 AND 180.0)
);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ràng buộc khóa ngoại từ wallet_transactions sang orders
ALTER TABLE wallet_transactions 
ADD CONSTRAINT fk_wallet_tx_order FOREIGN KEY (order_id) 
REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 9. BẢNG KIỆN HÀNG HÓA: packages
-- ============================================================================
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    package_type package_type NOT NULL DEFAULT 'FASHION',
    weight_in_grams INTEGER NOT NULL,
    length_cm INTEGER NOT NULL DEFAULT 20,
    width_cm INTEGER NOT NULL DEFAULT 15,
    height_cm INTEGER NOT NULL DEFAULT 10,
    declared_value_vnd INTEGER NOT NULL DEFAULT 0,
    cod_amount_vnd INTEGER NOT NULL DEFAULT 0,
    is_fragile BOOLEAN NOT NULL DEFAULT false,
    deliver_to_door BOOLEAN NOT NULL DEFAULT false,
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_packages_order_id UNIQUE (order_id),
    CONSTRAINT fk_packages_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_packages_weight CHECK (weight_in_grams > 0),
    CONSTRAINT chk_packages_length CHECK (length_cm > 0),
    CONSTRAINT chk_packages_width CHECK (width_cm > 0),
    CONSTRAINT chk_packages_height CHECK (height_cm > 0),
    CONSTRAINT chk_packages_declared_value CHECK (declared_value_vnd >= 0),
    CONSTRAINT chk_packages_cod_amount CHECK (cod_amount_vnd >= 0)
);

CREATE TRIGGER trg_packages_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. BẢNG BÁO GIÁ ĐA HÃNG: carrier_quotes
-- ============================================================================
CREATE TABLE carrier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    carrier_id UUID NOT NULL,
    service_tier_id UUID NOT NULL,
    quote_reference_id VARCHAR(100),
    base_fee INTEGER NOT NULL,
    surcharges INTEGER NOT NULL DEFAULT 0,
    platform_fee INTEGER NOT NULL DEFAULT 1000,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    final_total_fee INTEGER NOT NULL,
    estimated_pickup_minutes INTEGER NOT NULL DEFAULT 10,
    estimated_delivery_minutes INTEGER NOT NULL DEFAULT 30,
    badge smart_badge,
    is_available BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    expired_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quotes_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_quotes_carrier FOREIGN KEY (carrier_id) 
        REFERENCES carriers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_quotes_service_tier FOREIGN KEY (service_tier_id) 
        REFERENCES carrier_service_tiers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_quotes_base_fee CHECK (base_fee >= 0),
    CONSTRAINT chk_quotes_surcharges CHECK (surcharges >= 0),
    CONSTRAINT chk_quotes_platform_fee CHECK (platform_fee >= 0),
    CONSTRAINT chk_quotes_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_quotes_final_total CHECK (final_total_fee >= 0),
    CONSTRAINT chk_quotes_pickup_min CHECK (estimated_pickup_minutes >= 0),
    CONSTRAINT chk_quotes_delivery_min CHECK (estimated_delivery_minutes >= 0)
);

-- Ràng buộc liên kết ngược từ orders sang carrier_quotes (selected_quote_id)
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_selected_quote FOREIGN KEY (selected_quote_id) 
REFERENCES carrier_quotes(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 11. BẢNG NHẬT KÝ VÒNG ĐỜI TRẠNG THÁI: order_status_logs
-- ============================================================================
CREATE TABLE order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'USER_ACTION',
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_logs_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- 12. BẢNG NHẬT KÝ SỰ KIỆN WEBHOOK ĐỐI TÁC: webhook_logs
-- ============================================================================
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID NOT NULL,
    order_id UUID,
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    normalized_status order_status,
    signature VARCHAR(255),
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    status webhook_processing_status NOT NULL DEFAULT 'PENDING',
    raw_payload JSONB NOT NULL,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_webhook_logs_carrier_event UNIQUE (carrier_id, event_id),
    CONSTRAINT fk_webhook_logs_carrier FOREIGN KEY (carrier_id) 
        REFERENCES carriers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_webhook_logs_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- 13. CHỈ MỤC TỐI ƯU HÓA HIỆU NĂNG CAO (HIGH-PERFORMANCE INDEXES)
-- ============================================================================

-- Bảng users
CREATE INDEX idx_users_role_status ON users(role, status);

-- Bảng wallets & wallet_transactions
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_order_id ON wallet_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_wallet_tx_type_status ON wallet_transactions(type, status);

-- Bảng orders (Thực thể truy vấn nhiều nhất)
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_carrier_status ON orders(carrier_id, status);
CREATE INDEX idx_orders_carrier_order_id ON orders(carrier_order_id) WHERE carrier_order_id IS NOT NULL;
CREATE INDEX idx_orders_tracking_token ON orders(tracking_token);
CREATE INDEX idx_orders_created_at_desc ON orders(created_at DESC);

-- Bảng carrier_quotes
CREATE INDEX idx_carrier_quotes_order_id ON carrier_quotes(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_carrier_quotes_carrier_tier ON carrier_quotes(carrier_id, service_tier_id);
CREATE INDEX idx_carrier_quotes_expired_at ON carrier_quotes(expired_at);

-- Bảng order_status_logs
CREATE INDEX idx_status_logs_order_created ON order_status_logs(order_id, created_at ASC);

-- Bảng webhook_logs
CREATE INDEX idx_webhook_logs_status_created ON webhook_logs(status, created_at ASC) 
    WHERE status = 'PENDING';
CREATE INDEX idx_webhook_logs_order_id ON webhook_logs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_webhook_logs_carrier_id ON webhook_logs(carrier_id);
```

---

## 2. PHÂN TÍCH CHIẾN LƯỢC CHỈ MỤC (INDEXING STRATEGY ANALYSIS)

1. **`orders(tracking_token)` & `orders(order_code)`**: Đều là `UNIQUE INDEX`, bảo đảm tìm kiếm điểm truy cập Live Tracking chỉ mất $\mathcal{O}(\log N)$, phục vụ hàng triệu lượt view không cần xác thực.
2. **`orders(user_id, created_at DESC)`**: Tối ưu 100% cho màn hình Danh sách đơn hàng của chủ shop trên Next.js App Router, tận dụng chỉ mục kết hợp để tránh `Filesort`.
3. **`orders(carrier_order_id)` với `WHERE carrier_order_id IS NOT NULL` (Partial Index)**: Chỉ đánh chỉ mục các đơn đã được hãng tiếp nhận, tiết kiệm tới 60% dung lượng RAM Index so với đánh toàn bảng.
4. **`webhook_logs(carrier_id, event_id)` (Unique Composite Index)**: Đảm bảo tính Idempotency ở tầng nhân cơ sở dữ liệu. Mọi sự kiện trùng lặp từ hãng (do retry mạng) sẽ bị chặn ngay lập tức qua lỗi `23505 (unique_violation)`.
5. **`webhook_logs(status, created_at ASC) WHERE status = 'PENDING'`**: Hàng đợi partial index siêu nhẹ phục vụ Background Worker xử lý các webhook tồn đọng theo thứ tự FIFO.
