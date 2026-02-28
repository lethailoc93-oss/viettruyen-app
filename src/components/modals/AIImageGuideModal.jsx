import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Globe, Cpu, Zap, Link } from 'lucide-react';

export default function AIImageGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.25 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    background: 'var(--bg-primary, #0f0f1a)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    flexShrink: 0,
                }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                        <Zap size={18} className="text-warning" />
                        Hệ Thống Vẽ Ảnh Thông Minh
                    </h3>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        style={{ padding: '6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-md)',
                }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '4px', lineHeight: '1.5' }}>
                        Trợ lý ảo tự động chọn phương thức vẽ ảnh tốt nhất dựa trên tình trạng mạng. Hệ thống <strong>tự động chuyển đổi</strong> xuống các phương án dự phòng nếu gặp sự cố.
                    </p>

                    {/* Netlify Function */}
                    <div className="guide-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Server size={16} className="text-primary" />
                            <h4 style={{ margin: 0, color: 'var(--color-text)' }}>1. Máy Chủ Chính</h4>
                            <span style={{ fontSize: '0.65rem', background: 'var(--color-primary)', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>Ưu tiên số 1</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Kết nối trực tiếp tốc độ cao để tạo ảnh phong cách Anime/Fantasy tuyệt đẹp.</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                            <span style={{ color: 'var(--color-warning)' }}>Thỉnh thoảng bị lỗi nếu lưu lượng truy cập toàn cầu quá cao.</span>
                        </div>
                    </div>

                    {/* Render Proxy */}
                    <div className="guide-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Server size={16} className="text-warning" />
                            <h4 style={{ margin: 0, color: 'var(--color-text)' }}>2. Máy Chủ Dự Phòng</h4>
                            <span style={{ fontSize: '0.65rem', background: 'var(--color-warning)', color: '#000', padding: '2px 6px', borderRadius: '10px' }}>Dự phòng 1</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Hoạt động như một trợ lý ảo phụ khi máy chủ chính bận rộn.</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                            Sẽ mất khoảng <strong>30-60 giây</strong> khởi động cho lần gọi đầu tiên trong ngày.
                        </div>
                    </div>

                    {/* Pollinations */}
                    <div className="guide-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Globe size={16} className="text-info" />
                            <h4 style={{ margin: 0, color: 'var(--color-text)' }}>3. Kênh Tải Trực Tiếp</h4>
                            <span style={{ fontSize: '0.65rem', background: 'var(--color-info)', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>Dự phòng 2</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Sử dụng trí tuệ nhân tạo thế hệ mới (Flux Realism) cho ảnh sắc nét và chân thực.</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                            Siêu nhanh, nhưng đôi khi trả về ảnh tối thui nếu đường truyền mạng nội vùng bị gián đoạn.
                        </div>
                    </div>

                    {/* AI Horde */}
                    <div className="guide-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Cpu size={16} className="text-primary" />
                            <h4 style={{ margin: 0, color: 'var(--color-text)' }}>4. Mạng Lưới Cộng Đồng</h4>
                            <span style={{ fontSize: '0.65rem', background: 'var(--color-text-secondary)', color: 'var(--bg-card)', padding: '2px 6px', borderRadius: '10px' }}>Dự phòng Cuối</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Gửi yêu cầu lên không gian mạng để những người tình nguyện trên thế giới vẽ giúp bạn.</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                            Luôn hoạt động ổn định nhưng <span style={{ color: 'var(--color-error)' }}>phải xếp hàng rất lâu (thường 20 - 45 phút)</span>. Chỉ dùng khi mọi cách khác đều thất bại.
                        </div>
                    </div>

                    {/* Local Extension */}
                    <div className="guide-card" style={{ background: 'rgba(0,0,0,0.1)', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Link size={16} className="text-success" />
                            <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Chế Độ Cá Nhân (Local)</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Tốc độ cao nhất và mượt nhất. Sử dụng tiện ích mở rộng để vẽ trực tiếp trên trình duyệt cá nhân.</p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                            Để cài đặt và sử dụng chế độ này, vui lòng truy cập công cụ <strong>Cài đặt API (Chìa khóa ở góc phải)</strong>, phần <strong>Kết nối App - Extension</strong> để xem hướng dẫn chi tiết và tải Tiện ích mở rộng.
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex', justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button className="btn btn-secondary" onClick={onClose}>Đã hiểu</button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
