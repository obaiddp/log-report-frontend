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

export function canViewUserPerformance(user: UserLike): boolean {
  return hasPermission(user, "user_performance");
}