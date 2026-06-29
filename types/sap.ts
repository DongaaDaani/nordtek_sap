// ─── System ───────────────────────────────────────────────────────────────────
export interface SapStatus {
  version: string;
  build: string;
  environment: string;
  date: string;
  time: string;
}

// ─── Generic response wrapper ─────────────────────────────────────────────────
export interface SapResponse<T = unknown> {
  error: boolean;
  message: string;
  data: T;
}

// ─── Entities ─────────────────────────────────────────────────────────────────
export interface SapItemGroup   { id: number; name: string }
export interface SapWarehouse   { code: string; name: string }
export interface SapShipping    { id: number; name: string }
export interface SapPayment     { id: number; name: string }
export interface SapCurrency    { code: string; name: string; iso_code: string }
export interface SapVatGroup    { code: string; name: string; rate_percent: number }
export interface SapSalesPerson { code: number; name: string; active: boolean }
export interface SapWorker      { id: number; last_name: string; first_name: string; email: string; is_active: boolean; sap_sales_person_id: number }
export interface SapUser        { id: number; code: string }
export interface SapPriceList   { id: number; name: string; currency: string }
export interface SapLanguage    { id: number; name: string; code: string }
export interface SapPartnerGroup { code: string; name: string; type: string }
export interface SapDocumentSeries { series: number; name: string; object_code: string }
export interface SapCountry     { code: string; name: string }
export interface SapFieldValue  { field_value: string; description: string; order: number }

export type EntityType =
  | "item-groups"
  | "item-features"
  | "warehouses"
  | "shippings"
  | "payments"
  | "currencies"
  | "vat-groups"
  | "salespeople"
  | "workers"
  | "users"
  | "price-lists"
  | "languages"
  | "partner-groups"
  | "document-series"
  | "document-lead-times"
  | "document-parity"
  | "countries"
  | "payment-statuses"
  | "couriers";

// ─── Items ────────────────────────────────────────────────────────────────────
export interface SapItem {
  item_code: string;
  item_name: string;
  item_name_en: string;
  sap_item_group_id: number;
  category_id: number;
  purchase_item: boolean;
  inventory_item: boolean;
  is_active: boolean;
  sellable_item: boolean;
  sellable_in_webshop: boolean;
  sap_vat_group_code: string;
  picture_1: string;
  neck_size: string;
  material: number;
  main_stock: number;
  outer_stock: number;
  volume: number;
  works_with: string;
  not_works_with: string;
}

export interface SapItemUpdatePayload {
  warehouse_position?: string;
  weight?: string;
  qty_per_box?: number;
  works_with?: string;
  not_works_with?: string;
  u_hu_generated?: string;
  u_en_generated?: string;
  u_aip_de?: string;
  video_link?: string[];
}

// ─── Business Partners ────────────────────────────────────────────────────────
export interface SapBusinessPartner {
  card_code: string;
  name: string;
  foreign_name: string;
  type: string;
  vat_id: string;
  tax_id: string;
  sap_price_list_id: number;
  sap_payment_id: number;
  sap_language_id: number;
  sales_person_id: number;
  sap_currency: string;
  phone_1: string;
  email: string;
  send_invoice_via_email: boolean;
  is_active: boolean;
  country: string;
  order_balance: number;
  invoice_balance: number;
  qry1: number;
}

export interface SapBusinessPartnerCreatePayload {
  webshop_id?: number;
  name: string;
  foreign_name?: string;
  type: string;
  user_group?: string;
  is_active?: string;
  inactive_note?: string;
  vat_id?: string;
  tax_id?: string;
  sap_vat_group_code?: string;
  sap_price_list_id?: number;
  sap_payment_id?: number;
  sap_language_id?: number;
  sales_person_id?: number;
  credit_limit?: number;
  remarks?: string;
  sap_card_group_id?: number;
  sap_currency?: string;
  phone_1?: string;
  phone_2?: string;
  mobile_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export interface SapContact {
  id: number;
  card_code: string;
  name: string;
  title: string;
  position: string;
  phone_1: string;
  phone_2: string;
  mobile_phone: string;
  fax: string;
  email: string;
  remarks_1: string;
  remarks_2: string;
  is_active: boolean;
}

// ─── Addresses ────────────────────────────────────────────────────────────────
export interface SapAddress {
  name: string;
  card_code: string;
  street: string;
  city: string;
  zip_code: string;
  country: string;
  block: string;
  street_number: string;
  building: string;
  address_type: "B" | "S";
  vat_id: string;
  line_num: number;
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type DocType = "order" | "invoice" | "inquiry" | "delivery";

export interface SapDocumentMaster {
  doc_entry: number;
  doc_number: number;
  series: number;
  status: string;
  object_type: number;
  booking_date: string;
  shipping_date: string;
  document_date: string;
  sap_currency_code: string;
  sap_payment_id: number;
  total: number;
  vat_total: number;
  discount_total: number;
  web_order_number: string;
  contact_person_id: number;
  card_code: string;
  card_name: string;
  billing_city: string;
  shipping_city: string;
  sap_shipping_id: number;
  payment_status: string;
  weborder_status: string;
  seller_company_code: string;
  document_type: string;
}

export interface SapDocumentLine {
  doc_entry: number;
  line_number: number;
  line_status: string;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  sap_currency_code: string;
  discount_percent: number;
  line_total: number;
  vat_group: string;
  sap_warehouse_code: string;
  free_text: string;
  parity: string;
  estimated_lead_time: number;
  ship_date: string;
}

export interface SapDocument {
  master_data: SapDocumentMaster[];
  items: SapDocumentLine[];
}

// ─── Invoices / Deliveries ────────────────────────────────────────────────────
export interface SapDelivery {
  WebMrs: string;
  docnum: number;
  docentry: number;
  DocCur: string;
  konyvelesi_datum: string;
  PymntGroupName: string;
  country: string;
  cardname: string;
  address: string;
  address2: string;
  eu_adoszam: string;
  Comments: string;
  netto_eng_nelkulFC: number;
  netto_eng_nelkul: number;
  OsszesenFC: number;
  ado_osszesenFC: number;
  TotalNetWeight: string;
  TotalGrossWeight: number;
  SellerCompany: string;
  WebInvoice: string;
  Items: Array<{
    TreeType: string;
    ItemCode: string;
    SWW: string;
    FrgnName: string;
    FrgnNameDe: string;
    quantity: string;
    price: string;
    linetotal: string;
  }>;
}

// ─── Feature Values ───────────────────────────────────────────────────────────
export interface FeatureValueEntry {
  code: string;
  name: Record<string, string>;
}

export interface SapFeatureValues {
  cosmetic_base: FeatureValueEntry[];
  bottle_type: FeatureValueEntry[];
  color: FeatureValueEntry[];
  field_of_use: FeatureValueEntry[];
  neck_type: FeatureValueEntry[];
  please_note: FeatureValueEntry[];
  shape: FeatureValueEntry[];
  cap_type: FeatureValueEntry[];
  neck_size: FeatureValueEntry[];
  material: FeatureValueEntry[];
  food_type: FeatureValueEntry[];
  collar: FeatureValueEntry[];
}
