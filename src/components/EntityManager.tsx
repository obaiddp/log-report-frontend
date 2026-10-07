import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) return Object.values(err.errors).flat().join(" ");
    return err.message;
  }
  return "Something went wrong";
}

export type EntityField = {
  key: string;
  label: string;
  placeholder?: string;
};

type EntityManagerProps<T extends { id: number; name: string }> = {
  title: string;
  description: string;
  createLabel: string;
  fields: EntityField[];
  fetchAll: () => Promise<{ data: T[] }>;
  create: (values: Record<string, string>) => Promise<{ data: T }>;
  update: (id: number, name: string) => Promise<{ data: T }>;
  remove: (id: number) => Promise<unknown>;
  /** Extra columns rendered after the name column. */
  extraCell?: (item: T) => React.ReactNode;
  extraHeader?: string;
};

export default function EntityManager<T extends { id: number; name: string }>({
  title,
  description,
  createLabel,
  fields,
  fetchAll,
  create,
  update,
  remove,
  extraCell,
  extraHeader,
}: EntityManagerProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAll();
        setItems(res.data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await create(values);
      setItems((prev) => [...prev, res.data]);
      setValues({});
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUpdate = async (id: number) => {
    setError("");
    try {
      const res = await update(id, editName);
      setItems((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setError("");
    try {
      await remove(itemToDelete.id);
      setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card id={`entity-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
          {fields.map((field) => (
            <Input
              key={field.key}
              placeholder={field.placeholder ?? field.label}
              value={values[field.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              className="w-56"
              required
            />
          ))}
          <Button type="submit" size="sm">
            {createLabel}
          </Button>
        </form>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                {extraHeader && <TableHead>{extraHeader}</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={extraHeader ? 4 : 3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No entries yet. Add the first one above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-nums">{item.id}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-64"
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    {extraCell && <TableCell>{extraCell(item)}</TableCell>}
                    <TableCell className="space-x-2 text-right">
                      {editingId === item.id ? (
                        <>
                          <Button size="sm" onClick={() => handleUpdate(item.id)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditName(item.name);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setItemToDelete(item)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </p>
      </CardContent>

      <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent id={`dialog-delete-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          <DialogHeader>
            <DialogTitle>Delete {title.replace(/s$/, "").toLowerCase()}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{itemToDelete?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}