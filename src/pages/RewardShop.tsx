import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Gift, Search, X, Loader2, ShoppingBag, Clock } from 'lucide-react';
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
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [editing, setEditing] = useState<Reward | null>(null);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [tab, setTab] = useState<'shop' | 'history'>('shop');
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
            setShowExchangeModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    const emojiOptions = ['🎁', '🏆', '🎪', '📚', '🎨', '⚽', '🎵', '🍫', '🎮', '✏️', '📱', '🎬', '🍕', '🧸', '🎯'];

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Cửa hàng Đổi quà</h1>
                    <p className="text-sm text-gray-500 mt-1">{rewards.length} phần thưởng</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-4 h-4" /> Thêm phần thưởng
                </button>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 max-w-xs">
                <button onClick={() => setTab('shop')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'shop' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    <Gift className="w-4 h-4 inline mr-1" /> Phần thưởng
                </button>
                <button onClick={() => setTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'history' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4 inline mr-1" /> Lịch sử
                </button>
            </div>

            {tab === 'shop' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewards.map(reward => (
                        <div key={reward.id} className="glass-strong rounded-2xl p-5 hover-lift">
                            <div className="flex items-start justify-between">
                                <div className="text-4xl mb-3">{reward.icon}</div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(reward)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDelete(reward)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <h3 className="text-sm font-bold text-gray-800">{reward.name}</h3>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <span className="text-lg font-extrabold text-flame-600">{formatPoints(reward.required_points)} đ</span>
                                <span className="text-xs text-gray-400">{reward.stock === -1 ? '∞' : reward.stock} còn lại</span>
                            </div>
                            <button
                                onClick={() => { setSelectedReward(reward); setSelectedStudent(''); setShowExchangeModal(true); }}
                                className="w-full mt-3 py-2 bg-gradient-to-r from-badge-300 to-badge-400 text-gray-800 rounded-xl text-xs font-semibold hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                                <ShoppingBag className="w-3.5 h-3.5" /> Đổi cho HS
                            </button>
                        </div>
                    ))}
                    {rewards.length === 0 && <div className="col-span-full text-center py-16 text-gray-400">Chưa có phần thưởng</div>}
                </div>
            ) : (
                <div className="glass-strong rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Thời gian</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Học sinh</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Phần thưởng</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Điểm đã trừ</th>
                            </tr></thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 px-4 text-xs text-gray-500">{formatDateTime(h.exchanged_at)}</td>
                                        <td className="py-2.5 px-4 text-xs font-semibold">{(h.student as any)?.full_name || '—'}</td>
                                        <td className="py-2.5 px-4 text-xs">{(h.reward as any)?.icon} {(h.reward as any)?.name || '—'}</td>
                                        <td className="py-2.5 px-4 text-xs text-right font-bold text-red-600">-{formatPoints(h.points_spent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {history.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Chưa có lịch sử đổi quà</div>}
                </div>
            )}

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

            {/* Exchange Modal */}
            {showExchangeModal && selectedReward && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold">Đổi: {selectedReward.icon} {selectedReward.name}</h3>
                            <button onClick={() => setShowExchangeModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-600">Cần <span className="font-bold text-flame-600">{formatPoints(selectedReward.required_points)} điểm</span> để đổi</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chọn học sinh</label>
                                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none">
                                    <option value="">-- Chọn --</option>
                                    {students.filter(s => s.total_points >= selectedReward.required_points).map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({formatPoints(s.total_points)} đ)</option>
                                    ))}
                                </select>
                                {students.filter(s => s.total_points >= selectedReward.required_points).length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">Không có học sinh nào đủ điểm</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowExchangeModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button onClick={handleExchange} disabled={saving || !selectedStudent} className="flex-1 py-2.5 bg-gradient-to-r from-badge-300 to-badge-400 text-gray-800 rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}Xác nhận đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
