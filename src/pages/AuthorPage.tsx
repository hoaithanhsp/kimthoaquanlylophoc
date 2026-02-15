import { Mail, MapPin, School, User, Heart } from 'lucide-react';

export default function AuthorPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h1 className="text-2xl font-extrabold text-gray-800">Tác giả</h1>

            {/* Card chính */}
            <div className="glass-strong rounded-2xl overflow-hidden">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-flame-400 via-flame-500 to-amber-500 relative">
                    <div className="absolute inset-0 bg-[url('/logo.jpg')] bg-center bg-cover opacity-20" />
                    <div className="absolute -bottom-12 left-6">
                        <img
                            src="/avatar.jpg"
                            alt="Tác giả"
                            className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl object-cover"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="pt-14 pb-6 px-6">
                    <h2 className="text-xl font-extrabold text-gray-800">Trần Thị Kim Thoa</h2>
                    <p className="text-sm text-flame-500 font-semibold mt-1">Giáo viên</p>

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <School className="w-4 h-4 text-blue-500" />
                            </div>
                            <span>Trường THPT Hoàng Diệu</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span>Số 1 Mạc Đĩnh Chi, phường Phú Lợi, thành phố Cần Thơ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Giới thiệu app */}
            <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-400" />
                    Về ứng dụng
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                    <strong>Lớp học Pro</strong> là ứng dụng quản lý lớp học theo phương pháp
                    <strong> Gamification</strong> (trò chơi hóa). Học sinh được tích điểm,
                    thăng cấp bậc và đổi phần thưởng thông qua các hoạt động học tập tích cực.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-flame-50 rounded-xl">
                        <p className="text-lg font-bold text-flame-600">🎮</p>
                        <p className="text-xs text-gray-500 mt-1">Gamification</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <p className="text-lg font-bold text-blue-600">📊</p>
                        <p className="text-xs text-gray-500 mt-1">Theo dõi</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                        <p className="text-lg font-bold text-emerald-600">🏆</p>
                        <p className="text-xs text-gray-500 mt-1">Phần thưởng</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 pb-4">
                © {new Date().getFullYear()} Lớp học Pro · Phát triển bởi Trần Thị Kim Thoa
            </p>
        </div>
    );
}
