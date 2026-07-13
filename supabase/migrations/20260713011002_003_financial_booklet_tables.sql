/*
# Financial & Booklet Tables - IBR Gestion Académique

Creates tables for tuition fee structures, student fee accounts, payments,
receipts, training booklets, stock, packs, orders, deliveries, and student cards.

## Tables Created
1. fee_categories - Types of fees (inscription, scolarite, carte, etc.)
2. tuition_fee_structures - Fee amounts per level/year/program
3. student_fee_accounts - Student's total financial situation per year
4. student_fee_items - Individual fee items copied to student account
5. payment_schedules - Payment installments with due dates
6. payments - Payment records
7. payment_allocations - Allocation of payments to fee items
8. payment_receipts - Receipt documents
9. discounts - Discounts and exemptions
10. student_cards - Student ID cards with QR codes
11. card_reprints - Card reprint history
12. training_booklets - Booklet catalog
13. booklet_packs - Pack of booklets
14. booklet_pack_items - Items in a pack
15. booklet_orders - Sales orders
16. booklet_order_items - Items in an order
17. booklet_deliveries - Delivery records
18. booklet_stock_movements - Stock in/out movements
19. financial_audit_logs - Financial change audit trail

## Security
- RLS enabled on all tables, authenticated-only access
*/

-- ============================================================================
-- FEE CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  is_mandatory boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fee_categories_auth" ON fee_categories;
CREATE POLICY "select_fee_categories_auth" ON fee_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fee_categories_auth" ON fee_categories;
CREATE POLICY "insert_fee_categories_auth" ON fee_categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fee_categories_auth" ON fee_categories;
CREATE POLICY "update_fee_categories_auth" ON fee_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fee_categories_auth" ON fee_categories;
CREATE POLICY "delete_fee_categories_auth" ON fee_categories FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- TUITION FEE STRUCTURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS tuition_fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  fee_category_id uuid NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'FCFA',
  number_of_installments integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(academic_year_id, level_id, fee_category_id, program_id)
);

ALTER TABLE tuition_fee_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "select_tuition_fee_structures_auth" ON tuition_fee_structures FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "insert_tuition_fee_structures_auth" ON tuition_fee_structures FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "update_tuition_fee_structures_auth" ON tuition_fee_structures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "delete_tuition_fee_structures_auth" ON tuition_fee_structures FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tuition_year_level ON tuition_fee_structures(academic_year_id, level_id);

-- ============================================================================
-- STUDENT FEE ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_fee_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  total_due numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  total_discount numeric NOT NULL DEFAULT 0,
  remaining numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'FCFA',
  is_up_to_date boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year_id)
);

ALTER TABLE student_fee_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "select_student_fee_accounts_auth" ON student_fee_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "insert_student_fee_accounts_auth" ON student_fee_accounts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "update_student_fee_accounts_auth" ON student_fee_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "delete_student_fee_accounts_auth" ON student_fee_accounts FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fee_accounts_student_year ON student_fee_accounts(student_id, academic_year_id);

-- ============================================================================
-- STUDENT FEE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_fee_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id uuid NOT NULL REFERENCES student_fee_accounts(id) ON DELETE CASCADE,
  fee_category_id uuid NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  original_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  remaining numeric NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_fee_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "select_student_fee_items_auth" ON student_fee_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "insert_student_fee_items_auth" ON student_fee_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "update_student_fee_items_auth" ON student_fee_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "delete_student_fee_items_auth" ON student_fee_items FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PAYMENT SCHEDULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id uuid NOT NULL REFERENCES student_fee_accounts(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount_due numeric NOT NULL DEFAULT 0,
  due_date date,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "select_payment_schedules_auth" ON payment_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "insert_payment_schedules_auth" ON payment_schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "update_payment_schedules_auth" ON payment_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "delete_payment_schedules_auth" ON payment_schedules FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  student_fee_account_id uuid REFERENCES student_fee_accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'especes' CHECK (payment_method IN ('especes', 'virement', 'depot_bancaire', 'mobile_money', 'cheque', 'autre')),
  payment_method_detail text,
  transaction_reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observation text,
  receipt_number text UNIQUE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled', 'refunded', 'rejected')),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payments_auth" ON payments;
CREATE POLICY "select_payments_auth" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payments_auth" ON payments;
CREATE POLICY "insert_payments_auth" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_payments_auth" ON payments;
CREATE POLICY "update_payments_auth" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_payments_auth" ON payments;
CREATE POLICY "delete_payments_auth" ON payments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- PAYMENT ALLOCATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  student_fee_item_id uuid NOT NULL REFERENCES student_fee_items(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_allocations_auth" ON payment_allocations;
CREATE POLICY "select_payment_allocations_auth" ON payment_allocations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payment_allocations_auth" ON payment_allocations;
CREATE POLICY "insert_payment_allocations_auth" ON payment_allocations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_payment_allocations_auth" ON payment_allocations;
CREATE POLICY "delete_payment_allocations_auth" ON payment_allocations FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PAYMENT RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_in_words text,
  payment_method text,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_receipts_auth" ON payment_receipts;
CREATE POLICY "select_payment_receipts_auth" ON payment_receipts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payment_receipts_auth" ON payment_receipts;
CREATE POLICY "insert_payment_receipts_auth" ON payment_receipts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_payment_receipts_auth" ON payment_receipts;
CREATE POLICY "update_payment_receipts_auth" ON payment_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipts_student ON payment_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON payment_receipts(receipt_number);

-- ============================================================================
-- DISCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES fee_categories(id) ON DELETE SET NULL,
  discount_type text NOT NULL DEFAULT 'remise' CHECK (discount_type IN ('remise', 'bourse', 'exoneration')),
  percentage numeric,
  fixed_amount numeric,
  reason text,
  authorized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_discounts_auth" ON discounts;
CREATE POLICY "select_discounts_auth" ON discounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_discounts_auth" ON discounts;
CREATE POLICY "insert_discounts_auth" ON discounts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_discounts_auth" ON discounts;
CREATE POLICY "update_discounts_auth" ON discounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_discounts_auth" ON discounts;
CREATE POLICY "delete_discounts_auth" ON discounts FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- STUDENT CARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text UNIQUE NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  qr_code_data text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'printed', 'delivered', 'expired', 'cancelled', 'replaced')),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  printed_at timestamptz,
  delivered_at timestamptz,
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_student_cards_auth" ON student_cards;
CREATE POLICY "select_student_cards_auth" ON student_cards FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_cards_auth" ON student_cards;
CREATE POLICY "insert_student_cards_auth" ON student_cards FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_cards_auth" ON student_cards;
CREATE POLICY "update_student_cards_auth" ON student_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_cards_auth" ON student_cards;
CREATE POLICY "delete_student_cards_auth" ON student_cards FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cards_student ON student_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_cards_number ON student_cards(card_number);

-- ============================================================================
-- CARD REPRINTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_reprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_card_id uuid NOT NULL REFERENCES student_cards(id) ON DELETE CASCADE,
  new_card_id uuid REFERENCES student_cards(id) ON DELETE SET NULL,
  reason text,
  reprint_fee numeric DEFAULT 0,
  reprinted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reprinted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE card_reprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_card_reprints_auth" ON card_reprints;
CREATE POLICY "select_card_reprints_auth" ON card_reprints FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_card_reprints_auth" ON card_reprints;
CREATE POLICY "insert_card_reprints_auth" ON card_reprints FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- TRAINING BOOKLETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_booklets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  purchase_cost numeric DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  reserved_stock integer NOT NULL DEFAULT 0,
  min_stock_threshold integer DEFAULT 5,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_included_in_tuition boolean NOT NULL DEFAULT false,
  has_print_version boolean NOT NULL DEFAULT true,
  has_digital_version boolean NOT NULL DEFAULT false,
  digital_file_url text,
  cover_image_url text,
  version text,
  publication_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_booklets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_training_booklets_auth" ON training_booklets;
CREATE POLICY "select_training_booklets_auth" ON training_booklets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_training_booklets_auth" ON training_booklets;
CREATE POLICY "insert_training_booklets_auth" ON training_booklets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_training_booklets_auth" ON training_booklets;
CREATE POLICY "update_training_booklets_auth" ON training_booklets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_training_booklets_auth" ON training_booklets;
CREATE POLICY "delete_training_booklets_auth" ON training_booklets FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_booklets_level ON training_booklets(level_id);
CREATE INDEX IF NOT EXISTS idx_booklets_code ON training_booklets(code);

-- ============================================================================
-- BOOKLET PACKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  normal_price numeric NOT NULL DEFAULT 0,
  pack_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE booklet_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "select_booklet_packs_auth" ON booklet_packs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "insert_booklet_packs_auth" ON booklet_packs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "update_booklet_packs_auth" ON booklet_packs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "delete_booklet_packs_auth" ON booklet_packs FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- BOOKLET PACK ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_pack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES booklet_packs(id) ON DELETE CASCADE,
  booklet_id uuid NOT NULL REFERENCES training_booklets(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pack_id, booklet_id)
);

ALTER TABLE booklet_pack_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_pack_items_auth" ON booklet_pack_items;
CREATE POLICY "select_booklet_pack_items_auth" ON booklet_pack_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_pack_items_auth" ON booklet_pack_items;
CREATE POLICY "insert_booklet_pack_items_auth" ON booklet_pack_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_booklet_pack_items_auth" ON booklet_pack_items;
CREATE POLICY "delete_booklet_pack_items_auth" ON booklet_pack_items FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- BOOKLET ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  pack_id uuid REFERENCES booklet_packs(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  remaining numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'unpaid', 'partially_paid', 'paid', 'available', 'delivered', 'cancelled', 'refunded')),
  order_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE booklet_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "select_booklet_orders_auth" ON booklet_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "insert_booklet_orders_auth" ON booklet_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "update_booklet_orders_auth" ON booklet_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "delete_booklet_orders_auth" ON booklet_orders FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_booklet_orders_student ON booklet_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_booklet_orders_number ON booklet_orders(order_number);

-- ============================================================================
-- BOOKLET ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES booklet_orders(id) ON DELETE CASCADE,
  booklet_id uuid NOT NULL REFERENCES training_booklets(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  remaining numeric NOT NULL DEFAULT 0,
  is_delivered boolean NOT NULL DEFAULT false,
  delivered_quantity integer NOT NULL DEFAULT 0,
  delivered_at timestamptz,
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE booklet_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "select_booklet_order_items_auth" ON booklet_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "insert_booklet_order_items_auth" ON booklet_order_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "update_booklet_order_items_auth" ON booklet_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "delete_booklet_order_items_auth" ON booklet_order_items FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- BOOKLET DELIVERIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES booklet_order_items(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  booklet_id uuid NOT NULL REFERENCES training_booklets(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_date timestamptz DEFAULT now(),
  observation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booklet_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_deliveries_auth" ON booklet_deliveries;
CREATE POLICY "select_booklet_deliveries_auth" ON booklet_deliveries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_deliveries_auth" ON booklet_deliveries;
CREATE POLICY "insert_booklet_deliveries_auth" ON booklet_deliveries FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- BOOKLET STOCK MOVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS booklet_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES training_booklets(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('initial', 'in', 'out', 'sale', 'free_delivery', 'damaged', 'loss', 'correction')),
  quantity integer NOT NULL,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booklet_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booklet_stock_movements_auth" ON booklet_stock_movements;
CREATE POLICY "select_booklet_stock_movements_auth" ON booklet_stock_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_booklet_stock_movements_auth" ON booklet_stock_movements;
CREATE POLICY "insert_booklet_stock_movements_auth" ON booklet_stock_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_movements_booklet ON booklet_stock_movements(booklet_id);

-- ============================================================================
-- FINANCIAL AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  amount numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_financial_audit_logs_auth" ON financial_audit_logs;
CREATE POLICY "select_financial_audit_logs_auth" ON financial_audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_financial_audit_logs_auth" ON financial_audit_logs;
CREATE POLICY "insert_financial_audit_logs_auth" ON financial_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fin_audit_logs_entity ON financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_logs_created ON financial_audit_logs(created_at);

-- Apply updated_at triggers to new tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;
