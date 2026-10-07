type UserLike = {
  role?: {
    name: string;
    permissions: { name: string }[];
  };
} | null;

export function hasPermission(user: UserLike, name: string): boolean {
  return user?.role?.permissions.some((p) => p.name === name) ?? false;
}

export function hasAnyPermission(user: UserLike, names: string[]): boolean {
  return names.some((name) => hasPermission(user, name));
}

/** Full access to the organisation-wide dashboard and all logs. */
export function canViewAllLogs(user: UserLike): boolean {
  return (
    hasPermission(user, "view_reports") ||
    hasAnyPermission(user, [
      "manage_departments",
      "manage_item_types",
      "manage_issue_types",
      "manage_users",
    ])
  );
}

export function canCreateLogs(user: UserLike): boolean {
  return hasPermission(user, "create_support_logs");
}

export function canUpdateLogs(user: UserLike): boolean {
  return canViewAllLogs(user) || hasPermission(user, "update_own_support_logs");
}

/**
 * Deleting logs has no dedicated permission in the backend yet — only the
 * seeded `admin` role gets it for now. Add a `delete_support_logs`
 * permission server-side and key off it here.
 */
export function canDeleteLogs(user: UserLike): boolean {
  return user?.role?.name === "admin";
}


export function canViewUserPerformance(user: UserLike): boolean {
  return hasPermission(user, "user_performance");
}