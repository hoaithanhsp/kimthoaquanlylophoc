import { useEffect, useState } from 'react';
import { UserCheck, UserX, Clock, Mail, Loader2, RefreshCw, CheckCircle2, XCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/helpers';
import type { Class } from '../types';

interface PendingStudent {
    id: string;
    full_name: string;
    email: string;
    status: 'pending' | 'rejected';
    created_at: string;
}

export default function StudentApproval() {
    const [students, setStudents] = useState<PendingStudent[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadPendingStudents();
        loadClasses();

        // Realtime: subscribe cho profiles thay đổi
        const channel = supabase
            .channel('pending-students-watch')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
            }, () => {
                loadPendingStudents();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function loadClasses() {
        const { data } = await supabase.from('classes').select('*').eq('is_active', true).order('class_name');
        const cls = (data || []) as Class[];
        setClasses(cls);
        if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0].id);
    }

    async function loadPendingStudents() {
        try {
            const { data, error } = await supabase.rpc('get_pending_students');
            if (error) {
                console.error('Load pending error:', error);
                setStudents([]);
            } else {
                setStudents((data || []) as PendingStudent[]);
            }
        } catch (err) {
            console.error('Load pending exception:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(studentId: string) {
        if (!selectedClassId) {
            setMessage({ type: 'error', text: 'Vui lòng chọn lớp trước khi phê duyệt' });
            return;
        }
        setActionLoading(studentId);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('approve_student', {
                p_user_id: studentId,
                p_class_id: selectedClassId,
            });
            if (error) throw error;
            const result = data as any;
            if (result.success) {
                setMessage({ type: 'success', text: `✅ Đã phê duyệt và thêm ${result.student_name} vào lớp` });
                setStudents(prev => prev.filter(s => s.id !== studentId));
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Lỗi phê duyệt' });
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(studentId: string) {
        if (!confirm('Bạn có chắc muốn từ chối học sinh này?')) return;
        setActionLoading(studentId);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('reject_student', { p_user_id: studentId });
            if (error) throw error;
            const result = data as any;
            if (result.success) {
                setMessage({ type: 'success', text: `❌ Đã từ chối học sinh ${result.student_name}` });
                setStudents(prev => prev.map(s =>
                    s.id === studentId ? { ...s, status: 'rejected' as const } : s
                ));
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Lỗi từ chối' });
        } finally {
            setActionLoading(null);
        }
    }

    async function handleApproveAll() {
        const pendingIds = students.filter(s => s.status === 'pending').map(s => s.id);
        if (pendingIds.length === 0) return;
        if (!selectedClassId) {
            setMessage({ type: 'error', text: 'Vui lòng chọn lớp trước khi phê duyệt' });
            return;
        }
        if (!confirm(`Phê duyệt tất cả ${pendingIds.length} học sinh vào lớp?`)) return;

        setActionLoading('all');
        let approvedCount = 0;
        for (const id of pendingIds) {
            try {
                const { data } = await supabase.rpc('approve_student', {
                    p_user_id: id,
                    p_class_id: selectedClassId,
                });
                if ((data as any)?.success) approvedCount++;
            } catch { /* skip */ }
        }
        setMessage({ type: 'success', text: `✅ Đã phê duyệt ${approvedCount}/${pendingIds.length} học sinh vào lớp` });
        await loadPendingStudents();
        setActionLoading(null);
    }

    const pendingCount = students.filter(s => s.status === 'pending').length;
    const rejectedCount = students.filter(s => s.status === 'rejected').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Phê duyệt Học sinh</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản học sinh đăng ký mới</p>
                </div>
                <button
                    onClick={loadPendingStudents}
                    className="p-2.5 rounded-xl hover:bg-white/80 transition-colors"
                    title="Làm mới"
                >
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-strong rounded-2xl p-4 hover-lift">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-800">{pendingCount}</p>
                            <p className="text-xs text-gray-500">Chờ duyệt</p>
                        </div>
                    </div>
                </div>
                <div className="glass-strong rounded-2xl p-4 hover-lift">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-800">{rejectedCount}</p>
                            <p className="text-xs text-gray-500">Đã từ chối</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chọn Lớp */}
            {classes.length > 0 && students.length > 0 && (
                <div className="glass-strong rounded-2xl p-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                        <Users className="w-4 h-4 text-flame-500" />
                        Thêm vào lớp khi phê duyệt
                    </label>
                    <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-flame-500/30 focus:border-flame-400"
                    >
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5">Học sinh sẽ được tự động thêm vào lớp này khi phê duyệt</p>
                </div>
            )}
            {/* Message */}
            {message && (
                <div className={`p-3 rounded-xl text-sm animate-slide-down ${message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Approve All Button */}
            {pendingCount > 1 && (
                <button
                    onClick={handleApproveAll}
                    disabled={actionLoading === 'all'}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {actionLoading === 'all' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <UserCheck className="w-5 h-5" />
                    )}
                    Phê duyệt tất cả ({pendingCount})
                </button>
            )}

            {/* Student List */}
            {students.length === 0 ? (
                <div className="glass-strong rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Tất cả đã được xử lý</h3>
                    <p className="text-sm text-gray-500">Không có học sinh nào đang chờ phê duyệt</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {students.map(student => (
                        <div
                            key={student.id}
                            className={`glass-strong rounded-2xl p-4 hover-lift transition-all ${student.status === 'rejected' ? 'opacity-60' : ''
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${student.status === 'pending'
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                    : 'bg-gradient-to-br from-red-400 to-red-500'
                                    }`}>
                                    {(student.full_name || '?').charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                        {student.full_name || 'Chưa có tên'}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                        <Mail className="w-3 h-3" />
                                        <span className="truncate">{student.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${student.status === 'pending'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {student.status === 'pending' ? (
                                                <><Clock className="w-2.5 h-2.5" /> Chờ duyệt</>
                                            ) : (
                                                <><XCircle className="w-2.5 h-2.5" /> Đã từ chối</>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {formatDateTime(student.created_at)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {student.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(student.id)}
                                                disabled={actionLoading === student.id}
                                                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                title="Phê duyệt"
                                            >
                                                {actionLoading === student.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <UserCheck className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleReject(student.id)}
                                                disabled={actionLoading === student.id}
                                                className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                title="Từ chối"
                                            >
                                                <UserX className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    {student.status === 'rejected' && (
                                        <button
                                            onClick={() => handleApprove(student.id)}
                                            disabled={actionLoading === student.id}
                                            className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                                            title="Phê duyệt lại"
                                        >
                                            {actionLoading === student.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <UserCheck className="w-4 h-4" />
                                            )}
                                            Duyệt lại
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
