import { useEffect, useState } from 'react';
import { Gift, ShoppingBag, Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Student, Reward, RewardHistory } from '../types';
import { useToast } from '../components/Toast';
import { formatPoints, formatDateTime } from '../lib/helpers';

export default function StudentRewards() {
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const [student, setStudent] = useState<Student | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [history, setHistory] = useState<RewardHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [exchanging, setExchanging] = useState('');

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    async function loadData() {
        const stuRes = await supabase.from('students').select('*').eq('user_id', user!.id).maybeSingle();
        const stu = stuRes.data as Student | null;
        setStudent(stu);

        const [rwRes, hisRes] = await Promise.all([
            supabase.from('rewards').select('*').eq('is_active', true).order('required_points'),
            stu ? supabase.from('reward_history').select('*, reward:rewards(name, icon)').eq('student_id', stu.id).order('exchanged_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        ]);
        setRewards((rwRes.data || []) as Reward[]);
        setHistory((hisRes.data || []) as RewardHistory[]);
        setLoading(false);
    }

    async function handleExchange(reward: Reward) {
        if (!student) return;
        if (student.total_points < reward.required_points) {
            showToast('warning', 'Bạn không đủ điểm để đổi');
            return;
        }
        if (!confirm(`Đổi "${reward.name}" với ${formatPoints(reward.required_points)} điểm?`)) return;
        setExchanging(reward.id);
        try {
            const { data, error } = await supabase.rpc('exchange_reward', {
                p_student_id: student.id,
                p_reward_id: reward.id,
                p_note: '',
            });
            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error);
            showToast('success', `🎉 Đổi thành công! Trừ ${formatPoints(result.points_spent)} điểm`);
            loadData();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setExchanging('');
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-flame-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    if (!student) {
        return <div className="text-center py-20 text-gray-400">Chưa liên kết tài khoản</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Points display */}
            <div className="glass-strong rounded-2xl p-5 text-center">
                <p className="text-sm text-gray-500">Số điểm hiện có</p>
                <p className="text-3xl font-extrabold text-flame-600">{formatPoints(student.total_points)}</p>
            </div>

            {/* Rewards Grid */}
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-badge-300" />
                    Phần thưởng có thể đổi
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rewards.map(reward => {
                        const canAfford = student.total_points >= reward.required_points;
                        return (
                            <div key={reward.id} className={`glass-strong rounded-2xl p-5 hover-lift ${!canAfford ? 'opacity-60' : ''}`}>
                                <div className="text-4xl mb-3">{reward.icon}</div>
                                <h3 className="text-sm font-bold text-gray-800">{reward.name}</h3>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-lg font-extrabold text-flame-600">{formatPoints(reward.required_points)} đ</span>
                                    <span className="text-xs text-gray-400">{reward.stock === -1 ? '∞' : reward.stock} còn</span>
                                </div>
                                <button
                                    onClick={() => handleExchange(reward)}
                                    disabled={!canAfford || exchanging === reward.id || reward.stock === 0}
                                    className={`w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${canAfford
                                            ? 'bg-gradient-to-r from-badge-300 to-badge-400 text-gray-800 hover:shadow-md'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {exchanging === reward.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                    )}
                                    {canAfford ? 'Đổi ngay' : 'Không đủ điểm'}
                                </button>
                            </div>
                        );
                    })}
                </div>
                {rewards.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Chưa có phần thưởng</div>}
            </div>

            {/* Exchange History */}
            {history.length > 0 && (
                <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Lịch sử đổi quà
                    </h3>
                    <div className="space-y-2">
                        {history.map(h => (
                            <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/50">
                                <span className="text-lg">{(h.reward as any)?.icon || '🎁'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{(h.reward as any)?.name || 'Phần thưởng'}</p>
                                    <p className="text-[10px] text-gray-400">{formatDateTime(h.exchanged_at)}</p>
                                </div>
                                <span className="text-xs font-bold text-red-600">-{formatPoints(h.points_spent)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
