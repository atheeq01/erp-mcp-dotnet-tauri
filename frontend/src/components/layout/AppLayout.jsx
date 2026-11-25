import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function AppLayout() {
    return (
        <div className="fixed inset-0 flex flex-col md:flex-row overflow-hidden bg-(--paper) text-(--ink)">
            <Sidebar />

            <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
