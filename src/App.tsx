import { useEffect, useState, useCallback } from 'react';
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
    const [profileLoading, setProfileLoading] = useState(false);

    // Retry fetchProfile nếu lần đầu thất bại
    const retryFetchProfile = useCallback(async (userId: string, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                await fetchProfile(userId);
                const p = useAuthStore.getState().profile;
                if (p) {
                    console.log('[App] Profile loaded on attempt', i + 1, p);
                    return true;
                }
                console.warn(`[App] Profile null on attempt ${i + 1}, retrying...`);
                // Đợi 1s trước khi retry
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error(`[App] fetchProfile attempt ${i + 1} error:`, err);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return false;
    }, [fetchProfile]);

    useEffect(() => {
        console.log('[App] Setting up auth listener...');

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[App] Auth event:', event, session ? 'has session' : 'no session');

            if (event === 'INITIAL_SESSION') {
                if (session?.user) {
                    setUser(session.user);
                    setProfileLoading(true);
                    await retryFetchProfile(session.user.id);
                    setProfileLoading(false);
                }
                setLoading(false);
                setReady(true);
                console.log('[App] Ready! profile:', useAuthStore.getState().profile);
            } else if (event === 'SIGNED_IN') {
                setUser(session!.user);
                setProfileLoading(true);
                await retryFetchProfile(session!.user.id);
                setProfileLoading(false);
                setLoading(false);
                setReady(true);
                console.log('[App] Signed in, profile:', useAuthStore.getState().profile);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                useAuthStore.setState({ profile: null });
                setLoading(false);
                setReady(true);
            }
        });

        // Safety timeout 10s (tăng lên để profile có thời gian load)
        const timeout = setTimeout(() => {
            console.warn('[App] Safety timeout triggered');
            setProfileLoading(false);
            setLoading(false);
            setReady(true);
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Đang load app
    if (!ready || profileLoading) {
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
                            onClick={async () => {
                                setProfileLoading(true);
                                await retryFetchProfile(user.id);
                                setProfileLoading(false);
                            }}
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

