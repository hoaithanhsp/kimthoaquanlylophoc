import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Gift, Search, X, Loader2, ShoppingBag, Clock, Award, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Reward, Student, RewardHistory, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, formatDateTime, getAvatarUrl, getRankInfo } from '../lib/helpers';

export default function RewardShop() {
    const { showToast } = useToast();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [history, setHistory] = useState<RewardHistory[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Reward | null>(null);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [form, setForm] = useState({
        name: '', required_points: 100, icon: '🎁', stock: -1, class_id: '',
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [rwRes, stuRes, hisRes, clsRes] = await Promise.all([
            supabase.from('rewards').select('*').eq('is_active', true).order('required_points'),
            supabase.from('students').select('*').eq('is_active', true).order('full_name'),
            supabase.from('reward_history').select('*, student:students(full_name), reward:rewards(name, icon)').order('exchanged_at', { ascending: false }).limit(50),
            supabase.from('classes').select('*').eq('is_active', true),
        ]);
        setRewards((rwRes.data || []) as Reward[]);
        setStudents((stuRes.data || []) as Student[]);
        setHistory((hisRes.data || []) as RewardHistory[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    function openCreate() {
        setEditing(null);
        setForm({ name: '', required_points: 100, icon: '🎁', stock: -1, class_id: classes[0]?.id || '' });
        setShowModal(true);
    }

    function openEdit(reward: Reward) {
        setEditing(reward);
        setForm({ name: reward.name, required_points: reward.required_points, icon: reward.icon, stock: reward.stock, class_id: reward.class_id });
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await supabase.from('rewards').update(form).eq('id', editing.id);
                showToast('success', 'Đã cập nhật phần thưởng');
            } else {
                await supabase.from('rewards').insert(form);
                showToast('success', 'Đã thêm phần thưởng');
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(reward: Reward) {
        if (!confirm(`Xóa "${reward.name}"?`)) return;
        await supabase.from('rewards').update({ is_active: false }).eq('id', reward.id);
        showToast('success', 'Đã xóa phần thưởng');
        loadData();
    }

    async function handleExchange() {
        if (!selectedReward || !selectedStudent) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.rpc('exchange_reward', {
                p_student_id: selectedStudent,
                p_reward_id: selectedReward.id,
                p_note: '',
            });
            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error);
            showToast('success', `Đổi thành công! Trừ ${formatPoints(result.points_spent)} điểm`);
            setSelectedReward(null);
            setSelectedStudent('');
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    const emojiOptions = ['🎁', '🏆', '🎪', '📚', '🎨', '⚽', '🎵', '🍫', '🎮', '✏️', '📱', '🎬', '🍕', '🧸', '🎯'];

    // Stats
    const totalExchanges = history.length;
    const completedExchanges = history.filter(h => h.status === 'completed').length;
    const uniqueStudents = new Set(history.map(h => (h as any).student?.full_name)).size;

    // Eligible students for selected reward
    const eligibleStudents = selectedReward
        ? students.filter(s => s.total_points >= selectedReward.required_points)
        : [];

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-2xl font-extrabold text-gray-800">🎁 Đổi Quà</h1>
                <div className="flex gap-2">
                    <button onClick={() => loadData()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
                        📤 Tải lại
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
                        <Plus className="w-4 h-4" /> Cất hàng mới
                    </button>
                </div>
            </div>

            {/* Section: Quà tặng theo Cấp bậc */}
            <div className="glass-strong rounded-2xl p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-flame-500" /> Quà tặng theo Cấp bậc
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {rewards.map(reward => {
                        const isSelected = selectedReward?.id === reward.id;
                        return (
                            <div key={reward.id}
                                onClick={() => { setSelectedReward(isSelected ? null : reward); setSelectedStudent(''); }}
                                className={`flex-shrink-0 w-40 rounded-2xl p-4 cursor-pointer transition-all hover-lift border-2 ${isSelected ? 'border-flame-400 shadow-lg bg-flame-50' : 'border-transparent bg-gradient-to-b from-orange-50 to-amber-50'}`}>
                                {/* Points badge */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reward.required_points <= 10 ? 'bg-emerald-100 text-emerald-700' : reward.required_points <= 50 ? 'bg-blue-100 text-blue-700' : reward.required_points <= 100 ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                                        {reward.required_points} Điểm
                                    </span>
                                    <div className="flex gap-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); openEdit(reward); }}
                                            className="p-1 text-gray-300 hover:text-blue-500 rounded"><Edit2 className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(reward); }}
                                            className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                <div className="text-3xl text-center mb-2">{reward.icon}</div>
                                <h3 className="text-xs font-bold text-gray-800 text-center truncate">{reward.name}</h3>
                                <p className="text-[10px] text-gray-400 text-center mt-1">
                                    {reward.stock === -1 ? 'Không giới hạn' : `Còn ${reward.stock} cái`}
                                </p>
                            </div>
                        );
                    })}
                    {rewards.length === 0 && (
                        <div className="w-full text-center py-8 text-gray-400 text-sm">Chưa có phần thưởng</div>
                    )}
                </div>
            </div>

            {/* Section: Học sinh đủ điều kiện đổi quà */}
            <div className="glass-strong rounded-2xl p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    👤 Học sinh đủ điều kiện đổi quà
                </h2>
                {!selectedReward ? (
                    <div className="text-center py-8">
                        <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Vui lòng chọn một quà tặng phía trên</p>
                    </div>
                ) : eligibleStudents.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400">Không có học sinh nào đủ <strong>{selectedReward.required_points} điểm</strong></p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {eligibleStudents.map(s => {
                                const isChosen = selectedStudent === s.id;
                                return (
                                    <div key={s.id}
                                        onClick={() => setSelectedStudent(isChosen ? '' : s.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${isChosen ? 'border-flame-400 bg-flame-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-flame-400 to-flame-500 flex items-center justify-center text-white text-sm font-bold">
                                            {s.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{s.full_name}</p>
                                            <p className="text-xs text-gray-400">{formatPoints(s.total_points)} điểm · {s.current_rank}</p>
                                        </div>
                                        {isChosen && <CheckCircle className="w-5 h-5 text-flame-500 flex-shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                        {selectedStudent && (
                            <button onClick={handleExchange} disabled={saving}
                                className="w-full py-3 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                🎁 Đổi "{selectedReward.name}" cho học sinh
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Section: Lịch sử đổi quà */}
            <div className="glass-strong rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        📜 Lịch sử đổi quà
                    </h2>
                    <button onClick={() => loadData()} className="text-xs text-gray-400 hover:text-flame-500 flex items-center gap-1">
                        Tải lại <span className="text-lg">↺</span>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                        <Gift className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-800">{totalExchanges}</p>
                        <p className="text-[10px] text-gray-500">Hoàn đổi</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-800">{completedExchanges}</p>
                        <p className="text-[10px] text-gray-500">Hoàn thành</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-800">{uniqueStudents}</p>
                        <p className="text-[10px] text-gray-500">Học sinh đổi quà</p>
                    </div>
                </div>

                {/* History Table */}
                {history.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">Đang tải...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-100">
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Thời gian</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Học sinh</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Phần thưởng</th>
                                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Điểm đã trừ</th>
                            </tr></thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2 px-3 text-xs text-gray-500">{formatDateTime(h.exchanged_at)}</td>
                                        <td className="py-2 px-3 text-xs font-semibold">{(h.student as any)?.full_name || '—'}</td>
                                        <td className="py-2 px-3 text-xs">{(h.reward as any)?.icon} {(h.reward as any)?.name || '—'}</td>
                                        <td className="py-2 px-3 text-xs text-right font-bold text-red-600">-{formatPoints(h.points_spent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Reward Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold">{editing ? 'Sửa phần thưởng' : 'Thêm phần thưởng'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {emojiOptions.map(e => (
                                        <button key={e} type="button" onClick={() => setForm({ ...form, icon: e })}
                                            className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${form.icon === e ? 'border-flame-500 bg-flame-50' : 'border-gray-200'}`}>{e}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên phần thưởng</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="VD: Bút bi đẹp" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Giá (điểm)</label>
                                    <input type="number" value={form.required_points} onChange={e => setForm({ ...form, required_points: parseInt(e.target.value) || 0 })} min={1} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số lượng</label>
                                    <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })} min={-1} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none" />
                                    <p className="text-[10px] text-gray-400 mt-1">-1 = không giới hạn</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp</label>
                                <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none">
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
