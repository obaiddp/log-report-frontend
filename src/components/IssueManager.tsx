import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  type Issue,
} from "../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) return Object.values(err.errors).flat().join(" ");
    return err.message;
  }

  return "Something went wrong";
}

export default function IssueManager() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getIssues();
        setIssues(res.data);
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
      const res = await createIssue(name);

      setIssues((prev) => [...prev, res.data]);
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUpdate = async (id: number) => {
    setError("");

    try {
      const res = await updateIssue(id, editName);

      setIssues((prev) =>
        prev.map((issue) => (issue.id === id ? res.data : issue))
      );

      setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this issue?")) return;

    setError("");

    try {
      await deleteIssue(id);

      setIssues((prev) => prev.filter((issue) => issue.id !== id));
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
      <h2>Issues</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <input
          placeholder="Issue name"
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
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>{issue.id}</td>

                <td>
                  {editingId === issue.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    issue.name
                  )}
                </td>

                <td>
                  {editingId === issue.id ? (
                    <>
                      <button onClick={() => handleUpdate(issue.id)}>
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
                          setEditingId(issue.id);
                          setEditName(issue.name);
                        }}
                      >
                        Edit
                      </button>

                      <button onClick={() => handleDelete(issue.id)}>
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