import { useEffect, useState } from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { Student, PointHistory, Class } from '../types';
import { formatPoints, formatDate, getRankInfo } from '../lib/helpers';

export default function Reports() {
    const [students, setStudents] = useState<Student[]>([]);
    const [history, setHistory] = useState<PointHistory[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [stuRes, hisRes, clsRes] = await Promise.all([
            supabase.from('students').select('*').eq('is_active', true).order('total_points', { ascending: false }),
            supabase.from('point_history').select('*').order('created_at'),
            supabase.from('classes').select('*').eq('is_active', true),
        ]);
        setStudents((stuRes.data || []) as Student[]);
        setHistory((hisRes.data || []) as PointHistory[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    // Lọc students theo class
    const filteredStudents = students.filter(s => !filterClass || s.class_id === filterClass);

    // Biểu đồ tiến trình (điểm tích lũy theo ngày) cho selected student
    function getProgressData() {
        if (!selectedStudentId) return [];
        const studentHistory = history.filter(h => h.student_id === selectedStudentId).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        let cumulative = 0;
        const data: { date: string; points: number }[] = [];
        studentHistory.forEach(h => {
            cumulative += h.final_points;
            data.push({ date: formatDate(h.created_at), points: Math.max(cumulative, 0) });
        });
        return data;
    }

    // Bảng xếp hạng
    const leaderboard = filteredStudents.map((s, idx) => ({
        ...s,
        rank: idx + 1,
        rankInfo: getRankInfo(s.current_rank),
    }));

    // Thống kê theo lớp
    const classSummary = classes.map(c => {
        const classStudents = students.filter(s => s.class_id === c.id);
        const total = classStudents.reduce((sum, s) => sum + s.total_points, 0);
        const avg = classStudents.length > 0 ? Math.round(total / classStudents.length) : 0;
        return { class_name: c.class_name, count: classStudents.length, total, avg };
    });

    // Xuất Excel
    async function exportExcel() {
        try {
            const XLSX = await import('xlsx');
            const data = filteredStudents.map((s, idx) => ({
                'STT': idx + 1,
                'Họ tên': s.full_name,
                'Cấp bậc': s.current_rank,
                'Hệ số': s.current_multiplier,
                'Tổng điểm': s.total_points,
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Bảng xếp hạng');
            XLSX.writeFile(wb, `bang-xep-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch {
            alert('Lỗi xuất Excel');
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    const progressData = getProgressData();
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Báo cáo & Thống kê</h1>
                    <p className="text-sm text-gray-500 mt-1">Phân tích chi tiết</p>
                </div>
                <div className="flex gap-2">
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white/50">
                        <option value="">Tất cả lớp</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                    </select>
                    <button onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                        <Download className="w-4 h-4" /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Thống kê theo lớp */}
            {classSummary.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {classSummary.map(c => (
                        <div key={c.class_name} className="glass-strong rounded-2xl p-4 hover-lift">
                            <h4 className="text-sm font-bold text-gray-800">{c.class_name}</h4>
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500">Sĩ số: <span className="font-semibold text-gray-700">{c.count}</span></p>
                                <p className="text-xs text-gray-500">Tổng điểm: <span className="font-semibold text-flame-600">{formatPoints(c.total)}</span></p>
                                <p className="text-xs text-gray-500">TB: <span className="font-semibold text-emerald-600">{formatPoints(c.avg)}</span></p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Biểu đồ tiến trình */}
            <div className="glass-strong rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-flame-500" />
                        Tiến trình Học sinh
                    </h3>
                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white/50 max-w-xs">
                        <option value="">-- Chọn học sinh --</option>
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                </div>
                {selectedStudentId && progressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={progressData}>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white rounded-xl shadow-lg p-3 border text-sm">
                                            <p className="text-gray-500">{payload[0].payload.date}</p>
                                            <p className="font-bold text-flame-600">{formatPoints(payload[0].value as number)} điểm</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Line type="monotone" dataKey="points" stroke="#FF6B35" strokeWidth={2.5} dot={{ fill: '#FF6B35', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center py-12 text-gray-400 text-sm">
                        {selectedStudentId ? 'Chưa có dữ liệu' : 'Chọn học sinh để xem tiến trình'}
                    </div>
                )}
            </div>

            {/* Bảng xếp hạng */}
            <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">Bảng xếp hạng</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 w-12">#</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">Học sinh</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">Cấp bậc</th>
                                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500">Hệ số</th>
                                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500">Tổng điểm</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map(s => (
                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-2.5 px-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${s.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                s.rank === 2 ? 'bg-gray-100 text-gray-600' :
                                                    s.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                                            }`}>{s.rank}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs font-semibold">{s.full_name}</td>
                                    <td className="py-2.5 px-3">
                                        <span className="rank-badge" style={{ background: `${s.rankInfo.color}15`, color: s.rankInfo.color, borderColor: `${s.rankInfo.color}30` }}>
                                            {s.rankInfo.icon} {s.current_rank}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs text-right text-gray-500">x{s.current_multiplier}</td>
                                    <td className="py-2.5 px-3 text-xs text-right font-bold text-flame-600">{formatPoints(s.total_points)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {leaderboard.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Chưa có dữ liệu</div>}
            </div>
        </div>
    );
}
