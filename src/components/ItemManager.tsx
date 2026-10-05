import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  type Item,
} from "../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) return Object.values(err.errors).flat().join(" ");
    return err.message;
  }

  return "Something went wrong";
}

export default function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getItems();
        setItems(res.data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await createItem(name);

      setItems((prev) => [...prev, res.data]);
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUpdate = async (id: number) => {
    setError("");

    try {
      const res = await updateItem(id, editName);

      setItems((prev) =>
        prev.map((item) => (item.id === id ? res.data : item))
      );

      setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this item?")) return;

    setError("");

    try {
      await deleteItem(id);

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section
      style={{
        padding: 20,
        backgroundColor: "#e0e0e0",
        borderRadius: 5,
      }}
    >
      <h2>Items</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <input
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <button type="submit">Add</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                <td>
                  {editingId === item.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    item.name
                  )}
                </td>

                <td>
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => handleUpdate(item.id)}>
                        Save
                      </button>

                      <button onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditName(item.name);
                        }}
                      >
                        Edit
                      </button>

                      <button onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}