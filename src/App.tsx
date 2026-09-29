import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  return user ? <ProfilePage /> : <LoginPage />;
}