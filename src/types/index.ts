// TypeScript interfaces cho App Quản lý Lớp học

export interface Profile {
    id: string;
    full_name: string;
    phone: string;
    role: 'teacher' | 'student';
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    class_name: string;
    teacher_name: string;
    school_year: string;
    is_active: boolean;
    created_by: string;
    created_at: string;
}

export interface Student {
    id: string;
    class_id: string;
    user_id: string | null;
    full_name: string;
    gender: 'male' | 'female' | 'other';
    total_points: number;
    current_rank: string;
    current_multiplier: number;
    avatar_url: string | null;
    is_active: boolean;
    created_at: string;
    // Joined
    class?: Class;
}

export interface Group {
    id: string;
    class_id: string;
    group_name: string;
    total_points: number;
    member_count: number;
    is_active: boolean;
    created_at: string;
    // Joined
    members?: GroupMember[];
}

export interface GroupMember {
    id: string;
    group_id: string;
    student_id: string;
    joined_at: string;
    // Joined
    student?: Student;
}

export interface Criteria {
    id: string;
    class_id: string;
    name: string;
    base_points: number;
    type: 'positive' | 'negative';
    icon: string;
    is_active: boolean;
    created_at: string;
}

export interface Rank {
    id: string;
    rank_name: string;
    min_points: number;
    multiplier: number;
    icon: string;
    color: string;
    description: string;
    sort_order: number;
}

export interface PointHistory {
    id: string;
    student_id: string;
    criteria_id: string | null;
    base_points: number;
    multiplier: number;
    final_points: number;
    note: string;
    created_by: string;
    created_at: string;
    // Joined
    student?: Student;
    criteria?: Criteria;
}

export interface Reward {
    id: string;
    class_id: string;
    name: string;
    required_points: number;
    icon: string;
    stock: number;
    is_active: boolean;
    created_at: string;
}

export interface RewardHistory {
    id: string;
    student_id: string;
    reward_id: string | null;
    points_spent: number;
    status: string;
    note: string;
    exchanged_at: string;
    // Joined
    student?: Student;
    reward?: Reward;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}
