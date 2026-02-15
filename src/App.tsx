import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/Toast';

// Layouts
import TeacherLayout from './components/TeacherLayout';
import StudentLayout from './components/StudentLayout';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import GroupManagement from './pages/GroupManagement';
import PointManagement from './pages/PointManagement';
import RewardShop from './pages/RewardShop';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StudentDashboard from './pages/StudentDashboard';
import StudentRewards from './pages/StudentRewards';
import PendingApproval from './pages/PendingApproval';
import StudentApproval from './pages/StudentApproval';
import AuthorPage from './pages/AuthorPage';

function App() {
    const { user, profile, setUser, setLoading, fetchProfile } = useAuthStore();
    const [ready, setReady] = useState(false);

    // Effect 1: Lắng nghe auth state (KHÔNG await bên trong!)
    useEffect(() => {
        console.log('[App] Setting up auth listener...');

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[App] Auth event:', event, session ? 'has session' : 'no session');

            if (session?.user) {
                setUser(session.user);
            } else {
                setUser(null);
                useAuthStore.setState({ profile: null });
            }

            setLoading(false);
            setReady(true);
        });

        // Safety timeout 5s
        const timeout = setTimeout(() => {
            console.warn('[App] Safety timeout triggered');
            setLoading(false);
            setReady(true);
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Effect 2: Khi user thay đổi → fetch profile (NGOÀI onAuthStateChange!)
    useEffect(() => {
        if (user) {
            console.log('[App] User detected, fetching profile...');
            fetchProfile(user.id);
        }
    }, [user]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-flame-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-4">Đang tải...</p>
                </div>
            </div>
        );
    }

    // Chưa đăng nhập
    if (!user) {
        return (
            <BrowserRouter>
                <ToastProvider>
                    <Routes>
                        <Route path="*" element={<AuthPage />} />
                    </Routes>
                </ToastProvider>
            </BrowserRouter>
        );
    }

    // Đã đăng nhập nhưng profile chưa load được → hiển thị loading + nút retry
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center glass-strong rounded-2xl p-8 max-w-sm">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Không thể tải hồ sơ</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Không thể kết nối đến máy chủ. Vui lòng thử lại.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => fetchProfile(user.id)}
                            className="w-full py-3 bg-gradient-to-r from-flame-500 to-flame-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Thử lại
                        </button>
                        <button
                            onClick={() => useAuthStore.getState().signOut()}
                            className="w-full py-2.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isTeacher = profile.role === 'teacher';
    const studentStatus = profile.status || 'approved';
    console.log('[App] Rendering, isTeacher:', isTeacher, 'status:', studentStatus);

    // Student chưa được duyệt
    if (!isTeacher && studentStatus !== 'approved') {
        return (
            <BrowserRouter>
                <ToastProvider>
                    <PendingApproval status={studentStatus as 'pending' | 'rejected'} />
                </ToastProvider>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <ToastProvider>
                <Routes>
                    {isTeacher ? (
                        // Teacher routes
                        <Route path="/" element={<TeacherLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="students" element={<StudentList />} />
                            <Route path="groups" element={<GroupManagement />} />
                            <Route path="points" element={<PointManagement />} />
                            <Route path="rewards" element={<RewardShop />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="approval" element={<StudentApproval />} />
                            <Route path="author" element={<AuthorPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    ) : (
                        // Student routes
                        <Route path="/" element={<StudentLayout />}>
                            <Route index element={<StudentDashboard />} />
                            <Route path="rewards" element={<StudentRewards />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    )}
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    );
}

export default App;

