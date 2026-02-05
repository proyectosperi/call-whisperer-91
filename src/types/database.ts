export type AppRole = 'admin' | 'caller';

export type Call1Status = 'confirmara' | 'no_contesta' | 'asistira' | 'no_asistira' | 'se_unio' | 'no_se_une';

export type Call2Status = 'matriculado' | 'no_matriculado' | 'no_contesta' | 'confirmara' | 'siguiente_mes';

export type GroupType = 'G1' | 'G2' | 'G3' | 'G4' | 'M1';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  campaign_start_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  phone_code: string;
}

export interface Contact {
  id: string;
  country_code: string;
  phone_number: string;
  full_phone: string;
  country_id?: string;
  course_id: string;
  source_group?: GroupType;
  created_at: string;
  updated_at: string;
  // Joined data
  course?: Course;
  country?: Country;
}

export interface Call1Record {
  id: string;
  contact_id: string;
  caller_id?: string;
  status: Call1Status;
  target_group?: GroupType;
  observation?: string;
  called_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: Contact;
  caller?: Profile;
}

export interface Call2Record {
  id: string;
  contact_id: string;
  caller_id?: string;
  status: Call2Status;
  origin_group?: GroupType;
  target_group?: GroupType;
  observation?: string;
  called_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: Contact;
  caller?: Profile;
}

export interface GroupMetric {
  id: string;
  course_id: string;
  group_type: GroupType;
  contact_count: number;
  recorded_date: string;
  created_at: string;
  // Joined data
  course?: Course;
}

export const CALL1_STATUS_LABELS: Record<Call1Status, string> = {
  confirmara: 'Confirmará',
  no_contesta: 'No Contesta',
  asistira: 'Asistirá',
  no_asistira: 'No Asistirá',
  se_unio: 'Se Unió',
  no_se_une: 'No Se Une',
};

export const CALL2_STATUS_LABELS: Record<Call2Status, string> = {
  matriculado: 'Matriculado',
  no_matriculado: 'No Matriculado',
  no_contesta: 'No Contesta',
  confirmara: 'Confirmará',
  siguiente_mes: 'Siguiente Mes',
};

export const GROUP_LABELS: Record<GroupType, string> = {
  G1: 'G1',
  G2: 'G2',
  G3: 'G3',
  G4: 'G4',
  M1: 'M1',
};

export const CALL1_STATUS_COLORS: Record<Call1Status, string> = {
  confirmara: 'bg-warning text-warning-foreground',
  no_contesta: 'bg-orange-500 text-white',
  asistira: 'bg-info text-info-foreground',
  no_asistira: 'bg-destructive text-destructive-foreground',
  se_unio: 'bg-success text-success-foreground',
  no_se_une: 'bg-destructive text-destructive-foreground',
};

export const CALL2_STATUS_COLORS: Record<Call2Status, string> = {
  matriculado: 'bg-success text-success-foreground',
  no_matriculado: 'bg-destructive text-destructive-foreground',
  no_contesta: 'bg-orange-500 text-white',
  confirmara: 'bg-warning text-warning-foreground',
  siguiente_mes: 'bg-info text-info-foreground',
};
