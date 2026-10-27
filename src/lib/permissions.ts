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

/**
 * Sees every support log, not just the ones they created or are assigned to.
 * Backed by the view_all_support_logs permission (super_admin, ict_manager).
 */
export function canViewAllLogs(user: UserLike): boolean {
  return hasPermission(user, "view_all_support_logs");
}

/** May delete support logs. Backed by the delete_support_logs permission. */
export function canDeleteLogs(user: UserLike): boolean {
  return hasPermission(user, "delete_support_logs");
}

export function canViewUserPerformance(user: UserLike): boolean {
  return hasPermission(user, "user_performance");
}