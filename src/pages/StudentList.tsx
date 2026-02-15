import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Loader2, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, getRankInfo, getAvatarUrl, getGenderLabel } from '../lib/helpers';

export default function StudentList() {
    const { showToast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [form, setForm] = useState({
        full_name: '',
        gender: 'male' as string,
        class_id: '',
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [stuRes, clsRes] = await Promise.all([
            supabase.from('students').select('*').eq('is_active', true).order('full_name'),
            supabase.from('classes').select('*').eq('is_active', true).order('class_name'),
        ]);
        setStudents((stuRes.data || []) as Student[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    function openCreate() {
        setEditing(null);
        setForm({ full_name: '', gender: 'male', class_id: classes[0]?.id || '' });
        setShowModal(true);
    }

    function openEdit(student: Student) {
        setEditing(student);
        setForm({ full_name: student.full_name, gender: student.gender, class_id: student.class_id });
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                const { error } = await supabase.from('students').update(form).eq('id', editing.id);
                if (error) throw error;
                showToast('success', 'Đã cập nhật học sinh');
            } else {
                const { error } = await supabase.from('students').insert(form);
                if (error) throw error;
                showToast('success', 'Đã thêm học sinh mới');
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(student: Student) {
        if (!confirm(`Xóa học sinh "${student.full_name}"?`)) return;
        const { error } = await supabase.from('students').update({ is_active: false }).eq('id', student.id);
        if (error) {
            showToast('error', error.message);
        } else {
            showToast('success', 'Đã xóa học sinh');
            loadData();
        }
    }

    const filtered = students.filter(s => {
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Quản lý Học sinh</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} học sinh</p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Thêm học sinh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm theo tên..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none bg-white/50"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none bg-white/50 appearance-none"
                    >
                        <option value="">Tất cả lớp</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(student => {
                    const rankInfo = getRankInfo(student.current_rank);
                    return (
                        <div key={student.id} className="glass-strong rounded-2xl p-4 hover-lift">
                            <div className="flex items-start gap-3">
                                <img
                                    src={student.avatar_url || getAvatarUrl(student.full_name)}
                                    alt={student.full_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{student.full_name}</p>
                                    <div className="rank-badge mt-1" style={{ background: `${rankInfo.color}15`, color: rankInfo.color, borderColor: `${rankInfo.color}30` }}>
                                        <span>{rankInfo.icon}</span>
                                        <span>{student.current_rank}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(student)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(student)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-400">
                                    {getGenderLabel(student.gender)} · x{student.current_multiplier}
                                </span>
                                <span className="text-sm font-bold text-flame-600">{formatPoints(student.total_points)} điểm</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">Chưa có học sinh</p>
                    <p className="text-sm mt-1">Bấm "Thêm học sinh" để bắt đầu</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editing ? 'Sửa học sinh' : 'Thêm học sinh mới'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    required
                                    placeholder="Nguyễn Văn A"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
                                <select
                                    value={form.gender}
                                    onChange={e => setForm({ ...form, gender: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                >
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp</label>
                                <select
                                    value={form.class_id}
                                    onChange={e => setForm({ ...form, class_id: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                >
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.class_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editing ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
