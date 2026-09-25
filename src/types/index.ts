export type EntityId = number | string

export type Nullable<T> = T | null

export type UserRole = 'admin' | 'technical_resource' | string

export type SupportStatus =
  | 'open'
  | 'in_progress'
  | 'indoor_repair'
  | 'outdoor_repair'
  | 'resolved'
  | 'closed'
  | 'cancelled'

export type SupportPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Department {
  id: EntityId
  name: string
  code?: Nullable<string>
  description?: Nullable<string>
  status?: Nullable<string>
}

export interface UserSummary {
  id: EntityId
  name: string
  email?: Nullable<string>
  role?: Nullable<UserRole>
  department_id?: Nullable<EntityId>
  department?: Nullable<Pick<Department, 'id' | 'name'>>
  status?: Nullable<string>
}

export interface TechnicalPersonnel {
  id: EntityId
  name: string
  email?: Nullable<string>
  phone?: Nullable<string>
  department_id?: Nullable<EntityId>
  department?: Nullable<Pick<Department, 'id' | 'name'>>
  designation?: Nullable<string>
  specialization?: Nullable<string>
  status?: Nullable<string>
}

export interface User extends UserSummary {
  email: string
  designation?: Nullable<string>
  territory?: Nullable<string>
}

export interface InspectionSummary {
  id: EntityId
  status?: Nullable<string>
  category?: Nullable<string>
  inspection_date?: Nullable<string>
  problem_id?: Nullable<string>
}

export interface Asset {
  id: EntityId
  type: string
  brand: string
  model: string
  serial_number: string
  ram?: Nullable<string>
  ram_gb?: Nullable<number | string>
  storage?: Nullable<string>
  asset_tag: string
  acquired_at?: Nullable<string>
  user_id?: Nullable<EntityId>
  department_id?: Nullable<EntityId>
  user?: Nullable<Pick<User, 'id' | 'name' | 'email'>>
  department?: Nullable<Pick<Department, 'id' | 'name'>>
  latest_inspection?: Nullable<InspectionSummary>
  status?: Nullable<string>
}

export interface Inspection {
  id: EntityId
  problem_id: string
  remarks?: Nullable<string>
  status: string
  category: string
  sub_category?: Nullable<string>
  inspection_date: string
  asset_id?: Nullable<EntityId>
  user_id?: Nullable<EntityId>
  technical_personnel_id?: Nullable<EntityId>
  asset?: Nullable<
    Pick<Asset, 'id' | 'type' | 'brand' | 'model' | 'asset_tag' | 'serial_number' | 'user'>
  >
  user?: Nullable<Pick<User, 'id' | 'name' | 'email'>>
  technical_personnel?: Nullable<Pick<TechnicalPersonnel, 'id' | 'name' | 'email'>>
  created_by?: Nullable<Pick<User, 'id' | 'name'>>
}

export interface IssueType {
  id: EntityId
  name: string
  description?: Nullable<string>
  status?: Nullable<string>
}

export interface ItemType {
  id: EntityId
  name: string
  description?: Nullable<string>
  status?: Nullable<string>
}

export type SupportReference = EntityId | UserSummary | null

export interface SupportLogAssignment {
  id?: EntityId
  assigned_to?: Nullable<EntityId>
  user?: Nullable<UserSummary>
  assigned_resource?: SupportReference
  assigned_by?: Nullable<EntityId>
  assigned_at?: Nullable<string>
  created_at?: Nullable<string>
  notes?: Nullable<string>
  status?: Nullable<string>
  [key: string]: unknown
}

export interface SupportLog {
  id: EntityId
  ticket_number: string
  issue_date?: Nullable<string>
  /** The API stores the requester's display name here, not a user ID. */
  initiated_by?: Nullable<string>
  department_id?: Nullable<EntityId>
  /** Relationship display values are returned as names by the support API. */
  department?: Nullable<string>
  issue_types: Array<EntityId | IssueType | string>
  item_type_id?: Nullable<EntityId>
  item_type?: Nullable<string>
  description: string
  status: SupportStatus | string
  priority: SupportPriority | string
  /** API user ID; use assigned_resource for the display name. */
  assigned_to?: Nullable<EntityId>
  assigned_resource?: SupportReference
  created_by?: Nullable<EntityId>
  creator?: Nullable<UserSummary>
  resolution_notes?: Nullable<string>
  internal_remarks?: Nullable<string>
  resolved_at?: Nullable<string>
  closed_at?: Nullable<string>
  created_at?: Nullable<string>
  updated_at?: Nullable<string>
  assignments?: SupportLogAssignment[]
}

export interface SupportLogPayload {
  issue_date: string
  initiated_by: string
  department_id: EntityId
  issue_types: EntityId[]
  item_type_id: EntityId
  description: string
  status: SupportStatus
  priority: SupportPriority
  assigned_to: EntityId | null
  resolution_notes: string | null
  internal_remarks: string | null
}

export interface SupportLogFilters {
  date_from?: string
  date_to?: string
  department_id?: EntityId
  issue_type_id?: EntityId
  item_type_id?: EntityId
  status?: SupportStatus | string
  priority?: SupportPriority | string
  assigned_to?: EntityId
  initiated_by?: string
  ticket_number?: string
  search?: string
  per_page?: number
  page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface Paginated<T> {
  data: T[]
  links?: {
    first?: Nullable<string>
    last?: Nullable<string>
    prev?: Nullable<string>
    next?: Nullable<string>
  }
  meta?: {
    current_page?: number
    last_page?: number
    from?: Nullable<number>
    to?: Nullable<number>
    total?: number
    per_page?: number
  }
}

export type ReportDatum = Record<string, unknown>

export interface ReportBreakdown {
  [key: string]: unknown
}

export interface SupportDashboardSummary {
  metrics?: Record<string, unknown>
  status_breakdown?: unknown
  priority_breakdown?: unknown
  issue_type_breakdown?: unknown
  item_breakdown?: unknown
  resource_breakdown?: unknown
  department_breakdown?: unknown
  recent_logs?: unknown
  open_workload?: unknown
  [key: string]: unknown
}

export type ReportSummary = SupportDashboardSummary

export interface FieldErrors {
  [field: string]: string[]
}

export interface AuthResponse {
  user: User
}

export interface ListParams {
  search?: string
  type?: string
  department_id?: EntityId
  user_id?: EntityId
  status?: string
  category?: string
  technical_personnel_id?: EntityId
  date_from?: string
  date_to?: string
  per_page?: number
  page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}
