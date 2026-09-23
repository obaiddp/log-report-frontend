export type EntityId = number | string

export type Nullable<T> = T | null

export interface Department {
  id: EntityId
  name: string
  code?: Nullable<string>
  description?: Nullable<string>
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

export interface User {
  id: EntityId
  name: string
  email: string
  designation?: Nullable<string>
  department_id?: Nullable<EntityId>
  department?: Nullable<Pick<Department, 'id' | 'name'>>
  territory?: Nullable<string>
  status?: Nullable<string>
  role?: Nullable<string>
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

export interface ReportSummary {
  period?: unknown
  metrics?: Record<string, unknown>
  status_breakdown?: unknown
  asset_distribution?: unknown
  ram_usage_by_department?: unknown
  purchase_vs_repair?: unknown
  inspection_trend?: unknown
  technician_workload?: unknown
  [key: string]: unknown
}

export type FieldErrors = Record<string, string[]>

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
