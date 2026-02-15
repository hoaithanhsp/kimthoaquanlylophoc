import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Dice5, Volume2, History, Play, Pause, RotateCcw, Shuffle, X, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPoints, formatDateTime } from '../lib/helpers';

// ==================== BẤM GIỜ ====================
function StopwatchTool() {
    const [mode, setMode] = useState<'countdown' | 'countup'>('countdown');
    const [time, setTime] = useState(300); // 5 phút mặc định
    const [initialTime, setInitialTime] = useState(300);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setTime(prev => {
                    if (mode === 'countdown') {
                        if (prev <= 1) {
                            setRunning(false);
                            setFinished(true);
                            playBeep();
                            return 0;
                        }
                        return prev - 1;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running, mode]);

    function playBeep() {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 500);
        } catch { }
    }

    function reset() {
        setRunning(false);
        setFinished(false);
        setTime(mode === 'countdown' ? initialTime : 0);
    }

    function adjustTime(delta: number) {
        if (running) return;
        const newTime = Math.max(0, initialTime + delta);
        setInitialTime(newTime);
        setTime(newTime);
        setFinished(false);
    }

    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const progress = mode === 'countdown' && initialTime > 0 ? ((initialTime - time) / initialTime) * 100 : 0;

    return (
        <div className="text-center space-y-5">
            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-gray-100 p-1 max-w-xs mx-auto">
                <button onClick={() => { setMode('countdown'); reset(); setInitialTime(300); setTime(300); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'countdown' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    Đếm ngược
                </button>
                <button onClick={() => { setMode('countup'); reset(); setTime(0); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'countup' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500'}`}>
                    Bấm giờ
                </button>
            </div>

            {/* Time Adjust (countdown only) */}
            {mode === 'countdown' && !running && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => adjustTime(-60)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-500 w-20">{Math.floor(initialTime / 60)} phút</span>
                    <button onClick={() => adjustTime(60)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            )}

            {/* Timer Display */}
            <div className="relative w-44 h-44 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                    {mode === 'countdown' && (
                        <circle cx="50" cy="50" r="45" fill="none" stroke={finished ? '#ef4444' : '#f97316'}
                            strokeWidth="6" strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                            strokeLinecap="round" className="transition-all duration-1000" />
                    )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-4xl font-black tabular-nums ${finished ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
                <button onClick={reset}
                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                    <RotateCcw className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => { setRunning(!running); setFinished(false); }}
                    className={`px-8 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all ${running ? 'bg-red-500' : 'bg-gradient-to-r from-flame-500 to-flame-600'}`}>
                    {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}

// ==================== GỌI TÊN NGẪU NHIÊN ====================
function RandomPickerTool() {
    const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
    const [count, setCount] = useState(1);
    const [picked, setPicked] = useState<string[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState<{ id: string; class_name: string }[]>([]);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (classId) loadStudents();
    }, [classId]);

    async function loadClasses() {
        const { data } = await supabase.from('classes').select('id, class_name').eq('is_active', true);
        const cls = (data || []) as { id: string; class_name: string }[];
        setClasses(cls);
        if (cls.length > 0) setClassId(cls[0].id);
    }

    async function loadStudents() {
        const { data } = await supabase.from('students').select('id, full_name').eq('class_id', classId).eq('is_active', true);
        setStudents((data || []) as { id: string; full_name: string }[]);
    }

    function pickRandom() {
        if (students.length === 0) return;
        setSpinning(true);
        setPicked([]);

        let iterations = 0;
        const maxIterations = 15;
        const interval = setInterval(() => {
            const shuffled = [...students].sort(() => Math.random() - 0.5);
            setPicked(shuffled.slice(0, Math.min(count, students.length)).map(s => s.full_name));
            iterations++;
            if (iterations >= maxIterations) {
                clearInterval(interval);
                const final = [...students].sort(() => Math.random() - 0.5);
                setPicked(final.slice(0, Math.min(count, students.length)).map(s => s.full_name));
                setSpinning(false);
            }
        }, 100);
    }

    return (
        <div className="space-y-5">
            {/* Class Select */}
            <select value={classId} onChange={e => setClassId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none">
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>

            {/* Count */}
            <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-gray-500">Số lượng:</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCount(Math.max(1, count - 1))}
                        className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-8 text-center font-bold text-lg">{count}</span>
                    <button onClick={() => setCount(Math.min(5, count + 1))}
                        className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><Plus className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Pick Button */}
            <button onClick={pickRandom} disabled={spinning || students.length === 0}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Shuffle className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
                {spinning ? 'Đang chọn...' : 'Gọi tên ngẫu nhiên'}
            </button>

            {/* Results */}
            {picked.length > 0 && (
                <div className="space-y-2">
                    {picked.map((name, i) => (
                        <div key={i} className={`p-4 rounded-xl text-center font-bold text-lg transition-all ${spinning ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-amber-50 to-orange-50 text-flame-700 border-2 border-flame-200 animate-scale-in'}`}>
                            🎯 {name}
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-gray-400 text-center">{students.length} học sinh trong lớp</p>
        </div>
    );
}

// ==================== ĐO ÂM THANH ====================
function SoundMeterTool() {
    const [level, setLevel] = useState(0);
    const [maxLevel, setMaxLevel] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animRef = useRef<number>(0);

    const startListening = useCallback(async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            setIsListening(true);

            function updateLevel() {
                if (!analyserRef.current) return;
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
                const normalized = Math.min(100, Math.round(avg * 1.5));
                setLevel(normalized);
                setMaxLevel(prev => Math.max(prev, normalized));
                animRef.current = requestAnimationFrame(updateLevel);
            }
            updateLevel();
        } catch {
            setError('Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.');
        }
    }, []);

    function stopListening() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (animRef.current) cancelAnimationFrame(animRef.current);
        analyserRef.current = null;
        setIsListening(false);
    }

    useEffect(() => {
        return () => { stopListening(); };
    }, []);

    function getColor() {
        if (level < 30) return '#22c55e'; // green
        if (level < 60) return '#f59e0b'; // amber
        return '#ef4444'; // red
    }

    function getLabel() {
        if (level < 20) return 'Yên lặng 🤫';
        if (level < 40) return 'Nhỏ nhẹ 🙂';
        if (level < 60) return 'Vừa phải 😊';
        if (level < 80) return 'Ồn ào 😮';
        return 'Rất to! 🔥';
    }

    return (
        <div className="space-y-5 text-center">
            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Meter */}
            <div className="relative w-44 h-44 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={getColor()}
                        strokeWidth="8" strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - level / 100)}`}
                        strokeLinecap="round" className="transition-all duration-150" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black" style={{ color: getColor() }}>{level}</span>
                    <span className="text-xs text-gray-400 mt-1">{getLabel()}</span>
                </div>
            </div>

            {/* Max level */}
            <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-gray-500">Max: <strong className="text-gray-800">{maxLevel}</strong></span>
                <button onClick={() => setMaxLevel(0)} className="text-xs text-flame-500 hover:underline">Reset</button>
            </div>

            {/* Controls */}
            <button onClick={isListening ? stopListening : startListening}
                className={`w-full py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all ${isListening ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
                {isListening ? '⏹ Dừng' : '🎤 Bắt đầu đo'}
            </button>
        </div>
    );
}

// ==================== LỊCH SỬ ĐIỂM ====================
function PointHistoryTool() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState<{ id: string; class_name: string }[]>([]);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (classId) loadHistory();
    }, [classId]);

    async function loadClasses() {
        const { data } = await supabase.from('classes').select('id, class_name').eq('is_active', true);
        const cls = (data || []) as { id: string; class_name: string }[];
        setClasses(cls);
        if (cls.length > 0) setClassId(cls[0].id);
    }

    async function loadHistory() {
        setLoading(true);
        const { data } = await supabase
            .from('point_history')
            .select('*, student:students(full_name, class_id), criteria:criteria(name, type)')
            .order('created_at', { ascending: false })
            .limit(50);
        const all = (data || []) as any[];
        // Filter by class
        const filtered = classId ? all.filter(h => h.student?.class_id === classId) : all;
        setHistory(filtered);
        setLoading(false);
    }

    return (
        <div className="space-y-4">
            {/* Class filter */}
            <select value={classId} onChange={e => setClassId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-flame-500 outline-none">
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>

            {/* History list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-6 h-6 border-3 border-flame-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">Chưa có lịch sử điểm</p>
                ) : (
                    history.map(h => (
                        <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${h.final_points >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {h.final_points >= 0 ? '+' : ''}{h.final_points}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{h.student?.full_name || '—'}</p>
                                <p className="text-xs text-gray-400 truncate">{h.criteria?.name || h.note || '—'}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : ''}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ==================== TRANG CHÍNH ====================
export default function ToolsPage() {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const tools = [
        { id: 'timer', icon: Timer, label: 'Bấm giờ', desc: 'Đếm ngược, đếm thời gian', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
        { id: 'random', icon: Dice5, label: 'Gọi tên ngẫu nhiên', desc: 'Gọi 1-5 học sinh ngẫu nhiên', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
        { id: 'sound', icon: Volume2, label: 'Đo âm thanh', desc: 'Đo tiếng ồn, luyện đọc to', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
        { id: 'history', icon: History, label: 'Lịch sử điểm', desc: 'Xem lịch sử cộng/trừ điểm', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-extrabold text-gray-800">⚡ Tính năng Bổ trợ</h1>

            {/* Tool Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {tools.map(tool => (
                    <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                        className={`glass-strong rounded-2xl p-5 text-center hover-lift transition-all border-2 ${activeTool === tool.id ? 'border-flame-400 shadow-lg' : 'border-transparent'}`}>
                        <div className={`w-14 h-14 mx-auto rounded-2xl ${tool.bg} flex items-center justify-center mb-3`}>
                            <tool.icon className="w-7 h-7 text-gray-700" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">{tool.label}</h3>
                        <p className="text-xs text-gray-400 mt-1">{tool.desc}</p>
                    </button>
                ))}
            </div>

            {/* Active Tool Panel */}
            {activeTool && (
                <div className="glass-strong rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-gray-800">
                            {tools.find(t => t.id === activeTool)?.label}
                        </h2>
                        <button onClick={() => setActiveTool(null)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    {activeTool === 'timer' && <StopwatchTool />}
                    {activeTool === 'random' && <RandomPickerTool />}
                    {activeTool === 'sound' && <SoundMeterTool />}
                    {activeTool === 'history' && <PointHistoryTool />}
                </div>
            )}
        </div>
    );
}
