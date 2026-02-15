import { useEffect, useState } from 'react';
import { Users, Trophy, UsersRound, TrendingUp, Crown, Medal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Student, Group, Rank } from '../types';
import { formatPoints, getRankInfo, getAvatarUrl } from '../lib/helpers';

export default function Dashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // Safety timeout: nếu 5s chưa load xong thì tắt spinner
        const timeout = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timeout);
    }, []);

    async function loadData() {
        try {
            const [stuRes, grpRes, rankRes] = await Promise.all([
                supabase.from('students').select('*').eq('is_active', true).order('total_points', { ascending: false }),
                supabase.from('groups').select('*').eq('is_active', true).order('total_points', { ascending: false }),
                supabase.from('ranks').select('*').order('sort_order'),
            ]);
            setStudents((stuRes.data || []) as Student[]);
            setGroups((grpRes.data || []) as Group[]);
            setRanks((rankRes.data || []) as Rank[]);
        } catch (err) {
            console.error('[Dashboard] Load error:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Stats
    const totalStudents = students.length;
    const avgPoints = totalStudents > 0 ? Math.round(students.reduce((s, st) => s + st.total_points, 0) / totalStudents) : 0;
    const totalGroups = groups.length;

    // Phân bố cấp bậc
    const rankDistribution = ranks.map(rank => {
        const nextRank = ranks.find(r => r.sort_order === rank.sort_order + 1);
        const count = students.filter(s => {
            const pts = s.total_points;
            if (nextRank) return pts >= rank.min_points && pts < nextRank.min_points;
            return pts >= rank.min_points;
        }).length;
        return { name: rank.rank_name, count, icon: rank.icon, color: rank.color };
    });

    // Top 5 học sinh
    const top5 = students.slice(0, 5);

    // Top 3 nhóm
    const top3Groups = groups.slice(0, 3);

    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-gray-800">Tổng quan</h1>
                <p className="text-sm text-gray-500 mt-1">Thống kê tổng hợp về lớp học</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="stat-card glass-strong rounded-2xl p-5 hover-lift">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Tổng học sinh</p>
                            <p className="text-3xl font-extrabold text-gray-800 mt-1">{totalStudents}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="stat-card glass-strong rounded-2xl p-5 hover-lift">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Điểm trung bình</p>
                            <p className="text-3xl font-extrabold text-gray-800 mt-1">{formatPoints(avgPoints)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                    </div>
                </div>

                <div className="stat-card glass-strong rounded-2xl p-5 hover-lift">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Số nhóm</p>
                            <p className="text-3xl font-extrabold text-gray-800 mt-1">{totalGroups}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <UsersRound className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Biểu đồ phân bố cấp bậc */}
                <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Medal className="w-4 h-4 text-flame-500" />
                        Phân bố Cấp bậc
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={rankDistribution} margin={{ top: 5, right: 5, bottom: 50, left: 0 }}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white rounded-xl shadow-lg p-3 border text-sm">
                                                <p className="font-semibold">{d.icon} {d.name}</p>
                                                <p className="text-gray-500">{d.count} học sinh</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {rankDistribution.map((entry, index) => (
                                    <Cell key={index} fill={entry.color || '#FF6B35'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 5 Học sinh */}
                <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-badge-300" />
                        Top 5 Học sinh xuất sắc
                    </h3>
                    <div className="space-y-3">
                        {top5.map((student, idx) => {
                            const rankInfo = getRankInfo(student.current_rank);
                            return (
                                <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                                    {/* Rank number */}
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                        style={{ background: idx < 3 ? medalColors[idx] : '#d1d5db' }}
                                    >
                                        {idx + 1}
                                    </div>
                                    {/* Avatar */}
                                    <img
                                        src={student.avatar_url || getAvatarUrl(student.full_name)}
                                        alt={student.full_name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{student.full_name}</p>
                                        <div className="rank-badge mt-0.5" style={{ background: `${rankInfo.color}15`, color: rankInfo.color, borderColor: `${rankInfo.color}30` }}>
                                            <span>{rankInfo.icon}</span>
                                            <span>{student.current_rank}</span>
                                        </div>
                                    </div>
                                    {/* Points */}
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-flame-600">{formatPoints(student.total_points)}</p>
                                        <p className="text-[10px] text-gray-400">điểm</p>
                                    </div>
                                </div>
                            );
                        })}
                        {top5.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-8">Chưa có học sinh</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Top 3 Nhóm */}
            {top3Groups.length > 0 && (
                <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-badge-300" />
                        Top 3 Nhóm xuất sắc
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {top3Groups.map((group, idx) => (
                            <div
                                key={group.id}
                                className={`rounded-2xl p-5 text-center hover-lift ${idx === 0 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200' :
                                    idx === 1 ? 'bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200' :
                                        'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200'
                                    }`}
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
                                    style={{ background: medalColors[idx] }}
                                >
                                    {idx + 1}
                                </div>
                                <p className="text-sm font-bold text-gray-800">{group.group_name}</p>
                                <p className="text-2xl font-extrabold text-flame-600 mt-1">{formatPoints(group.total_points)}</p>
                                <p className="text-xs text-gray-400 mt-1">{group.member_count} thành viên</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
