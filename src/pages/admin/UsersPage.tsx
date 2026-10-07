import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import {
  ApiError,
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
  type Role,
  type User,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type FormState = {
  name: string;
  email: string;
  password: string;
  designation: string;
  role_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  designation: "",
  role_id: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [usersResponse, rolesResponse] = await Promise.all([
          getUsers(),
          getRoles(),
        ]);
        if (cancelled) return;
        setUsers(usersResponse.data);
        setRoles(rolesResponse.data);
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

  function roleName(roleId: number): string {
    const role = roles.find((r) => r.id === roleId);
    return role ? formatName(role.name) : `Role #${roleId}`;
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(user: User) {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      designation: user.designation ?? "",
      role_id: String(user.role_id),
    });
    setFormError("");
    setEditingUser(user);
  }

  async function handleCreate() {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("Name is required.");
    if (!form.email.trim()) errors.push("Email is required.");
    if (!form.password.trim()) errors.push("Password is required.");
    if (!form.designation.trim()) errors.push("Designation is required.");
    if (!form.role_id) errors.push("Role is required.");

    if (errors.length > 0) {
      setFormError(errors.join(" "));
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      const response = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        designation: form.designation.trim(),
        role_id: Number(form.role_id),
      });
      setUsers((prev) => [...prev, response.data]);
      setCreateOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingUser) return;

    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.designation.trim()) {
      setFormError("Designation is required.");
      return;
    }
    if (!form.role_id) {
      setFormError("Role is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      const response = await updateUser(editingUser.id, {
        name: form.name.trim(),
        designation: form.designation.trim(),
        role_id: Number(form.role_id),
        password: form.password.trim() ? form.password : undefined,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? response.data : u))
      );
      setEditingUser(null);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      await deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card id="users-page">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Users</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create, edit, and remove user accounts.
            </p>
          </div>
          <Button id="btn-new-user" size="sm" onClick={openCreate}>
            <Plus className="size-4" /> New User
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table id="users-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} id={`user-row-${user.id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.designation ?? "—"}</TableCell>
                    <TableCell>{roleName(user.role_id)}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        id={`btn-edit-user-${user.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        id={`btn-delete-user-${user.id}`}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent id="dialog-create-user">
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>Create a new account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="create-name" className="text-sm font-medium">Name</label>
              <Input id="create-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-email" className="text-sm font-medium">Email</label>
              <Input id="create-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-password" className="text-sm font-medium">Password</label>
              <Input id="create-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-designation" className="text-sm font-medium">Designation</label>
              <Input id="create-designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Developer" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-role" className="text-sm font-medium">Role</label>
              <Select id="create-role" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatName(role.name)}
                  </option>
                ))}
              </Select>
            </div>
            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button id="btn-create-user" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent id="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update account details. Email cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
              <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-designation" className="text-sm font-medium">Designation</label>
              <Input id="edit-designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-role" className="text-sm font-medium">Role</label>
              <Select id="edit-role" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatName(role.name)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-password" className="text-sm font-medium">New password (optional)</label>
              <Input id="edit-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
            </div>
            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={submitting}>Cancel</Button>
            <Button id="btn-save-user" onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent id="dialog-delete-user">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{userToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={deleting}>Cancel</Button>
            <Button id="btn-confirm-delete-user" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
