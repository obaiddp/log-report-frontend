import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}