import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Building2,
  Package,
  Tags,
  Users,
  Settings,
} from "lucide-react";


export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** If set, the item is only shown when the user has this permission. */
  permission?: string;
};

export const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "manage_dashboard",
  },
  {
    to: "/support-logs",
    label: "Support Logs",
    icon: ClipboardList,
    permission: "manage_support_logs",
  },
  {
    to: "/asset-inspections",
    label: "Asset Inspections",
    icon: ClipboardCheck,
    permission: "manage_asset_inspections",
  },
];

export const settingsNavItems = [
  {
    to: "/admin/departments",
    label: "Departments",
    icon: Building2,
    permission: "manage_departments",
  },
  {
    to: "/admin/items",
    label: "Item Types",
    icon: Package,
    permission: "manage_item_types",
  },
  {
    to: "/admin/issues",
    label: "Issue Types",
    icon: Tags,
    permission: "manage_issue_types",
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    permission: "manage_users",
  },
  {
    to: "/admin/roles",
    label: "Roles and Permissions",
    icon: Users,
    permission: "manage_role_permissions",
  },
];


export function filterNavItems(
  items: NavItem[],
  permissionNames: string[]
): NavItem[] {
  return items.filter(
    (item) => !item.permission || permissionNames.includes(item.permission)
  );
}
