import { useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  createSupportLog,
  getDepartments,
  getItems,
  getIssues,
  getUsers,
  type Department,
  type Issue,
  type Item,
  type User,
  type SupportLog,
  type SupportLogStatus,
} from "../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) {
      return Object.values(err.errors).flat().join(" ");
    }

    return err.message;
  }

  return "Something went wrong";
}

type LogReportManagerProps = {
  onLogCreated: (log: SupportLog) => void;
};

export default function LogReportManager({onLogCreated, }: LogReportManagerProps) {
  // Form fields
  const [date, setDate] = useState("");
  const [initiator, setInitiator] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [status, setStatus] = useState<SupportLogStatus | "">("");
  const [selectedUser, setSelectedUser] = useState("");

  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load dropdown data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          departmentsResponse,
          itemsResponse,
          issuesResponse,
          usersResponse,
        ] = await Promise.all([
          getDepartments(),
          getItems(),
          getIssues(),
          getUsers(),
        ]);

        setDepartments(departmentsResponse.data);
        setItems(itemsResponse.data);
        setIssues(issuesResponse.data);
        setUsers(usersResponse.data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Frontend validation
    if (!date) {
      setError("Please select a date.");
      return;
    }

    if (!initiator.trim()) {
      setError("Please enter who initiated the issue.");
      return;
    }

    if (!selectedDepartment) {
      setError("Please select a department.");
      return;
    }

    if (!selectedItem) {
      setError("Please select an item type.");
      return;
    }

    if (selectedIssues.length === 0) {
      setError("Please select at least one issue type.");
      return;
    }

    if (!status) {
      setError("Please select a status.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await createSupportLog({
        issue_date: date,
        initiated_by: initiator.trim(),
        department_id: Number(selectedDepartment),
        item_type_id: Number(selectedItem),
        issue_type_ids: selectedIssues,
        status,
        issue_details: issueDetails.trim() || undefined,
        assigned_to: selectedUser
          ? Number(selectedUser)
          : undefined,
      });

      onLogCreated(response.data);

      setSuccess(
        `Support log created successfully. Ticket: ${response.data.ticket_number}`
      );

      // Reset form
      setDate("");
      setInitiator("");
      setSelectedDepartment("");
      setSelectedIssues([]);
      setSelectedItem("");
      setIssueDetails("");
      setStatus("");
      setSelectedUser("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="log-report-manager"
      style={{
        padding: "20px",
        backgroundColor: "#e0e0e0",
        borderRadius: "5px",
        marginBottom: "20px",
      }}
    >
      <h2>Create Support Log</h2>

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#ffdede",
            color: "#b00020",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#dff6df",
            color: "#176b17",
            borderRadius: "4px",
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Date */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-date">Date:</label>
          <br />

          <input
            type="date"
            id="log-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Initiated By */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-initiator">Initiated by:</label>
          <br />

          <input
            type="text"
            id="log-initiator"
            value={initiator}
            onChange={(e) => setInitiator(e.target.value)}
            placeholder="Enter person's name"
            disabled={submitting}
          />
        </div>

        {/* Department */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-department">
            Initiator Department:
          </label>
          <br />

          <select
            id="log-department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">
              {loading
                ? "Loading departments..."
                : "-- Select Department --"}
            </option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* Issue Types */}
<div style={{ marginBottom: "15px" }}>
  <label>
    Issue Type:
  </label>

  <div
    style={{
      display: "flex",
      gap: "15px",
      marginTop: "8px",
      flexWrap: "wrap",
    }}
  >
    {issues.map((issue) => (
      <label
        key={issue.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          value={issue.id}
          checked={selectedIssues.includes(issue.id)}
          onChange={(e) => {
            const issueId = Number(e.target.value);

            if (e.target.checked) {
              setSelectedIssues((previous) => [
                ...previous,
                issueId,
              ]);
            } else {
              setSelectedIssues((previous) =>
                previous.filter((id) => id !== issueId)
              );
            }
          }}
          disabled={loading || submitting}
        />

        <span>{issue.name}</span>
      </label>
    ))}
  </div>
</div>
        {/* <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-issues">
            Issue Type:
          </label>
          <br />

          <select
            id="log-issues"
            multiple
            value={selectedIssues.map(String)}
            onChange={handleIssueChange}
            disabled={loading || submitting}
            style={{
              minWidth: "220px",
              minHeight: "100px",
            }}
          >
            {issues.map((issue) => (
              <option
                key={issue.id}
                value={issue.id}
              >
                {issue.name}
              </option>
            ))}
          </select>

          <small
            style={{
              display: "block",
              marginTop: "5px",
            }}
          >
            Hold Ctrl and select multiple issue types.
          </small>
        </div> */}

        {/* Item */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-item">
            Item Type:
          </label>
          <br />

          <select
            id="log-item"
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">
              {loading
                ? "Loading item types..."
                : "-- Select Item Type --"}
            </option>

            {items.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Issue Details */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-description">
            Issue Description:
          </label>
          <br />

          <textarea
            id="log-description"
            value={issueDetails}
            onChange={(e) => setIssueDetails(e.target.value)}
            placeholder="Describe the issue..."
            rows={5}
            disabled={submitting}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-status">
            Status:
          </label>
          <br />

          <select
            id="log-status"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as SupportLogStatus | ""
              )
            }
            disabled={submitting}
          >
            <option value="">
              -- Select Status --
            </option>

            <option value="indoor_repairing">
              Indoor Repairing
            </option>

            <option value="outdoor_repairing">
              Outdoor Repairing
            </option>

            <option value="solved">
              Solved
            </option>
          </select>
        </div>

        {/* Technical Resource */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="log-user">
            Worked By / Technical Resource:
          </label>
          <br />

          <select
            id="log-user"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">
              {loading
                ? "Loading users..."
                : "-- Select Technical Resource --"}
            </option>

            {users.map((user) => (
              <option
                key={user.id}
                value={user.id}
              >
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || submitting}
        >
          {submitting
            ? "Creating..."
            : "Create Support Log"}
        </button>
      </form>
    </section>
  );
}