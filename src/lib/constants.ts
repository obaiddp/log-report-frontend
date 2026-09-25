export const assetTypeOptions = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'printer', label: 'Printer' },
  { value: 'projector', label: 'Projector' },
  { value: 'computer', label: 'Computer' },
  { value: 'it_support_equipment', label: 'IT Support Equipment' },
] as const

export const inspectionStatusOptions = [
  { value: 'sold', label: 'Sold' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'indoor_repair', label: 'Indoor Repair' },
  { value: 'outdoor_repair', label: 'Outdoor Repair' },
] as const

export const inspectionCategoryOptions = [
  { value: 'new_purchase', label: 'New Purchase' },
  { value: 'repair', label: 'Repair' },
] as const

export const repairSubCategoryOptions = [
  { value: 'in_house', label: 'In-house' },
  { value: 'out_house', label: 'Out-house' },
] as const

export const userStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

/** Canonical support-log statuses. Keep these values aligned with the API. */
export const supportStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'indoor_repair', label: 'Indoor Repair' },
  { value: 'outdoor_repair', label: 'Outdoor Repair' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const supportPriorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

/** The only roles used by the support console navigation and admin gates. */
export const userRoleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'technical_resource', label: 'Technical Resource' },
] as const

export const supportRoleLabel = 'Technical Resource'

export const supportTicketSortOptions = [
  { value: 'issue_date', label: 'Issue date' },
  { value: 'created_at', label: 'Created date' },
  { value: 'ticket_number', label: 'Ticket number' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
] as const
