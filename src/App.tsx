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

function App() {
    const { user, profile, setUser, setLoading, fetchProfile } = useAuthStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('getSession result:', session ? 'has session' : 'no session');
                if (session?.user && mounted) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    console.log('Profile loaded, user role:', useAuthStore.getState().profile?.role);
                }
            } catch (err) {
                console.error('Init error:', err);
            } finally {
                if (mounted) {
                    setLoading(false);
                    setReady(true);
                    console.log('App ready!');
                }
            }
        }

        init();

        // Lắng nghe thay đổi auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state changed:', _event);
            try {
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    useAuthStore.setState({ profile: null });
                }
            } catch (err) {
                console.error('Auth change error:', err);
            }
        });

        // Safety timeout - nếu sau 5s vẫn chưa ready thì force ready
        const timeout = setTimeout(() => {
            if (!useAuthStore.getState().loading) return;
            console.warn('Safety timeout: forcing app ready');
            setLoading(false);
            setReady(true);
        }, 5000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

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

    const isTeacher = profile?.role === 'teacher';

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
