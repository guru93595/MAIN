import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Database, Settings,
    LogOut, Menu, Shield, Activity, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import Navbar from '../components/Navbar';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: 'Customers', path: '/superadmin/customers', icon: Users },
        { name: 'Regions & Zones', path: '/superadmin/regions', icon: Database },
        { name: 'System Config', path: '/superadmin/config', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                {/* ─── LEFT SIDEBAR ─── */}
                <aside
                    className={`
                        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        lg:relative lg:translate-x-0
                    `}
                >
                    {/* Logo Area */}
                    <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                            <Shield size={18} className="text-white" />
                        </div>
                        <div className="overflow-hidden">
                            <h1 className="text-base font-bold text-slate-800 tracking-wide">
                                {user?.role === 'distributor' ? 'PARTNER PORTAL' : 'SUPER ADMIN'}
                            </h1>
                            <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider truncate">
                                {user?.role === 'superadmin' ? 'Global Command' : 'Territory Manager'}
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="p-4 space-y-1">
                        {navItems.map(item => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                                    `}
                                >
                                    <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'} />
                                    {item.name}
                                    {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Profile */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-slate-200">
                                <span className="text-xs font-bold text-blue-600">{user?.displayName?.[0]}</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-slate-700 truncate">{user?.displayName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
                        >
                            <LogOut size={14} /> EXIT CONSOLE
                        </button>
                    </div>
                </aside>

                {/* ─── MAIN CONTENT ─── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile Header */}
                    <header className="h-16 lg:hidden flex items-center justify-between px-4 bg-white border-b border-slate-200">
                        <button onClick={() => setSidebarOpen(true)} className="text-slate-500">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-slate-800">Admin Console</span>
                        <div className="w-6" /> {/* Spacer */}
                    </header>

                    {/* Backdrop for mobile */}
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
                        <Outlet />
                    </main>
                </div>

                {/* ─── RIGHT AUDIT SIDEBAR (Desktop Only) ─── */}
                <aside className="hidden xl:flex w-80 bg-white border-l border-slate-200 flex-col">
                    <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-blue-600" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Audit Trail</span>
                        </div>
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] text-slate-400 cursor-pointer hover:text-blue-600 hover:bg-blue-50">
                            <Activity size={12} />
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Placeholder Audit Items - will be replaced by real data later */}
                        <div className="relative pl-4 border-l-2 border-slate-100 ml-1">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
                            <p className="text-[11px] text-slate-400 mb-0.5">Just now</p>
                            <p className="text-xs text-slate-600">Admin <strong>John</strong> viewed <strong>Bangalore Zone</strong></p>
                        </div>
                        <div className="relative pl-4 border-l-2 border-slate-100 ml-1">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-green-500 ring-4 ring-white" />
                            <p className="text-[11px] text-slate-400 mb-0.5">10 mins ago</p>
                            <p className="text-xs text-slate-600">System provisioning completed for node <strong>OHT-Alpha</strong></p>
                        </div>
                        <div className="relative pl-4 border-l-2 border-slate-100 ml-1 opacity-50">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-400 ring-4 ring-white" />
                            <p className="text-[11px] text-slate-400 mb-0.5">1 hour ago</p>
                            <p className="text-xs text-slate-600">User session started</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default AdminLayout;
