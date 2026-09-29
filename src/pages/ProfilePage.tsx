import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <main className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div>
            <h1>My Profile</h1>
            <p>Authenticated user information</p>
          </div>

          <button onClick={logout}>Logout</button>
        </div>

        <div className="profile-info">
          <div>
            <span>Name</span>
            <strong>{user.name}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div>
            <span>Designation</span>
            <strong>{user.designation || "—"}</strong>
          </div>

          <div>
            <span>Role</span>
            <strong>{user.role?.name || "—"}</strong>
          </div>

          <div>
            <span>Email Verified</span>
            <strong>
              {user.email_verified_at ? "Yes" : "No"}
            </strong>
          </div>
        </div>

        {user.role?.permissions && (
          <section className="permissions">
            <h2>Permissions</h2>

            <ul>
              {user.role.permissions.map((permission) => (
                <li key={permission.id}>{permission.name}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}