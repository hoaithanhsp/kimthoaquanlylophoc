import { useEffect, useState } from 'react';
import { Trophy, Zap, Clock, ArrowUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Student, PointHistory, Rank } from '../types';
import { formatPoints, formatDateTime, getRankInfo, getNextRank, getRankProgress, getAvatarUrl } from '../lib/helpers';

export default function StudentDashboard() {
    const { user } = useAuthStore();
    const [student, setStudent] = useState<Student | null>(null);
    const [history, setHistory] = useState<PointHistory[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    async function loadData() {
        const [stuRes, rankRes] = await Promise.all([
            supabase.from('students').select('*').eq('user_id', user!.id).maybeSingle(),
            supabase.from('ranks').select('*').order('sort_order'),
        ]);

        const stu = stuRes.data as Student | null;
        setStudent(stu);
        setRanks((rankRes.data || []) as Rank[]);

        if (stu) {
            const { data: hisData } = await supabase
                .from('point_history')
                .select('*, criteria:criteria(name, type, icon)')
                .eq('student_id', stu.id)
                .order('created_at', { ascending: false })
                .limit(20);
            setHistory((hisData || []) as PointHistory[]);
        }
        setLoading(false);
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    if (!student) {
        return (
            <div className="text-center py-20">
                <div className="text-6xl mb-4">🎖️</div>
                <h2 className="text-xl font-bold text-gray-800">Chào mừng!</h2>
                <p className="text-sm text-gray-500 mt-2">Tài khoản của bạn chưa được liên kết với hồ sơ học sinh.</p>
                <p className="text-sm text-gray-400 mt-1">Vui lòng liên hệ giáo viên để được kích hoạt.</p>
            </div>
        );
    }

    const rankInfo = getRankInfo(student.current_rank);
    const nextRank = getNextRank(student.total_points);
    const progress = getRankProgress(student.total_points);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Profile Card */}
            <div className="glass-strong rounded-2xl p-6 text-center">
                <img
                    src={student.avatar_url || getAvatarUrl(student.full_name)}
                    alt={student.full_name}
                    className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
                />
                <h2 className="text-xl font-extrabold text-gray-800 mt-3">{student.full_name}</h2>

                {/* Rank Badge */}
                <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full" style={{ background: `${rankInfo.color}15`, color: rankInfo.color }}>
                    <span className="text-2xl">{rankInfo.icon}</span>
                    <span className="text-sm font-bold">{student.current_rank}</span>
                </div>

                {/* Points */}
                <div className="mt-4">
                    <p className="text-4xl font-extrabold text-flame-600">{formatPoints(student.total_points)}</p>
                    <p className="text-sm text-gray-400">Tổng điểm</p>
                </div>

                {/* Multiplier */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-badge-50 rounded-full">
                    <Zap className="w-4 h-4 text-badge-300" />
                    <span className="text-sm font-semibold text-badge-500">Hệ số x{student.current_multiplier}</span>
                </div>
            </div>

            {/* Progress to next rank */}
            {nextRank && (
                <div className="glass-strong rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ArrowUp className="w-4 h-4 text-flame-500" />
                            <span className="text-sm font-bold text-gray-800">Cấp tiếp theo</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: nextRank.color }}>
                            {nextRank.icon} {nextRank.rank_name}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="progress-bar h-full" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400">{formatPoints(student.total_points)} đ</span>
                        <span className="text-[10px] text-gray-400">{formatPoints(nextRank.min_points)} đ</span>
                    </div>
                </div>
            )}

            {/* Recent History */}
            <div className="glass-strong rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Lịch sử gần đây
                </h3>
                <div className="space-y-2">
                    {history.map(h => (
                        <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/50">
                            <span className="text-lg">{(h.criteria as any)?.icon || '📋'}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{(h.criteria as any)?.name || 'Điểm'}</p>
                                <p className="text-[10px] text-gray-400">{formatDateTime(h.created_at)}</p>
                            </div>
                            <span className={`text-sm font-bold ${h.final_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {h.final_points >= 0 ? '+' : ''}{h.final_points}
                            </span>
                        </div>
                    ))}
                    {history.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-6">Chưa có lịch sử</p>
                    )}
                </div>
            </div>
        </div>
    );
}
