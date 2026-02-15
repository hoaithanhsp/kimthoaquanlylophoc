import { Outlet, NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, UsersRound, Zap,
    Gift, BarChart3, Settings, LogOut, Shield, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';
import { useState } from 'react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
    { to: '/students', icon: Users, label: 'Học sinh' },
    { to: '/groups', icon: UsersRound, label: 'Nhóm' },
    { to: '/points', icon: Zap, label: 'Điểm số' },
    { to: '/rewards', icon: Gift, label: 'Đổi quà' },
    { to: '/reports', icon: BarChart3, label: 'Báo cáo' },
    { to: '/settings', icon: Settings, label: 'Cài đặt' },
];

export default function TeacherLayout() {
    const { profile, signOut } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 glass-strong border-r border-white/30 
        flex flex-col z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-flame-500 to-flame-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-sm text-gray-800">Lớp học Pro</h1>
                            <p className="text-[10px] text-gray-400">Gamification</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-flame-50 text-flame-600 nav-active'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-military-500 to-military-600 flex items-center justify-center text-white text-sm font-bold">
                            {profile?.full_name?.charAt(0) || 'T'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || 'Giáo viên'}</p>
                            <p className="text-xs text-gray-400">Giáo viên</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header (mobile) */}
                <header className="sticky top-0 z-30 h-14 glass-strong border-b border-white/30 flex items-center justify-between px-4 lg:px-6">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="hidden lg:block">
                        <h2 className="text-sm font-semibold text-gray-700">Xin chào, {profile?.full_name || 'Giáo viên'} 👋</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
