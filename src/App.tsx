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

function App() {
    const { user, profile, setUser, setLoading, fetchProfile } = useAuthStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        console.log('[App] Setting up auth listener...');

        // CHỈ dùng onAuthStateChange - không dùng getSession() vì nó bị treo
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[App] Auth event:', event, session ? 'has session' : 'no session');

            if (event === 'INITIAL_SESSION') {
                // Đây là event đầu tiên khi app load
                if (session?.user) {
                    setUser(session.user);
                    try {
                        await fetchProfile(session.user.id);
                        console.log('[App] Profile loaded:', useAuthStore.getState().profile);
                    } catch (err) {
                        console.error('[App] fetchProfile error:', err);
                    }
                }
                setLoading(false);
                setReady(true);
                console.log('[App] Ready! isTeacher:', useAuthStore.getState().profile?.role === 'teacher');
            } else if (event === 'SIGNED_IN') {
                setUser(session!.user);
                try {
                    await fetchProfile(session!.user.id);
                    console.log('[App] Signed in, profile:', useAuthStore.getState().profile);
                } catch (err) {
                    console.error('[App] fetchProfile error on sign in:', err);
                }
                if (!ready) {
                    setLoading(false);
                    setReady(true);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                useAuthStore.setState({ profile: null });
                if (!ready) {
                    setLoading(false);
                    setReady(true);
                }
            }
        });

        // Safety timeout 3s
        const timeout = setTimeout(() => {
            if (!ready) {
                console.warn('[App] Safety timeout triggered');
                setLoading(false);
                setReady(true);
            }
        }, 3000);

        return () => {
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
    const studentStatus = profile?.status || 'approved';
    console.log('[App] Rendering, isTeacher:', isTeacher, 'status:', studentStatus, 'profile:', profile);

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
