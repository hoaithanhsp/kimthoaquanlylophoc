import { useEffect, useState } from 'react';
import { Clock, LogOut, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface PendingApprovalProps {
    status: 'pending' | 'rejected';
}

export default function PendingApproval({ status }: PendingApprovalProps) {
    const { signOut, user, fetchProfile } = useAuthStore();
    const [checking, setChecking] = useState(false);

    // Subscribe realtime vào profiles để tự chuyển khi được duyệt
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('profile-status-watch')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`,
            }, async (payload) => {
                const newStatus = (payload.new as any).status;
                if (newStatus === 'approved') {
                    // Profile đã được duyệt → reload profile
                    await fetchProfile(user.id);
                    window.location.reload();
                } else if (newStatus === 'rejected') {
                    await fetchProfile(user.id);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    async function handleRefresh() {
        if (!user) return;
        setChecking(true);
        try {
            await fetchProfile(user.id);
            const currentProfile = useAuthStore.getState().profile;
            if (currentProfile?.status === 'approved') {
                window.location.reload();
            }
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            setChecking(false);
        }
    }

    const isPending = status === 'pending';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="w-full max-w-md text-center animate-fade-in">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl shadow-xl mb-6 ${isPending
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-red-400 to-red-600'
                    }`}>
                    {isPending ? (
                        <Clock className="w-12 h-12 text-white animate-pulse" />
                    ) : (
                        <XCircle className="w-12 h-12 text-white" />
                    )}
                </div>

                {/* Card */}
                <div className="glass-strong rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
                        {isPending ? 'Chờ phê duyệt' : 'Tài khoản bị từ chối'}
                    </h1>

                    <p className="text-gray-500 mb-6 leading-relaxed">
                        {isPending ? (
                            <>
                                Tài khoản của bạn đã được đăng ký thành công và đang
                                <span className="font-semibold text-amber-600"> chờ giáo viên phê duyệt</span>.
                                Bạn sẽ được tự động chuyển vào hệ thống sau khi được duyệt.
                            </>
                        ) : (
                            <>
                                Tài khoản của bạn đã bị
                                <span className="font-semibold text-red-600"> từ chối</span>.
                                Vui lòng liên hệ giáo viên để biết thêm chi tiết.
                            </>
                        )}
                    </p>

                    {/* Progress animation cho pending */}
                    {isPending && (
                        <div className="mb-6">
                            <div className="flex items-center justify-center gap-3 text-sm text-amber-600 bg-amber-50 rounded-xl py-3 px-4">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="font-medium">Đang chờ giáo viên duyệt...</span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleRefresh}
                            disabled={checking}
                            className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                            {checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
                        </button>

                        <button
                            onClick={signOut}
                            className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-400 mt-4">
                    🎖️ Hệ thống Quản lý Lớp học
                </p>
            </div>
        </div>
    );
}
