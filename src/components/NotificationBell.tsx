import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Notification } from '../types';
import { formatDateTime } from '../lib/helpers';

export default function NotificationBell() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!user) return;
        loadNotifications();

        // Realtime subscription
        const channel = supabase
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadNotifications() {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(20);
        setNotifications((data || []) as Notification[]);
    }

    async function markAsRead(id: string) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }

    async function markAllRead() {
        const ids = notifications.filter(n => !n.is_read).map(n => n.id);
        if (ids.length === 0) return;
        await supabase.from('notifications').update({ is_read: true }).in('id', ids);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    const typeIcons: Record<string, string> = {
        points_added: '⚡',
        points_subtracted: '📉',
        reward_exchanged: '🎁',
        rank_up: '🎖️',
        student_registered: '📝',
        account_approved: '✅',
        account_rejected: '❌',
        info: 'ℹ️',
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2.5 rounded-xl hover:bg-white/80 transition-colors"
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-scale-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-flame-500 hover:text-flame-600 font-medium flex items-center gap-1"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Chưa có thông báo
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.is_read && markAsRead(n.id)}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-flame-50/30' : ''
                                        }`}
                                >
                                    <span className="text-lg mt-0.5">{typeIcons[n.type] || '📋'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                                    </div>
                                    {!n.is_read && (
                                        <div className="w-2 h-2 bg-flame-500 rounded-full mt-2 flex-shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
