import { createContext, useEffect, useState } from "react";
import { getLocalSession, loginUser, logoutUser } from "../services/mcpService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        let active = true;
        getLocalSession()
            .then((session) => {
                if (active) setUser({ username: session.username, role: session.role });
            })
            .catch(() => {
                // A missing or expired desktop session leaves the operator signed out.
            })
            .finally(() => {
                if (active) setInitializing(false);
            });
        return () => { active = false; };
    }, []);

    async function login(username, password) {
        setLoading(true);

        try {
            const result = await loginUser(username, password);

            if (!result.success) {
                throw new Error(result.message || "Login failed");
            }

            const loggedInUser = {
                username: result.username,
                role: result.role,
            };

            setUser(loggedInUser);

            return loggedInUser;
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        try {
            await logoutUser();
        } finally {
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                initializing,
                login,
                logout,
                isAuthenticated: Boolean(user),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
