import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const items = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Designation", value: user.designation || "—" },
    { label: "Role", value: user.role?.name || "—" },
    {
      label: "Email Verified",
      value: user.email_verified_at ? "Yes" : "No",
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your account details and permissions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {user.role?.permissions && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.role.permissions.map((permission) => (
              <span
                key={permission.id}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
              >
                {permission.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
