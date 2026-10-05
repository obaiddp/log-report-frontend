import {
  ClipboardList,
  LayoutDashboard,
  Tags,
  User,
  Building2,
  Package,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** If set, the item is only shown when the user has this permission. */
  permission?: string;
};

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/support-logs", label: "Support Logs", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
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
];

export function filterNavItems(
  items: NavItem[],
  permissionNames: string[]
): NavItem[] {
  return items.filter(
    (item) => !item.permission || permissionNames.includes(item.permission)
  );
}
