import {createContext, useContext, useEffect, useState, type ReactNode} from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../lib/api";

type User = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    role_id: number;
    designation: string | null;
    role?: {
        id: number;
        name: string;
        permissions: {
            id: number;
            name: string;
        }[];
    };
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    

    useEffect(() => {
    getMe()
        .then((response) => setUser(extractUser(response)))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }, []);

    async function login(email: string, password: string) {
    await apiLogin(email, password);
    const response = await getMe();
    const me = extractUser(response);

    if (!me) {
        throw new Error("Logged in, but could not load user profile.");
    }

    setUser(me);
    }

    async function logout() {
        await apiLogout();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

function extractUser(response: any): User | null {

    console.log("Extracting user from response:", response);

  return (
    response?.auth_user ??
    response?.data?.user ??
    response?.data ??
    response?.user ??
    (response?.id ? response : null)
  );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}