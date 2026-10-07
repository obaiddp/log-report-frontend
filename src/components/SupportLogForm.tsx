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
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) {
      return Object.values(err.errors).flat().join(" ");
    }
    return err.message;
  }
  return "Something went wrong";
}

type SupportLogFormProps = {
  onLogCreated: (log: SupportLog) => void;
  onCancel: () => void;
};

export default function SupportLogForm({ onLogCreated, onCancel }: SupportLogFormProps) {
  const { user: authUser } = useAuth();
  const [date, setDate] = useState(today);
  const [initiator, setInitiator] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [status, setStatus] = useState<SupportLogStatus | "">("indoor_repairing");
  const [selectedUser, setSelectedUser] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [departmentsResponse, itemsResponse, issuesResponse, usersResponse] =
          await Promise.all([getDepartments(), getItems(), getIssues(), getUsers()]);

        setDepartments(departmentsResponse.data);
        setItems(itemsResponse.data);
        setIssues(issuesResponse.data);
        setUsers(usersResponse.data);

        // Prefill assigned resource with the logged-in user (still editable).
        const viewer = usersResponse.data.find((u) => u.name === authUser?.name);
        if (viewer) {
          setSelectedUser(String(viewer.id));
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const errors: Record<string, string> = {};
    if (!date) errors.date = "Please select a date.";
    if (!initiator.trim()) errors.initiator = "Please enter who initiated the issue.";
    if (!selectedDepartment) errors.department = "Please select a department.";
    if (!selectedItem) errors.item = "Please select an item type.";
    if (selectedIssues.length === 0) errors.issues = "Select at least one issue type.";
    if (!status) errors.status = "Please select a status.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);

      const response = await createSupportLog({
        issue_date: date,
        initiated_by: initiator.trim(),
        department_id: Number(selectedDepartment),
        item_type_id: Number(selectedItem),
        issue_type_ids: selectedIssues,
        status: status as SupportLogStatus,
        issue_details: issueDetails.trim() || undefined,
        assigned_to: selectedUser ? Number(selectedUser) : undefined,
      });

      onLogCreated(response.data);

      // Reset the form for the next entry.
      setDate(today());
      setInitiator("");
      setSelectedDepartment("");
      setSelectedIssues([]);
      setSelectedItem("");
      setIssueDetails("");
      setStatus("indoor_repairing");
      setFieldErrors({});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="form-create-log" onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="log-date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <Input
            id="log-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.date && (
            <p className="text-xs text-destructive">{fieldErrors.date}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="log-initiator" className="text-sm font-medium text-foreground">
            Initiated by
          </label>
          <Input
            id="log-initiator"
            type="text"
            value={initiator}
            onChange={(e) => setInitiator(e.target.value)}
            placeholder="Enter person's name"
            disabled={submitting}
          />
          {fieldErrors.initiator && (
            <p className="text-xs text-destructive">{fieldErrors.initiator}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="log-department" className="text-sm font-medium text-foreground">
            Initiator department
          </label>
          <Select
            id="log-department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">
              {loading ? "Loading departments..." : "Select department"}
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          {fieldErrors.department && (
            <p className="text-xs text-destructive">{fieldErrors.department}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="log-item" className="text-sm font-medium text-foreground">
            Item type
          </label>
          <Select
            id="log-item"
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">{loading ? "Loading item types..." : "Select item type"}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          {fieldErrors.item && (
            <p className="text-xs text-destructive">{fieldErrors.item}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="log-status" className="text-sm font-medium text-foreground">
            Status
          </label>
          <Select
            id="log-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SupportLogStatus | "")}
            disabled={submitting}
          >
            <option value="">Select status</option>
            <option value="indoor_repairing">Indoor Repairing</option>
            <option value="outdoor_repairing">Outdoor Repairing</option>
            <option value="solved">Solved</option>
          </Select>
          {fieldErrors.status && (
            <p className="text-xs text-destructive">{fieldErrors.status}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="log-user" className="text-sm font-medium text-foreground">
            Worked by / technical resource
          </label>
          <Select
            id="log-user"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={loading || submitting}
          >
            <option value="">
              {loading ? "Loading users..." : "Select technical resource"}
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Issue types</span>
        <div className="flex flex-wrap gap-2">
          {issues.map((issue) => {
            const checked = selectedIssues.includes(issue.id);
            return (
              <label
                key={issue.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  checked
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  id={`issue-checkbox-${issue.id}`}
                  type="checkbox"
                  className="size-3.5 accent-[#78A03F]"
                  value={issue.id}
                  checked={checked}
                  onChange={(e) => {
                    const issueId = Number(e.target.value);
                    setSelectedIssues((previous) =>
                      e.target.checked
                        ? [...previous, issueId]
                        : previous.filter((id) => id !== issueId)
                    );
                  }}
                  disabled={loading || submitting}
                />
                {issue.name}
              </label>
            );
          })}
        </div>
        {fieldErrors.issues && (
          <p className="text-xs text-destructive">{fieldErrors.issues}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="log-description" className="text-sm font-medium text-foreground">
          Issue description
        </label>
        <textarea
          id="log-description"
          value={issueDetails}
          onChange={(e) => setIssueDetails(e.target.value)}
          placeholder="Describe the issue..."
          rows={4}
          disabled={submitting}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button id="btn-cancel-create" type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button id="btn-create-log" type="submit" disabled={loading || submitting}>
          {submitting ? "Creating..." : "Create support log"}
        </Button>
      </div>
    </form>
  );
}
