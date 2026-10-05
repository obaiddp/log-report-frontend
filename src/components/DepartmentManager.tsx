import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from "../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) return Object.values(err.errors).flat().join(" ");
    return err.message;
  }
  return "Something went wrong";
}

export default function DepartmentManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getDepartments();
        setDepartments(res.data);
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
      const res = await createDepartment(name, code);
      setDepartments((prev) => [...prev, res.data]);
      setName("");
      setCode("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUpdate = async (id: number) => {
    setError("");
    try {
      const res = await updateDepartment(id, editName);
      setDepartments((prev) => prev.map((d) => (d.id === id ? res.data : d)));
      setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this department?")) return;
    setError("");
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section style={{ padding: 20, backgroundColor: "#e0e0e0", borderRadius: 5 }}>
      <h2>Departments</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} required />
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
              <th>Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>
                  {editingId === d.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    d.name
                  )}
                </td>
                <td>{d.code}</td>
                <td>
                  {editingId === d.id ? (
                    <>
                      <button onClick={() => handleUpdate(d.id)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(d.id);
                          setEditName(d.name);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(d.id)}>Delete</button>
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