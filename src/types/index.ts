export type RoleName = 'super_admin' | 'academic_director' | 'secretary' | 'teacher' | 'finance' | 'viewer';

export interface Role {
  id: string;
  name: RoleName;
  label: string;
  description: string | null;
  is_system: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  role_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  role?: Role;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'preparation' | 'open' | 'closed' | 'archived';
  is_current: boolean;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

export interface Level {
  id: string;
  name: string;
  code: string;
  order_index: number;
  program_id: string | null;
  is_active: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  academic_year_id: string | null;
  level_id: string | null;
  program_id: string | null;
  is_active: boolean;
}

export interface Student {
  id: string;
  matricule: string | null;
  photo_url: string | null;
  last_name: string;
  first_name: string;
  sex: 'M' | 'F' | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  marital_status: string | null;
  married_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  residence_address: string | null;
  city: string | null;
  country: string | null;
  church: string | null;
  denomination: string | null;
  pastor_name: string | null;
  ministry_role: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  first_enrollment_date: string | null;
  current_level_id: string | null;
  current_promotion_id: string | null;
  academic_status: string;
  observations: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  last_name: string;
  first_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  status: string;
  observations: string | null;
  deleted_at: string | null;
}

export interface Module {
  id: string;
  name: string;
  code: string;
  order_index: number;
  color: string;
  level_id: string;
  academic_year_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module_id: string;
  level_id: string;
  academic_year_id: string;
  teacher_id: string | null;
  coefficient: number;
  max_score: number;
  min_score: number;
  passing_threshold: number;
  order_index: number;
  is_active: boolean;
  teacher?: Teacher;
  module?: Module;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  enrollment_id: string | null;
  academic_year_id: string;
  level_id: string | null;
  score: number | null;
  is_absent: boolean;
  is_not_available: boolean;
  status: string;
  observation: string | null;
  entered_by: string | null;
  entered_at: string;
  validated_by: string | null;
  validated_at: string | null;
  locked_at: string | null;
}

export interface Enrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  program_id: string | null;
  level_id: string;
  promotion_id: string | null;
  enrollment_type: string;
  status: string;
  enrollment_date: string;
  validated_at: string | null;
  validated_by: string | null;
  observations: string | null;
  student?: Student;
  academic_year?: AcademicYear;
  level?: Level;
  program?: Program;
}

export interface FeeCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_mandatory: boolean;
  order_index: number;
}

export interface TuitionFeeStructure {
  id: string;
  academic_year_id: string;
  program_id: string | null;
  level_id: string;
  fee_category_id: string;
  amount: number;
  currency: string;
  number_of_installments: number;
  is_active: boolean;
  fee_category?: FeeCategory;
  level?: Level;
}

export interface StudentFeeAccount {
  id: string;
  student_id: string;
  academic_year_id: string;
  enrollment_id: string | null;
  level_id: string | null;
  total_due: number;
  total_paid: number;
  total_discount: number;
  remaining: number;
  currency: string;
  is_up_to_date: boolean;
  student?: Student;
}

export interface StudentFeeItem {
  id: string;
  student_fee_account_id: string;
  fee_category_id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  amount_paid: number;
  remaining: number;
  is_mandatory: boolean;
  fee_category?: FeeCategory;
}

export interface Payment {
  id: string;
  student_id: string;
  academic_year_id: string;
  enrollment_id: string | null;
  student_fee_account_id: string | null;
  amount: number;
  payment_method: string;
  payment_method_detail: string | null;
  transaction_reference: string | null;
  payment_date: string;
  received_by: string | null;
  observation: string | null;
  receipt_number: string | null;
  status: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  student?: Student;
}

export interface PaymentReceipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  student_id: string | null;
  amount: number;
  amount_in_words: string | null;
  payment_method: string | null;
  issued_by: string | null;
  issued_at: string;
}

export interface TrainingBooklet {
  id: string;
  code: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  module_id: string | null;
  level_id: string | null;
  academic_year_id: string | null;
  teacher_id: string | null;
  unit_price: number;
  purchase_cost: number;
  stock_quantity: number;
  reserved_stock: number;
  min_stock_threshold: number;
  is_mandatory: boolean;
  is_included_in_tuition: boolean;
  has_print_version: boolean;
  has_digital_version: boolean;
  digital_file_url: string | null;
  cover_image_url: string | null;
  version: string | null;
  publication_date: string | null;
  is_active: boolean;
  level?: Level;
}

export interface BookletOrder {
  id: string;
  order_number: string;
  student_id: string;
  academic_year_id: string | null;
  enrollment_id: string | null;
  level_id: string | null;
  pack_id: string | null;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  amount_paid: number;
  remaining: number;
  status: string;
  order_date: string;
  student?: Student;
}

export interface BookletStockMovement {
  id: string;
  booklet_id: string;
  movement_type: string;
  quantity: number;
  reference: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  booklet?: TrainingBooklet;
}

export interface StudentCard {
  id: string;
  card_number: string;
  student_id: string;
  academic_year_id: string;
  enrollment_id: string | null;
  level_id: string | null;
  program_id: string | null;
  promotion_id: string | null;
  qr_code_data: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  generated_by: string | null;
  generated_at: string;
  printed_at: string | null;
  delivered_at: string | null;
  student?: Student;
}

export interface AnnualResult {
  id: string;
  student_id: string;
  academic_year_id: string;
  level_id: string | null;
  enrollment_id: string | null;
  total_points: number | null;
  average: number | null;
  weighted_average: number | null;
  subjects_passed: number | null;
  subjects_failed: number | null;
  subjects_counted: number | null;
  pass_rate: number | null;
  rank: number | null;
  decision: string | null;
  student?: Student;
}

export interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
  description: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
