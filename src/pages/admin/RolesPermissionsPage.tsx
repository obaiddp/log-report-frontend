import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  getPermissions,
  getRolePermissions,
  getRoles,
  updateRolePermissions,
  type Permission,
  type Role,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function formatName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) return Object.values(err.errors).flat().join(" ");
    return err.message;
  }
  return "Something went wrong";
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [lastLoadedIds, setLastLoadedIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // Incremented per role-fetch so stale responses are ignored.
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [rolesResponse, permissionsResponse] = await Promise.all([
          getRoles(),
          getPermissions(),
        ]);

        if (cancelled) return;

        setRoles(rolesResponse.data);
        setPermissions(permissionsResponse.data);

        if (rolesResponse.data.length > 0) {
          setSelectedRoleId(rolesResponse.data[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedRoleId === null) return;

    const requestId = ++requestIdRef.current;

    async function loadRolePermissions() {
      try {
        setLoadingPermissions(true);
        setError("");
        setNotice("");

        const response = await getRolePermissions(selectedRoleId as number);

        // Ignore responses for a previously selected role.
        if (requestId !== requestIdRef.current) return;

        const ids = response.data.map((p) => p.id);
        setCheckedIds(new Set(ids));
        setLastLoadedIds(new Set(ids));
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(errorMessage(err));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingPermissions(false);
        }
      }
    }

    loadRolePermissions();
  }, [selectedRoleId]);

  const unsavedChanges = useMemo(() => {
    if (checkedIds.size !== lastLoadedIds.size) return true;
    for (const id of checkedIds) {
      if (!lastLoadedIds.has(id)) return true;
    }
    return false;
  }, [checkedIds, lastLoadedIds]);

  function handleRoleChange(roleId: number) {
    if (roleId === selectedRoleId) return;

    if (unsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Switch roles and discard them?"
      );
      if (!confirmed) return;
    }

    setSelectedRoleId(roleId);
  }

  function togglePermission(id: number, checked: boolean) {
    setNotice("");
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleSave() {
    if (selectedRoleId === null) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await updateRolePermissions(selectedRoleId, Array.from(checkedIds));

      setLastLoadedIds(new Set(checkedIds));
      setNotice("Permissions saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && roles.length === 0) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <Card id="roles-permissions-page">
      <CardHeader>
        <CardTitle className="text-base">Roles & Permissions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a role and control which permissions it has.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="role-select" className="text-sm font-medium text-foreground">
            Role
          </label>
          <Select
            id="role-select"
            className="w-full sm:w-72"
            value={selectedRoleId ?? ""}
            onChange={(e) => handleRoleChange(Number(e.target.value))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {formatName(role.name)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Permissions</h3>

          {error && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {notice && (
            <p className="mt-3 rounded-md bg-status-solved-bg px-3 py-2 text-sm text-status-solved-text">
              {notice}
            </p>
          )}

          <div className="mt-3 space-y-1">
            {loadingPermissions ? (
              <>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : (
              permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <input
                    id={`permission-${permission.name}`}
                    type="checkbox"
                    className="size-4 accent-[#78A03F]"
                    checked={checkedIds.has(permission.id)}
                    onChange={(e) => togglePermission(permission.id, e.target.checked)}
                  />
                  <span>
                    {formatName(permission.name)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {permission.name}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {unsavedChanges && !loadingPermissions && (
            <p className="text-xs text-muted-foreground">Unsaved changes</p>
          )}
          <Button
            id="btn-save-permissions"
            onClick={handleSave}
            disabled={saving || loadingPermissions || !unsavedChanges}
          >
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
