import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, BookOpen, Zap, TrendingDown, Shield, Medal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Criteria, Rank, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints } from '../lib/helpers';

export default function Settings() {
    const { showToast } = useToast();
    const [criteria, setCriteria] = useState<Criteria[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'criteria' | 'ranks' | 'classes'>('criteria');

    // Criteria form
    const [showCriteriaModal, setShowCriteriaModal] = useState(false);
    const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);
    const [criteriaForm, setCriteriaForm] = useState({ name: '', base_points: 10, type: 'positive' as string, icon: '📋', class_id: '' });

    // Class form
    const [showClassModal, setShowClassModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [classForm, setClassForm] = useState({ class_name: '', teacher_name: '', school_year: '' });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [criRes, rankRes, clsRes] = await Promise.all([
            supabase.from('criteria').select('*').eq('is_active', true).order('type'),
            supabase.from('ranks').select('*').order('sort_order'),
            supabase.from('classes').select('*').eq('is_active', true).order('class_name'),
        ]);
        setCriteria((criRes.data || []) as Criteria[]);
        setRanks((rankRes.data || []) as Rank[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    // === Criteria CRUD ===
    function openCreateCriteria() {
        setEditingCriteria(null);
        setCriteriaForm({ name: '', base_points: 10, type: 'positive', icon: '📋', class_id: classes[0]?.id || '' });
        setShowCriteriaModal(true);
    }

    function openEditCriteria(c: Criteria) {
        setEditingCriteria(c);
        setCriteriaForm({ name: c.name, base_points: c.base_points, type: c.type, icon: c.icon, class_id: c.class_id });
        setShowCriteriaModal(true);
    }

    async function handleSaveCriteria(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingCriteria) {
                await supabase.from('criteria').update(criteriaForm).eq('id', editingCriteria.id);
                showToast('success', 'Đã cập nhật tiêu chí');
            } else {
                await supabase.from('criteria').insert(criteriaForm);
                showToast('success', 'Đã thêm tiêu chí');
            }
            setShowCriteriaModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteCriteria(c: Criteria) {
        if (!confirm(`Xóa tiêu chí "${c.name}"?`)) return;
        await supabase.from('criteria').update({ is_active: false }).eq('id', c.id);
        showToast('success', 'Đã xóa');
        loadData();
    }

    // === Class CRUD ===
    function openCreateClass() {
        setEditingClass(null);
        setClassForm({ class_name: '', teacher_name: '', school_year: new Date().getFullYear().toString() });
        setShowClassModal(true);
    }

    function openEditClass(c: Class) {
        setEditingClass(c);
        setClassForm({ class_name: c.class_name, teacher_name: c.teacher_name, school_year: c.school_year });
        setShowClassModal(true);
    }

    async function handleSaveClass(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingClass) {
                await supabase.from('classes').update(classForm).eq('id', editingClass.id);
                showToast('success', 'Đã cập nhật lớp');
            } else {
                await supabase.from('classes').insert(classForm);
                showToast('success', 'Đã tạo lớp');
            }
            setShowClassModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteClass(c: Class) {
        if (!confirm(`Xóa lớp "${c.class_name}"?`)) return;
        await supabase.from('classes').update({ is_active: false }).eq('id', c.id);
        showToast('success', 'Đã xóa lớp');
        loadData();
    }

    const criteriaIcons = ['📋', '✅', '🎯', '📖', '✍️', '🗣️', '🧠', '💪', '🏃', '🎨', '❌', '⚠️', '😴', '📵', '🚫'];
    const positive = criteria.filter(c => c.type === 'positive');
    const negative = criteria.filter(c => c.type === 'negative');

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-800">Cài đặt</h1>
                <p className="text-sm text-gray-500 mt-1">Quản lý tiêu chí, cấp bậc và lớp học</p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 max-w-md">
                <button onClick={() => setTab('criteria')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'criteria' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    <Zap className="w-4 h-4 inline mr-1" /> Tiêu chí
                </button>
                <button onClick={() => setTab('ranks')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'ranks' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    <Medal className="w-4 h-4 inline mr-1" /> Cấp bậc
                </button>
                <button onClick={() => setTab('classes')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'classes' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    <BookOpen className="w-4 h-4 inline mr-1" /> Lớp học
                </button>
            </div>

            {/* Tab: Criteria */}
            {tab === 'criteria' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={openCreateCriteria} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
                            <Plus className="w-4 h-4" /> Thêm tiêu chí
                        </button>
                    </div>

                    {/* Positive */}
                    <div className="glass-strong rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> Cộng điểm ({positive.length})</h3>
                        <div className="space-y-2">
                            {positive.map(c => (
                                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 group">
                                    <span className="text-xl">{c.icon}</span>
                                    <div className="flex-1"><p className="text-sm font-semibold">{c.name}</p></div>
                                    <span className="text-sm font-bold text-emerald-600">+{c.base_points}</span>
                                    <div className="hidden group-hover:flex gap-1">
                                        <button onClick={() => openEditCriteria(c)} className="p-1 text-blue-400 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteCriteria(c)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                            {positive.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Chưa có</p>}
                        </div>
                    </div>

                    {/* Negative */}
                    <div className="glass-strong rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Trừ điểm ({negative.length})</h3>
                        <div className="space-y-2">
                            {negative.map(c => (
                                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 group">
                                    <span className="text-xl">{c.icon}</span>
                                    <div className="flex-1"><p className="text-sm font-semibold">{c.name}</p></div>
                                    <span className="text-sm font-bold text-red-600">-{c.base_points}</span>
                                    <div className="hidden group-hover:flex gap-1">
                                        <button onClick={() => openEditCriteria(c)} className="p-1 text-blue-400 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteCriteria(c)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                            {negative.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Chưa có</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Ranks */}
            {tab === 'ranks' && (
                <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">10 Cấp bậc Quân đội Việt Nam</h3>
                    <div className="space-y-3">
                        {ranks.map(r => (
                            <div key={r.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/50">
                                <span className="text-2xl">{r.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold" style={{ color: r.color }}>{r.rank_name}</p>
                                    <p className="text-xs text-gray-400">{r.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">{formatPoints(r.min_points)} điểm</p>
                                    <p className="text-xs font-semibold text-flame-600">x{r.multiplier}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Classes */}
            {tab === 'classes' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={openCreateClass} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
                            <Plus className="w-4 h-4" /> Thêm lớp
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map(c => (
                            <div key={c.id} className="glass-strong rounded-2xl p-5 hover-lift">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-military-500 to-military-600 flex items-center justify-center text-white">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditClass(c)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteClass(c)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-gray-800 mt-3">{c.class_name}</h3>
                                <p className="text-xs text-gray-400 mt-1">GV: {c.teacher_name || '—'}</p>
                                <p className="text-xs text-gray-400">Năm học: {c.school_year || '—'}</p>
                            </div>
                        ))}
                    </div>
                    {classes.length === 0 && <div className="text-center py-16 text-gray-400">Chưa có lớp nào</div>}
                </div>
            )}

            {/* Criteria Modal */}
            {showCriteriaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold">{editingCriteria ? 'Sửa tiêu chí' : 'Thêm tiêu chí'}</h3>
                            <button onClick={() => setShowCriteriaModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSaveCriteria} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {criteriaIcons.map(e => (
                                        <button key={e} type="button" onClick={() => setCriteriaForm({ ...criteriaForm, icon: e })}
                                            className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${criteriaForm.icon === e ? 'border-flame-500 bg-flame-50' : 'border-gray-200'}`}>{e}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên</label>
                                <input type="text" value={criteriaForm.name} onChange={e => setCriteriaForm({ ...criteriaForm, name: e.target.value })} required placeholder="VD: Trả lời đúng" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-flame-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Điểm cơ sở</label>
                                    <input type="number" value={criteriaForm.base_points} onChange={e => setCriteriaForm({ ...criteriaForm, base_points: parseInt(e.target.value) || 0 })} min={1} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-flame-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại</label>
                                    <select value={criteriaForm.type} onChange={e => setCriteriaForm({ ...criteriaForm, type: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none">
                                        <option value="positive">Cộng điểm</option>
                                        <option value="negative">Trừ điểm</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp</label>
                                <select value={criteriaForm.class_id} onChange={e => setCriteriaForm({ ...criteriaForm, class_id: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none">
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCriteriaModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingCriteria ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Class Modal */}
            {showClassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold">{editingClass ? 'Sửa lớp' : 'Tạo lớp mới'}</h3>
                            <button onClick={() => setShowClassModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSaveClass} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên lớp</label>
                                <input type="text" value={classForm.class_name} onChange={e => setClassForm({ ...classForm, class_name: e.target.value })} required placeholder="VD: 10A1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-flame-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Giáo viên chủ nhiệm</label>
                                <input type="text" value={classForm.teacher_name} onChange={e => setClassForm({ ...classForm, teacher_name: e.target.value })} placeholder="Nguyễn Văn A" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-flame-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Năm học</label>
                                <input type="text" value={classForm.school_year} onChange={e => setClassForm({ ...classForm, school_year: e.target.value })} placeholder="2025-2026" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-flame-500" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowClassModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingClass ? 'Cập nhật' : 'Tạo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
