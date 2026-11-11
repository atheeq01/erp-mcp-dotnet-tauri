import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { useAuth } from "./hooks/useAuth";
import AppLayout from "./components/layout/AppLayout";
import Skeleton from "./components/common/Skeleton";

const Login = lazy(() => import("./pages/Login"));
const SetupAdmin = lazy(() => import("./pages/SetupAdmin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Orders = lazy(() => import("./pages/Orders"));
const Users = lazy(() => import("./pages/Users"));
const Chat = lazy(() => import("./pages/Chat"));

function RouteSkeleton() {
    return (
        <div className="p-6 space-y-4">
            <Skeleton height="32px" width="240px" />
            <Skeleton height="48px" width="100%" />
            <Skeleton height="260px" width="100%" />
        </div>
    );
}

function ProtectedRoute({ children, roles }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function PublicRoute({ children }) {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Suspense fallback={<RouteSkeleton />}>
            <Routes>
                <Route
                    path="/setup"
                    element={
                        <PublicRoute>
                            <SetupAdmin />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route
                        path="/inventory"
                        element={
                            <ProtectedRoute roles={["Admin", "Sales", "Store"]}>
                                <Inventory />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute roles={["Admin", "Sales"]}>
                                <Orders />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute roles={["Admin"]}>
                                <Users />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/chat"
                        element={
                            <ProtectedRoute roles={["Admin", "Sales", "Store"]}>
                                <Chat />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ChatProvider>
                    <AppRoutes />
                </ChatProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
