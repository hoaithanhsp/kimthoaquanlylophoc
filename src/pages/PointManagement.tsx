import { useEffect, useState } from 'react';
import { Zap, TrendingDown, Search, Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, Criteria, PointHistory, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, formatDateTime, getRankInfo, getAvatarUrl } from '../lib/helpers';

export default function PointManagement() {
    const { showToast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [criteria, setCriteria] = useState<Criteria[]>([]);
    const [history, setHistory] = useState<PointHistory[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedCriteria, setSelectedCriteria] = useState('');
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [tab, setTab] = useState<'add' | 'history'>('add');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [stuRes, criRes, hisRes, clsRes] = await Promise.all([
            supabase.from('students').select('*').eq('is_active', true).order('full_name'),
            supabase.from('criteria').select('*').eq('is_active', true).order('type', { ascending: true }),
            supabase.from('point_history').select('*, student:students(full_name, current_rank), criteria:criteria(name, type, icon)').order('created_at', { ascending: false }).limit(50),
            supabase.from('classes').select('*').eq('is_active', true),
        ]);
        setStudents((stuRes.data || []) as Student[]);
        setCriteria((criRes.data || []) as Criteria[]);
        setHistory((hisRes.data || []) as PointHistory[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    const positiveCriteria = criteria.filter(c => c.type === 'positive');
    const negativeCriteria = criteria.filter(c => c.type === 'negative');

    async function handleAddPoints() {
        if (!selectedStudent || !selectedCriteria) {
            showToast('warning', 'Vui lòng chọn học sinh và tiêu chí');
            return;
        }
        setSaving(true);
        try {
            const cri = criteria.find(c => c.id === selectedCriteria);
            const fnName = cri?.type === 'negative' ? 'subtract_points' : 'add_points';
            const { data, error } = await supabase.rpc(fnName, {
                p_student_id: selectedStudent,
                p_criteria_id: selectedCriteria,
                p_note: note,
            });
            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error);

            showToast('success', `${cri?.type === 'negative' ? 'Trừ' : 'Cộng'} ${Math.abs(result.final_points)} điểm cho ${result.student_name}`);
            setNote('');
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    const filteredStudents = students.filter(s => {
        const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase());
        const matchClass = !filterClass || s.class_id === filterClass;
        return matchSearch && matchClass;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-800">Quản lý Điểm</h1>
                <p className="text-sm text-gray-500 mt-1">Cộng/trừ điểm cho học sinh</p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 max-w-xs">
                <button onClick={() => setTab('add')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'add' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    Cộng/Trừ điểm
                </button>
                <button onClick={() => setTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'history' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    Lịch sử
                </button>
            </div>

            {tab === 'add' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chọn học sinh */}
                    <div className="lg:col-span-1 glass-strong rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-3">1. Chọn học sinh</h3>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm theo tên..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none bg-white/50"
                            />
                        </div>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white/50">
                            <option value="">Tất cả lớp</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                        </select>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {filteredStudents.map(s => {
                                const rankInfo = getRankInfo(s.current_rank);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedStudent(s.id)}
                                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${selectedStudent === s.id ? 'bg-flame-50 border border-flame-200' : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <img src={s.avatar_url || getAvatarUrl(s.full_name)} alt="" className="w-8 h-8 rounded-full" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">{s.full_name}</p>
                                            <p className="text-[10px] text-gray-400">{rankInfo.icon} {s.current_rank} · x{s.current_multiplier}</p>
                                        </div>
                                        <span className="text-xs font-bold text-flame-600">{formatPoints(s.total_points)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chọn tiêu chí + Submit */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="glass-strong rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-500" />
                                2. Tiêu chí cộng điểm
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {positiveCriteria.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCriteria(c.id)}
                                        className={`p-3 rounded-xl text-left border transition-all ${selectedCriteria === c.id ? 'bg-emerald-50 border-emerald-300' : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50'
                                            }`}
                                    >
                                        <span className="text-lg">{c.icon}</span>
                                        <p className="text-xs font-semibold text-gray-700 mt-1">{c.name}</p>
                                        <p className="text-xs text-emerald-600 font-bold">+{c.base_points} đ</p>
                                    </button>
                                ))}
                                {positiveCriteria.length === 0 && <p className="text-xs text-gray-400 col-span-full py-4 text-center">Chưa có tiêu chí. Vào Cài đặt để thêm.</p>}
                            </div>
                        </div>

                        <div className="glass-strong rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                Tiêu chí trừ điểm
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {negativeCriteria.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCriteria(c.id)}
                                        className={`p-3 rounded-xl text-left border transition-all ${selectedCriteria === c.id ? 'bg-red-50 border-red-300' : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                                            }`}
                                    >
                                        <span className="text-lg">{c.icon}</span>
                                        <p className="text-xs font-semibold text-gray-700 mt-1">{c.name}</p>
                                        <p className="text-xs text-red-600 font-bold">-{c.base_points} đ</p>
                                    </button>
                                ))}
                                {negativeCriteria.length === 0 && <p className="text-xs text-gray-400 col-span-full py-4 text-center">Chưa có tiêu chí trừ điểm.</p>}
                            </div>
                        </div>

                        {/* Note + Submit */}
                        <div className="glass-strong rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-gray-800 mb-3">3. Ghi chú (tùy chọn)</h3>
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="VD: Trả lời đúng câu hỏi khó"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none mb-4"
                            />
                            <button
                                onClick={handleAddPoints}
                                disabled={saving || !selectedStudent || !selectedCriteria}
                                className="w-full py-3 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Lịch sử điểm */
                <div className="glass-strong rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Thời gian</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Học sinh</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Tiêu chí</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Gốc</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Hệ số</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Cuối cùng</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 px-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDateTime(h.created_at)}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-xs font-semibold">{(h.student as any)?.full_name || '—'}</td>
                                        <td className="py-2.5 px-4 text-xs">
                                            {(h.criteria as any)?.icon} {(h.criteria as any)?.name || '—'}
                                        </td>
                                        <td className="py-2.5 px-4 text-xs text-right">{h.base_points}</td>
                                        <td className="py-2.5 px-4 text-xs text-right">x{h.multiplier}</td>
                                        <td className={`py-2.5 px-4 text-xs text-right font-bold ${h.final_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {h.final_points >= 0 ? '+' : ''}{h.final_points}
                                        </td>
                                        <td className="py-2.5 px-4 text-xs text-gray-500 max-w-[150px] truncate">{h.note || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {history.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">Chưa có lịch sử điểm</div>
                    )}
                </div>
            )}
        </div>
    );
}
