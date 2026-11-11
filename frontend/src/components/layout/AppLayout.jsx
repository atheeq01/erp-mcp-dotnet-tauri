import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function AppLayout() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
            <Sidebar />

            <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
