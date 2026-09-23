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

export const userRoleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'technician', label: 'Technician' },
  { value: 'user', label: 'User' },
] as const
