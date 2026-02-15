import type { Rank } from '../types';

// Dữ liệu cấp bậc mặc định (dùng khi chưa load từ DB)
export const DEFAULT_RANKS: Omit<Rank, 'id'>[] = [
    { rank_name: 'Binh nhì', min_points: 0, multiplier: 1.0, icon: '🎖️', color: '#9CA3AF', description: 'Tân binh mới gia nhập', sort_order: 1 },
    { rank_name: 'Binh nhất', min_points: 50, multiplier: 1.1, icon: '🎖️', color: '#6B7280', description: 'Đã có kinh nghiệm cơ bản', sort_order: 2 },
    { rank_name: 'Hạ sĩ', min_points: 120, multiplier: 1.2, icon: '🏅', color: '#D97706', description: 'Chiến sĩ có tiềm năng', sort_order: 3 },
    { rank_name: 'Trung sĩ', min_points: 200, multiplier: 1.3, icon: '🏅', color: '#B45309', description: 'Chiến sĩ xuất sắc', sort_order: 4 },
    { rank_name: 'Thượng sĩ', min_points: 300, multiplier: 1.5, icon: '🏅', color: '#92400E', description: 'Chiến sĩ tinh nhuệ', sort_order: 5 },
    { rank_name: 'Thiếu úy', min_points: 450, multiplier: 1.7, icon: '🎗️', color: '#059669', description: 'Sĩ quan mới', sort_order: 6 },
    { rank_name: 'Trung úy', min_points: 650, multiplier: 2.0, icon: '🎗️', color: '#047857', description: 'Sĩ quan có kinh nghiệm', sort_order: 7 },
    { rank_name: 'Thượng úy', min_points: 900, multiplier: 2.3, icon: '🎗️', color: '#065F46', description: 'Sĩ quan giỏi', sort_order: 8 },
    { rank_name: 'Đại úy', min_points: 1200, multiplier: 2.5, icon: '🥇', color: '#1D4ED8', description: 'Sĩ quan cao cấp', sort_order: 9 },
    { rank_name: 'Thiếu tá', min_points: 1600, multiplier: 3.0, icon: '⭐', color: '#7C3AED', description: 'Cấp bậc cao nhất', sort_order: 10 },
];

// Lấy thông tin rank theo tên
export function getRankInfo(rankName: string) {
    return DEFAULT_RANKS.find(r => r.rank_name === rankName) || DEFAULT_RANKS[0];
}

// Lấy rank tiếp theo
export function getNextRank(currentPoints: number) {
    const sorted = [...DEFAULT_RANKS].sort((a, b) => a.min_points - b.min_points);
    return sorted.find(r => r.min_points > currentPoints);
}

// Tính % tiến trình đến cấp tiếp theo
export function getRankProgress(totalPoints: number): number {
    const sorted = [...DEFAULT_RANKS].sort((a, b) => a.min_points - b.min_points);
    const currentRankIdx = sorted.findIndex((r, i) => {
        const next = sorted[i + 1];
        return !next || totalPoints < next.min_points;
    });

    if (currentRankIdx === sorted.length - 1) return 100;

    const current = sorted[currentRankIdx];
    const next = sorted[currentRankIdx + 1];
    const progress = ((totalPoints - current.min_points) / (next.min_points - current.min_points)) * 100;
    return Math.min(Math.max(progress, 0), 100);
}

// Format ngày tháng tiếng Việt
export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Format số điểm
export function formatPoints(points: number): string {
    return points.toLocaleString('vi-VN');
}

// Lấy gender label
export function getGenderLabel(gender: string): string {
    const map: Record<string, string> = {
        male: 'Nam',
        female: 'Nữ',
        other: 'Khác',
    };
    return map[gender] || gender;
}

// Tạo avatar URL từ tên
export function getAvatarUrl(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6B35&color=fff&bold=true&size=128`;
}
