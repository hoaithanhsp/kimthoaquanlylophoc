import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, X, Loader2, Filter, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, Class } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, getRankInfo, getAvatarUrl, getGenderLabel } from '../lib/helpers';
import * as XLSX from 'xlsx';

interface ExcelRow {
    full_name: string;
    student_code: string;
    birthday: string;
    class_name: string;
}

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

    // Excel import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<ExcelRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // ========== EXCEL IMPORT ==========
    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

                // Map cột tiếng Việt → key
                const mapped: ExcelRow[] = jsonData.map((row: any) => {
                    // Hỗ trợ nhiều tên cột
                    const fullName = row['Họ và tên'] || row['Ho va ten'] || row['full_name'] || row['Tên'] || '';
                    const code = row['Mã số học sinh'] || row['Ma so hoc sinh'] || row['student_code'] || row['Mã HS'] || '';
                    const birthday = row['Ngày sinh'] || row['Ngay sinh'] || row['birthday'] || '';
                    const className = row['Lớp'] || row['Lop'] || row['class'] || '';

                    // Xử lý ngày sinh (Excel có thể trả về số serial)
                    let birthdayStr = '';
                    if (birthday) {
                        if (typeof birthday === 'number') {
                            // Excel serial date
                            const date = XLSX.SSF.parse_date_code(birthday);
                            if (date) {
                                birthdayStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                            }
                        } else {
                            // Chuỗi ngày: DD/MM/YYYY → YYYY-MM-DD
                            const parts = String(birthday).split('/');
                            if (parts.length === 3) {
                                birthdayStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            } else {
                                birthdayStr = String(birthday);
                            }
                        }
                    }

                    return {
                        full_name: String(fullName).trim(),
                        student_code: String(code).trim(),
                        birthday: birthdayStr,
                        class_name: String(className).trim(),
                    };
                }).filter((r: ExcelRow) => r.full_name); // Bỏ hàng trống

                setImportData(mapped);
                setImportResult(null);
                setShowImportModal(true);
            } catch (err) {
                showToast('error', 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.');
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleImport() {
        if (importData.length === 0) return;
        setImporting(true);
        const errors: string[] = [];
        let success = 0;

        try {
            // 1. Lấy danh sách lớp hiện có
            const { data: existingClasses } = await supabase
                .from('classes').select('*').eq('is_active', true);
            const classMap = new Map<string, string>();
            (existingClasses || []).forEach((c: any) => {
                classMap.set(c.class_name.toLowerCase(), c.id);
            });

            // 2. Tìm các lớp mới cần tạo
            const newClassNames = new Set<string>();
            importData.forEach(row => {
                if (row.class_name && !classMap.has(row.class_name.toLowerCase())) {
                    newClassNames.add(row.class_name);
                }
            });

            // 3. Tạo lớp mới
            if (newClassNames.size > 0) {
                const newClasses = Array.from(newClassNames).map(name => ({
                    class_name: name,
                    teacher_name: '',
                    school_year: new Date().getFullYear().toString(),
                }));
                const { data: createdClasses, error: classError } = await supabase
                    .from('classes').insert(newClasses).select();
                if (classError) {
                    errors.push(`Lỗi tạo lớp: ${classError.message}`);
                } else {
                    (createdClasses || []).forEach((c: any) => {
                        classMap.set(c.class_name.toLowerCase(), c.id);
                    });
                }
            }

            // 4. Chuẩn bị dữ liệu học sinh
            const studentsToInsert = importData
                .map((row, i) => {
                    if (!row.full_name) {
                        errors.push(`Dòng ${i + 2}: Thiếu họ tên`);
                        return null;
                    }
                    const classId = row.class_name
                        ? classMap.get(row.class_name.toLowerCase())
                        : null;
                    if (row.class_name && !classId) {
                        errors.push(`Dòng ${i + 2}: Không tìm thấy lớp "${row.class_name}"`);
                        return null;
                    }
                    return {
                        full_name: row.full_name,
                        student_code: row.student_code || null,
                        birthday: row.birthday || null,
                        class_id: classId || null,
                        gender: 'male', // mặc định
                    };
                })
                .filter(Boolean);

            // 5. Insert hàng loạt (batch 50)
            for (let i = 0; i < studentsToInsert.length; i += 50) {
                const batch = studentsToInsert.slice(i, i + 50);
                const { error } = await supabase.from('students').insert(batch);
                if (error) {
                    errors.push(`Lỗi nhập dòng ${i + 2}-${i + batch.length + 1}: ${error.message}`);
                } else {
                    success += batch.length;
                }
            }
        } catch (err: any) {
            errors.push(`Lỗi: ${err.message}`);
        }

        setImportResult({ success, errors });
        setImporting(false);
        if (success > 0) loadData();
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
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        Nhập Excel
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-flame-500 to-flame-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm học sinh
                    </button>
                </div>
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
                                    {student.student_code && (
                                        <p className="text-xs text-gray-400">{student.student_code}</p>
                                    )}
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
                    <p className="text-sm mt-1">Bấm "Thêm học sinh" hoặc "Nhập Excel" để bắt đầu</p>
                </div>
            )}

            {/* Modal Thêm/Sửa */}
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

            {/* Modal Import Excel */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-scale-in max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Nhập từ Excel</h3>
                                    <p className="text-xs text-gray-400">{importData.length} học sinh được tìm thấy</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Kết quả import */}
                        {importResult && (
                            <div className="mx-5 mt-4">
                                {importResult.success > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-700 text-sm mb-2">
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                        <span>Đã nhập thành công <strong>{importResult.success}</strong> học sinh!</span>
                                    </div>
                                )}
                                {importResult.errors.length > 0 && (
                                    <div className="p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium">{importResult.errors.length} lỗi:</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs space-y-0.5 max-h-20 overflow-y-auto">
                                            {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Preview bảng */}
                        <div className="flex-1 overflow-auto p-5">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Họ và tên</th>
                                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Mã số HS</th>
                                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Ngày sinh</th>
                                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Lớp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importData.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                                            <td className="py-2 px-3 font-medium text-gray-800">{row.full_name}</td>
                                            <td className="py-2 px-3 text-gray-600">{row.student_code || '-'}</td>
                                            <td className="py-2 px-3 text-gray-600">{row.birthday || '-'}</td>
                                            <td className="py-2 px-3">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                                    {row.class_name || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-5 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Lớp chưa có sẽ được <strong>tự động tạo mới</strong>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }}
                                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Đóng
                                </button>
                                {!importResult && (
                                    <button
                                        onClick={handleImport}
                                        disabled={importing || importData.length === 0}
                                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {importing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang nhập...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Nhập {importData.length} học sinh
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

