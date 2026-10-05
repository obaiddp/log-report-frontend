import { useAuth } from "../context/AuthContext";

import {
  ApiError,
  getSupportLogs,
  updateSupportLogStatus,
  deleteSupportLog,
  type SupportLog,
  type SupportLogStatus,
} from "../lib/api";

import { useEffect, useState } from "react";

import DepartmentManager from "../components/DepartmentManager";
import ItemManager from "../components/ItemManager";
import IssueManager from "../components/IssueManager";
import LogReportManager from "../components/LogReportManager";


const STATUS_CONFIG: Record<
  SupportLogStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  indoor_repairing: {
    label: "Indoor Repairing",
    bg: "#FEF3C7",
    color: "#92400E",
    border: "#FCD34D",
  },
  outdoor_repairing: {
    label: "Outdoor Repairing",
    bg: "#DBEAFE",
    color: "#1E40AF",
    border: "#93C5FD",
  },
  solved: {
    label: "Solved",
    bg: "#D1FAE5",
    color: "#065F46",
    border: "#6EE7B7",
  },
};

const getStatusSelectStyle = (status: SupportLogStatus): React.CSSProperties => {
  const cfg = STATUS_CONFIG[status];
  return {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: cfg.bg,
    color: cfg.color,
    border: `1px solid ${cfg.border}`,
    borderRadius: "999px",
    padding: "6px 30px 6px 12px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
    minWidth: "150px",
    // custom dropdown arrow
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
  };
};


function formatStatus(status: string): string {
  switch (status) {
    case "indoor_repairing":
      return "Indoor Repairing";

    case "outdoor_repairing":
      return "Outdoor Repairing";

    case "solved":
      return "Solved";

    default:
      return status;
  }
}

const tableHeaderStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left",
  backgroundColor: "#f5f5f5",
};

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px",
  verticalAlign: "top",
};

export default function Dashboard() {
    const { user, logout } = useAuth();

    const [supportLogs, setSupportLogs] = useState<SupportLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");

    useEffect(() => {
        async function loadSupportLogs() {
            try {
            setLogsLoading(true);
            setLogsError("");

            const response = await getSupportLogs();

            setSupportLogs(response.data);
            } catch (err) {
            if (err instanceof ApiError) {
                setLogsError(err.message);
            } else {
                setLogsError("Failed to load support logs.");
            }
            } finally {
            setLogsLoading(false);
            }
        }

        loadSupportLogs();
    }, []);

    function handleExport() {
  if (filteredLogs.length === 0) {
    alert("No support logs to export.");
    return;
  }

  const headers = [
    "Ticket",
    "Date",
    "Initiated By",
    "Department",
    "Item",
    "Issue Type",
    "Description",
    "Status",
    "Worked By",
  ];

  const rows = filteredLogs.map((log) => [
    log.ticket_number,
    log.issue_date.split("T")[0],
    log.initiated_by,
    log.department?.name ?? "",
    log.item_type?.name ?? "",
    log.issue_types
      ?.map((issue) => issue.name)
      .join(", ") ?? "",
    log.issue_details ?? "",
    formatStatus(log.status),
    log.assigned_resource?.name ?? "",
  ]);

  const csv = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "support-logs.csv";
  link.click();

  URL.revokeObjectURL(url);
}

    async function handleStatusChange(
  id: number,
  status: SupportLogStatus
) {
  try {
    const response = await updateSupportLogStatus(id, status);

    setSupportLogs((previousLogs) =>
      previousLogs.map((log) =>
        log.id === id ? response.data : log
      )
    );
  } catch (err) {
    setLogsError(
      err instanceof ApiError
        ? err.message
        : "Failed to update status."
    );
  }
}

async function handleDelete(id: number) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this support log?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteSupportLog(id);

    setSupportLogs((previousLogs) =>
      previousLogs.filter((log) => log.id !== id)
    );
  } catch (err) {
    setLogsError(
      err instanceof ApiError
        ? err.message
        : "Failed to delete support log."
    );
  }
}

    const handleLogCreated = (newLog: SupportLog) => {
        setSupportLogs((previousLogs) => [
            newLog,
            ...previousLogs,
        ]);
    };


    const filteredLogs = supportLogs.filter((log) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
            log.ticket_number.toLowerCase().includes(searchText) ||
            log.initiated_by.toLowerCase().includes(searchText) ||
            log.issue_details?.toLowerCase().includes(searchText) ||
            log.assigned_resource?.name
            ?.toLowerCase()
            .includes(searchText);

        const matchesStatus =
            !statusFilter || log.status === statusFilter;

        const matchesDepartment =
            !departmentFilter ||
            String(log.department_id) === departmentFilter;

        return (
            matchesSearch &&
            matchesStatus &&
            matchesDepartment
        );
    });
        
    if (!user) {
        return null;
    }

    const canManageDepartments = user.role?.permissions.some(
        (p) => p.name === "manage_departments"
    );

    const canManageItems = user.role?.permissions.some(
        (p) => p.name === "manage_item_types"
    );

    const canManageIssues = user.role?.permissions.some(
        (p) => p.name === "manage_issue_types"
    );

  return (
    <main className="dashboard-page">

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f0f0f0", padding: "10px", borderBottom: "1px solid #ccc" }}>
            <h1>Welcome to the Dashboard</h1>

            <button onClick={logout}>
                Logout
            </button>
        </header>
        

        <div className="main">

            <div className="intro" style={{ padding: "20px", backgroundColor: "#e0e0e0", borderRadius: "5px", marginBottom: "20px"}}>
                <p>Hello, {user.name}!</p>
                <p>Designation: {user.designation}</p>
                <p>Role: {user.role ? user.role.name : "No role assigned"}</p>
                <p>Permissions: {user.role ? user.role.permissions.map(p => p.name).join(", ") : "No permissions assigned"}</p>
                <p>Email: {user.email}</p>
                <p>Email Verified At: {user.email_verified_at ? new Date(user.email_verified_at).toLocaleString() : "Not verified"}</p>
            </div>


            <div className="form-div">
                <p>This is the form section</p>
            </div>

            {/* <LogReportManager /> */}
            <LogReportManager onLogCreated={handleLogCreated} />

            {/* Support Logs Table */}
<div
  className="support-logs"
  style={{
    padding: "20px",
    backgroundColor: "#e0e0e0",
    borderRadius: "5px",
    marginBottom: "20px",
  }}
>
  <h2>Support Logs</h2>

  {/* Filters */}
  <div
    style={{
      display: "flex",
      gap: "10px",
      marginBottom: "20px",
      flexWrap: "wrap",
    }}
  >
    {/* Search */}
    <input
      type="text"
      placeholder="Search ticket, initiator, issue..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    {/* Status filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
    >
      <option value="">All Statuses</option>
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

    {/* Department filter */}
    <select
      value={departmentFilter}
      onChange={(e) =>
        setDepartmentFilter(e.target.value)
      }
    >
      <option value="">All Departments</option>

      {Array.from(
        new Map(
          supportLogs.map((log) => [
            log.department_id,
            log.department,
          ])
        ).values()
      ).map((department) =>
        department ? (
          <option
            key={department.id}
            value={department.id}
          >
            {department.name}
          </option>
        ) : null
      )}
    </select>

    {/* Clear filters */}
    <button
      type="button"
      onClick={() => {
        setSearch("");
        setStatusFilter("");
        setDepartmentFilter("");
      }}
    >
      Clear Filters
    </button>
  </div>

  <button
  type="button"
  onClick={handleExport}
>
  Export CSV
</button>

  {/* Loading */}
  {logsLoading && (
    <p>Loading support logs...</p>
  )}

  {/* Error */}
  {logsError && (
    <p style={{ color: "red" }}>
      {logsError}
    </p>
  )}

  {/* Table */}
  {!logsLoading && !logsError && (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "white",
        }}
      >
        <thead>
          <tr>
            <th style={tableHeaderStyle}>Ticket</th>
            <th style={tableHeaderStyle}>Date</th>
            <th style={tableHeaderStyle}>Initiated By</th>
            <th style={tableHeaderStyle}>Department</th>
            <th style={tableHeaderStyle}>Item</th>
            <th style={tableHeaderStyle}>Issue Type</th>
            <th style={tableHeaderStyle}>Description</th>
            <th style={tableHeaderStyle}>Status</th>
            <th style={tableHeaderStyle}>Worked By</th>
            <th style={tableHeaderStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredLogs.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                No support logs found.
              </td>
            </tr>
          ) : (
            filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={tableCellStyle}>
                  {log.ticket_number}
                </td>

                <td style={tableCellStyle}>
                  {log.issue_date}
                </td>

                <td style={tableCellStyle}>
                  {log.initiated_by}
                </td>

                <td style={tableCellStyle}>
                  {log.department?.name ?? "-"}
                </td>

                <td style={tableCellStyle}>
                  {log.item_type?.name ?? "-"}
                </td>

                <td style={tableCellStyle}>
                  {log.issue_types
                    ?.map((issue) => issue.name)
                    .join(", ") || "-"}
                </td>

                <td style={tableCellStyle}>
                  {log.issue_details || "-"}
                </td>

                {/* <td style={tableCellStyle}>
                  {formatStatus(log.status)}
                </td> */}

                {/* Status column: colored dropdown */}
        <td style={tableCellStyle}>
          <select
            value={log.status}
            onChange={(e) =>
              handleStatusChange(
                log.id,
                e.target.value as SupportLogStatus
              )
            }
            style={getStatusSelectStyle(log.status)}
          >
            {(Object.keys(STATUS_CONFIG) as SupportLogStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </td>
                

                <td style={tableCellStyle}>
                  {log.assigned_resource?.name ?? "-"}
                </td>

                <td style={tableCellStyle}>
              

  <button
    type="button"
    onClick={() => handleDelete(log.id)}
    style={{ marginLeft: "8px" }}
  >
    Delete
  </button>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )}

  {/* Result count */}
  {!logsLoading && (
    <p style={{ marginTop: "10px" }}>
      Showing {filteredLogs.length} of{" "}
      {supportLogs.length} support logs
    </p>
  )}
</div>


            {/* Department CRUD only for admin goes here */}
            <div className="department-div">
                {canManageDepartments && <DepartmentManager />}
            </div>

            {/* Item CRUD only for admin goes here */}
            <div className="item-div">
                {canManageItems && <ItemManager />}
            </div>

            {/* Issue CRUD only for admin goes here */}
            <div className="issue-div">
                {canManageIssues && <IssueManager />}
            </div>

        </div>

    </main>
  );
}

{/* <select
                  value={log.status}
                  onChange={(e) =>
                    handleStatusChange(
                      log.id,
                      e.target.value as SupportLogStatus
                    )
                  } 
                >
    <option value="indoor_repairing">
      Indoor Repairing
    </option>

    <option value="outdoor_repairing">
      Outdoor Repairing
    </option>

    <option value="solved">
      Solved
    </option>
  </select> */}