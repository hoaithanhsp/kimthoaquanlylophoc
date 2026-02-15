import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, X, Loader2, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Group, GroupMember, Student, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, getAvatarUrl, getRankInfo } from '../lib/helpers';

export default function GroupManagement() {
    const { showToast } = useToast();
    const [groups, setGroups] = useState<Group[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupForm, setGroupForm] = useState({ group_name: '', class_id: '' });
    const [selectedStudentId, setSelectedStudentId] = useState('');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [grpRes, memRes, stuRes, clsRes] = await Promise.all([
            supabase.from('groups').select('*').eq('is_active', true).order('total_points', { ascending: false }),
            supabase.from('group_members').select('*, student:students(*)'),
            supabase.from('students').select('*').eq('is_active', true).order('full_name'),
            supabase.from('classes').select('*').eq('is_active', true),
        ]);
        setGroups((grpRes.data || []) as Group[]);
        setMembers((memRes.data || []) as GroupMember[]);
        setStudents((stuRes.data || []) as Student[]);
        setClasses((clsRes.data || []) as Class[]);
        setLoading(false);
    }

    async function handleCreateGroup(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('groups').insert(groupForm);
            if (error) throw error;
            showToast('success', 'Đã tạo nhóm mới');
            setShowCreateModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGroup || !selectedStudentId) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('group_members').insert({
                group_id: selectedGroup.id,
                student_id: selectedStudentId,
            });
            if (error) throw error;

            // Cập nhật member_count
            const count = members.filter(m => m.group_id === selectedGroup.id).length + 1;
            await supabase.from('groups').update({ member_count: count }).eq('id', selectedGroup.id);

            showToast('success', 'Đã thêm thành viên');
            setShowAddMemberModal(false);
            loadData();
        } catch (err: any) {
            showToast('error', err.message || 'Học sinh đã có trong nhóm');
        } finally {
            setSaving(false);
        }
    }

    async function handleRemoveMember(memberId: string, groupId: string) {
        if (!confirm('Xóa thành viên khỏi nhóm?')) return;
        await supabase.from('group_members').delete().eq('id', memberId);
        const count = members.filter(m => m.group_id === groupId && m.id !== memberId).length;
        await supabase.from('groups').update({ member_count: count }).eq('id', groupId);
        showToast('success', 'Đã xóa thành viên');
        loadData();
    }

    async function handleDeleteGroup(group: Group) {
        if (!confirm(`Xóa nhóm "${group.group_name}"?`)) return;
        await supabase.from('groups').update({ is_active: false }).eq('id', group.id);
        showToast('success', 'Đã xóa nhóm');
        loadData();
    }

    function getGroupMembers(groupId: string) {
        return members.filter(m => m.group_id === groupId);
    }

    // Lọc students chưa có trong nhóm đang chọn
    function getAvailableStudents() {
        if (!selectedGroup) return students;
        const memberIds = members.filter(m => m.group_id === selectedGroup.id).map(m => m.student_id);
        return students.filter(s => !memberIds.includes(s.id));
    }

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
                    <h1 className="text-2xl font-extrabold text-gray-800">Quản lý Nhóm</h1>
                    <p className="text-sm text-gray-500 mt-1">{groups.length} nhóm</p>
                </div>
                <button
                    onClick={() => { setGroupForm({ group_name: '', class_id: classes[0]?.id || '' }); setShowCreateModal(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Tạo nhóm
                </button>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groups.map(group => {
                    const gMembers = getGroupMembers(group.id);
                    return (
                        <div key={group.id} className="glass-strong rounded-2xl p-5 hover-lift">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                                        <UsersRound className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800">{group.group_name}</h3>
                                        <p className="text-xs text-gray-400">{gMembers.length} thành viên · {formatPoints(group.total_points)} điểm</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setSelectedGroup(group); setSelectedStudentId(''); setShowAddMemberModal(true); }}
                                        className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Thêm thành viên"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(group)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Xóa nhóm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Members */}
                            <div className="space-y-2">
                                {gMembers.map(member => {
                                    const student = member.student as Student | undefined;
                                    if (!student) return null;
                                    const rankInfo = getRankInfo(student.current_rank);
                                    return (
                                        <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/50 group">
                                            <img
                                                src={student.avatar_url || getAvatarUrl(student.full_name)}
                                                alt={student.full_name}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-700 truncate">{student.full_name}</p>
                                                <p className="text-[10px] text-gray-400">{rankInfo.icon} {student.current_rank} · {formatPoints(student.total_points)} đ</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(member.id, group.id)}
                                                className="hidden group-hover:block p-1 text-red-400 hover:text-red-500"
                                                title="Xóa khỏi nhóm"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                                {gMembers.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-3">Chưa có thành viên</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {groups.length === 0 && (
                <div className="text-center py-16 text-gray-400">Chưa có nhóm nào</div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Tạo nhóm mới</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên nhóm</label>
                                <input
                                    type="text"
                                    value={groupForm.group_name}
                                    onChange={e => setGroupForm({ ...groupForm, group_name: e.target.value })}
                                    required
                                    placeholder="Nhóm 1"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp</label>
                                <select
                                    value={groupForm.class_id}
                                    onChange={e => setGroupForm({ ...groupForm, class_id: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                >
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Tạo nhóm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Thêm thành viên - {selectedGroup.group_name}</h3>
                            <button onClick={() => setShowAddMemberModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chọn học sinh</label>
                                <select
                                    value={selectedStudentId}
                                    onChange={e => setSelectedStudentId(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 focus:border-transparent outline-none"
                                >
                                    <option value="">-- Chọn học sinh --</option>
                                    {getAvailableStudents().map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({formatPoints(s.total_points)} đ)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddMemberModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Hủy</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Thêm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
