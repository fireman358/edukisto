export type RequestStatus = "nouveau" | "planifie" | "en_cours" | "resolu";
export type Urgency = "basse" | "normale" | "haute" | "urgente";
export type Category =
  | "plomberie"
  | "electricite"
  | "chauffage"
  | "menuiserie"
  | "toiture"
  | "serrurerie"
  | "electromenager"
  | "autre";

export interface Profile {
  id: string;
  email: string;
  role: "bailleur" | "locataire";
  full_name: string;
  phone: string | null;
}

export interface Property {
  id: string;
  owner_id: string;
  address: string;
  type: string;
  notes: string | null;
  access_code: string;
  access_code_revoked_at: string | null;
  created_at: string;
}

export interface Tenant {
  id: string;
  property_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  created_at: string;
}

export interface RepairRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  category: Category;
  urgency: Urgency;
  status: RequestStatus;
  description: string;
  owner_read: boolean;
  created_at: string;
  updated_at: string;
  properties?: { address: string };
  tenants?: { full_name: string } | null;
}

export interface Intervention {
  id: string;
  request_id: string;
  artisan_name: string | null;
  artisan_phone: string | null;
  cost: number | null;
  scheduled_date: string | null;
  performed_date: string | null;
}

export interface RequestPhoto {
  id: string;
  request_id: string;
  storage_path: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  chauffage: "Chauffage",
  menuiserie: "Menuiserie",
  toiture: "Toiture",
  serrurerie: "Serrurerie",
  electromenager: "Électroménager",
  autre: "Autre",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute (24-48h)",
  urgente: "Urgente (24h)",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  nouveau: "Nouveau",
  planifie: "Planifié",
  en_cours: "En cours",
  resolu: "Résolu",
};

export const URGENCY_ORDER: Record<Urgency, number> = {
  urgente: 0,
  haute: 1,
  normale: 2,
  basse: 3,
};
