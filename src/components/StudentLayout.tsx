import { Outlet, NavLink } from 'react-router-dom';
import { Home, Gift, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

export default function StudentLayout() {
    const { profile, signOut } = useAuthStore();

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 glass-strong border-b border-white/30">
                <div className="max-w-3xl mx-auto h-14 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-flame-500 to-flame-600 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-sm text-gray-800">Lớp học Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <span className="text-sm font-medium text-gray-600">{profile?.full_name || 'Học sinh'}</span>
                        <button onClick={signOut} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full p-4">
                <Outlet />
            </main>

            {/* Bottom Navigation (mobile) */}
            <nav className="sticky bottom-0 glass-strong border-t border-white/30 sm:hidden">
                <div className="flex items-center justify-around h-14">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'text-flame-600' : 'text-gray-500'
                            }`
                        }
                    >
                        <Home className="w-5 h-5" />
                        <span>Trang chủ</span>
                    </NavLink>
                    <NavLink
                        to="/shop"
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'text-flame-600' : 'text-gray-500'
                            }`
                        }
                    >
                        <Gift className="w-5 h-5" />
                        <span>Đổi quà</span>
                    </NavLink>
                </div>
            </nav>
        </div>
    );
}
