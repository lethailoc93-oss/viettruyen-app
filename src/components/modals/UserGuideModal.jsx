import { useState } from 'react';
import { X, Book, Bot, Sparkles, Image as ImageIcon, Save, ShieldAlert, Cpu, Database, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserGuideModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'Cơ bản', icon: <Book size={16} /> },
        { id: 'database', label: 'Cơ sở dữ liệu', icon: <Database size={16} /> },
        { id: 'writing', label: 'Viết Truyện', icon: <Sparkles size={16} /> },
        { id: 'system', label: 'Hệ thống', icon: <Settings size={16} /> },
        { id: 'image', label: 'Tạo Ảnh', icon: <ImageIcon size={16} /> },
        { id: 'api', label: 'API & Cấu hình', icon: <Cpu size={16} /> },
        { id: 'data', label: 'Dữ liệu', icon: <Save size={16} /> },
    ];

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
        }}>
            <motion.div
                className="modal-content"
                style={{
                    maxWidth: '800px', width: '90%', height: '85vh',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-secondary, #1a1a2e)',
                    borderRadius: 'var(--radius-lg, 16px)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                <div className="modal-header">
                    <h2 className="flex items-center gap-sm">
                        <Book className="text-primary" />
                        Hướng Dẫn Sử Dụng AI Story Writer
                    </h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

                    {/* Tabs */}
                    <div className="flex gap-sm" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)', overflowX: 'auto', flexShrink: 0 }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'} btn-small`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Scrollable Area */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--space-sm)' }} className="custom-scrollbar">

                        {activeTab === 'general' && (
                            <div className="guide-section text-content">
                                <h3>Chào mừng đến với AI Story Writer!</h3>
                                <p>AI Story Writer là một ứng dụng đột phá giúp bạn sáng tác truyện mượt mà nhờ sự chắp bút của Trí tuệ Nhân tạo. Không đơn thuần là gõ văn bản rồi gọi ChatGPT, ứng dụng cung cấp một hệ thống <strong>"Trí nhớ dài hạn" (AI Context)</strong> cho AI.</p>

                                <h4>Quy trình sáng tác cơ bản:</h4>
                                <ol className="guide-stepper">
                                    <li><strong>Tạo truyện mới:</strong> Đặt Tên truyện và Thể loại (Tiên hiệp, Ngôn tình, Sci-fi...).</li>
                                    <li><strong>Xây dựng thế giới (Tab Chi tiết):</strong> Thêm các nhân vật, bối cảnh, và dàn ý cốt truyện. Đây là nền tảng để AI hiểu truyện của bạn.</li>
                                    <li><strong>Bắt đầu viết (Tab Mục lục):</strong> Mở một chương và bắt đầu viết đoạn mở đầu.</li>
                                    <li><strong>Sử dụng trợ lực (Viết tiếp / Tự động):</strong> Nhờ AI viết tiếp đoạn văn hoặc để AI tự động viết toàn bộ chương dựa theo dàn ý.</li>
                                </ol>

                                <div className="info-box info">
                                    <h4>💡 Tại sao AI của chúng tôi viết không bị "lạc đề"?</h4>
                                    <p>Ứng dụng sử dụng công nghệ RAG (Retrieval-Augmented Generation). Mỗi khi bạn gọi AI, hệ thống tự động:</p>
                                    <ul>
                                        <li>Thu thập thông tin của các <strong>nhân vật đang xuất hiện</strong> trong cảnh.</li>
                                        <li>Lấy mô tả về <strong>bối cảnh hiện tại</strong>.</li>
                                        <li>Tóm tắt các <strong>sự kiện quan trọng</strong> vừa xảy ra ở chương trước.</li>
                                        <li>Gửi tất cả dữ liệu này cho AI để AI hiểu chính xác chuyện gì đang diễn ra, từ đó viết tiếp chuẩn logic.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {activeTab === 'writing' && (
                            <div className="guide-section text-content">
                                <h3>Hướng dẫn Viết truyện với AI</h3>
                                <p>Ứng dụng hỗ trợ hai phong cách làm việc với AI: <strong>Viết thủ công (Co-pilot)</strong> và <strong>Viết tự động (Auto-pilot)</strong>.</p>

                                <hr />

                                <h4>1. Chế độ Viết Tiếp (Thủ công / Quality Mode)</h4>
                                <p>Phù hợp khi bạn muốn tự tay dẫn dắt câu chuyện và chỉ nhờ AI khi bí ý tưởng hoặc mỏi tay.</p>
                                <ul>
                                    <li><strong>Cách dùng:</strong> Trong khung soạn thảo, hãy viếc cốt lõi của đoạn văn bạn muốn. Sau đó bấm nút <strong>"Viết tiếp"</strong> ở dưới cùng.</li>
                                    <li><strong>Sửa văn phong:</strong> Bôi đen một đoạn văn bạn vừa viết hoặc AI vừa viết, một menu nhỏ <Sparkles size={14} className="inline text-primary" /> sẽ hiện ra. Bạn có thể yêu cầu AI: <em>"Viết lại đoạn này cho bi tráng hơn"</em>, <em>"Thêm miêu tả nội tâm"</em>, v.v.</li>
                                </ul>

                                <hr />

                                <h4>2. Chế độ Viết Tự Động (Auto Workflow)</h4>
                                <p>Phù hợp khi bạn đã có sẵn Dàn ý / Cốt truyện vững chắc và muốn AI tự "cày" chương cho bạn.</p>
                                <ol className="guide-stepper">
                                    <li>Mở tab <strong>Tự động (biểu tượng tia chớp)</strong> ở menu bên trái.</li>
                                    <li><strong>Gợi ý diễn biến:</strong> Gõ một câu tóm tắt nhanh việc bạn muốn xảy ra tiếp theo (VD: <em>"Nam chính gặp nữ chính tại quán trọ và xảy ra xung đột"</em>). Nếu bỏ trống, AI sẽ tự bịa tiếp dựa trên chương trước.</li>
                                    <li><strong>Số lượng chương:</strong> Chọn AI sẽ viết 1, 3 hay 5 chương liên tục.</li>
                                    <li>Nhấn <strong>Bắt đầu tự viết</strong>.</li>
                                </ol>

                                <div className="info-box warning">
                                    <ShieldAlert size={16} />
                                    <span><strong>Quy trình nội bộ của AI Tự Động:</strong> Để viết 1 chương chất lượng, AI phải làm 3 bước: (1) Đọc tóm tắt chương cũ → (2) Lập dàn ý chương mới → (3) Bắt đầu viết. <strong>Quá trình này tốn 1-3 phút/chương.</strong> Vui lòng giữ mạng internet ổn định và không đóng trình duyệt.</span>
                                </div>

                                <hr />

                                <h4>3. Tự động Học Phong Cách (Quick Auto-Research)</h4>
                                <p>Tính năng ngầm siêu việt tự kích hoạt khi bạn bấm viết chương. Hệ thống sẽ tự tìm truyện cùng thể loại trên thư viện mạng, đọc trước 5 chương, và đúc kết "văn phong" để áp dụng ngay vào chương bạn đang viết.</p>

                                <ul>
                                    <li><strong>✅ Lợi ích:</strong> AI sẽ viết đúng "chất" thể loại hơn (VD: Tiên hiệp dùng đúng từ Hán Việt, không bị văn hiện đại). Mỗi chương bạn viết, AI lại đọc thêm 5 chương mới của truyện mẫu để liên tục bổ sung vốn từ và kỹ thuật viết mà không bị trùng lặp.</li>
                                    <li><strong>❌ Tác hại (Đổi lại):</strong> Làm chậm thời gian bắt đầu viết thêm khoảng <strong>30-60 giây</strong> mỗi chương do AI bận "đọc sách".</li>
                                </ul>

                                <div className="info-box info">
                                    <h4>Lưu ý quan trọng:</h4>
                                    <ul>
                                        <li><strong>Điều kiện:</strong> Tính năng này CHỈ HOẠT ĐỘNG khi bạn tải và đang bật <strong>Browser Extension</strong> (vì cần Extension để bypass bảo mật và đọc truyện).</li>
                                        <li><strong>Quyền ưu tiên:</strong> Nếu bạn đã tự làm một bản "Nghiên cứu phong cách" hoàn chỉnh ở tab Hệ thống, hệ thống sẽ ưu tiên dùng bản của bạn và <strong>bỏ qua</strong> Quick Research.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {activeTab === 'image' && (
                            <div className="guide-section text-content">
                                <h3>Tạo Ảnh Minh Họa (Chữ sang Ảnh)</h3>
                                <p>App tích hợp công cụ tạo ảnh AI ngay trong lúc viết, giúp bạn phác họa nhân vật hoặc phong cảnh mà <strong>không cần đăng ký tài khoản hay API Key nào khác</strong>.</p>

                                <h4>Có 2 cách tạo ảnh:</h4>
                                <ol className="guide-stepper">
                                    <li><strong>Dùng nút cứng:</strong> Bấm nút <strong>"Vẽ ngay"</strong> ở thanh công cụ dưới cùng. Một popup sẽ hiện ra yêu cầu bạn nhập mô tả ảnh.</li>
                                    <li><strong>Dùng chỉ đạo (Lệnh /):</strong> Đang gõ văn bản, bạn gõ <code>/vẽ [mô tả ảnh]</code> rồi nhấn Enter. Ví dụ: <code>/vẽ một thiếu nữ tóc bạch kim cầm kiếm dưới trăng</code>. Ảnh sẽ tự lồng vào đoạn văn.</li>
                                </ol>

                                <h4>Mẹo mô tả để ảnh đẹp hơn:</h4>
                                <ul>
                                    <li>Nên dùng <strong>tiếng Anh</strong> để AI hiểu chính xác nhất (VD: <em>"1girl, white hair, holding sword, moonlight, masterpiece, highly detailed"</em>). Nếu bạn dùng tiếng Việt, hệ thống sẽ tự dịch ngầm nhưng có thể mất tính chính xác.</li>
                                    <li>Hệ thống <strong>tự động lấy ngoại hình</strong>: Nếu trong cảnh đang có nhân vật tên "Linh", và trong tab Nhân vật bạn mô tả Linh là "tóc đỏ mắt xanh", AI sẽ tự động trộn "tóc đỏ mắt xanh" vào lệnh vẽ của bạn.</li>
                                </ul>

                                <h4>Hệ thống AI xử lý ảnh (Fallback)</h4>
                                <p>Vì là hệ thống miễn phí, đôi lúc máy chủ sẽ quá tải. App có cơ chế chống sập 3 lớp tự động chuyển đổi:</p>
                                <ul>
                                    <li><strong>Tầng 1 (Perchance proxy):</strong> Rất nhanh (~15s) và đẹp tuyệt đối. (Chỉ kích hoạt nếu bạn deploy chạy proxy riêng).</li>
                                    <li><strong>Tầng 2 (Pollinations - Mặc định):</strong> Tốc độ rất nhanh (~5-15s), chất lượng ảnh sắc nét bằng model Flux. Hoạt động mọi lúc mọi nơi trên web.</li>
                                    <li><strong>Tầng 3 (AI Horde):</strong> Nếu 2 dịch vụ trên sập, app gửi lệnh sang mạng lưới cộng đồng (SDXL). Rất ổn định nhưng cực kỳ chậm (khiến bạn chờ ~1-3 phút).</li>
                                </ul>
                            </div>
                        )}

                        {activeTab === 'api' && (
                            <div className="guide-section text-content">
                                <h3>Hướng dẫn Cài đặt AI & API</h3>
                                <p>Toàn bộ trí tuệ văn bản của ứng dụng được tiếp sức bởi <strong>Google Gemini</strong> và các AI khác. Hệ thống này <strong>hoàn toàn miễn phí</strong> nếu bạn làm theo các bước tải thẻ (API Key) dưới đây.</p>

                                <h4>1. Thêm API Key (Bảo chứng tài khoản)</h4>
                                <ol className="guide-stepper">
                                    <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Google AI Studio</a>. Đăng nhập Gmail của bạn.</li>
                                    <li>Bấm nút xanh <strong>"Create API Key"</strong>.</li>
                                    <li>Copy dãy ký tự dài (VD: <em>AIzaSyB-xxxx...</em>).</li>
                                    <li>Vào phần <strong>API Keys (Đa luồng)</strong>, dán mã vào và bấm <strong>Lưu</strong>.</li>
                                    <li><strong>Mẹo Đa luồng:</strong> Bạn có thể thêm 2-3 API key khác nhau để app tự động luân phiên (tránh bị Google báo lỗi quá tải tốc độ khi viết liên tục).</li>
                                </ol>

                                <h4>2. Chọn Provider (Nguồn kết nối)</h4>
                                <ul>
                                    <li><strong>Google Gemini (Mặc định):</strong> Gọi thẳng vào máy chủ Google. Rất nhanh, ổn định.</li>
                                    <li><strong>Custom (Proxy/Local):</strong> Kết nối qua máy chủ trung gian.
                                        <ul>
                                            <li><strong>WS Relay:</strong> Phương thức tránh bị khóa thẻ/Cloudflare. Ứng dụng sẽ điểu khiển ngầm trang Google AI Studio trên trình duyệt qua <strong>App Server</strong> và <strong>Extension <em>SangTacViet Bypasser</em></strong>. Bạn phải tải bộ công cụ này trong mục cài đặt.</li>
                                            <li><strong>Ollama / LM Studio:</strong> Cắm điện máy tính siêu mạnh của bạn để chạy mô hình AI Offline hoàn toàn, không tốn mạng.</li>
                                        </ul>
                                    </li>
                                </ul>

                                <h4>3. Chọn Model (Độ thông minh)</h4>
                                <ul>
                                    <li><strong>Gemini 1.5 Pro:</strong> (Khuyên dùng) - Thông minh nhất, giữ văn phong vững chắc, suy luận sắc sảo. Hoàn hảo để viết chương truyện.</li>
                                    <li><strong>Gemini 1.5 Flash:</strong> - Tốc độ cực nhanh. Thích hợp tóm tắt cảnh, tạo dàn ý cốt truyện.</li>
                                </ul>

                                <h4>4. AI Phụ tá (Worker AI)</h4>
                                <p>Khi bạn bật, các tác vụ dọn dẹp (VD: tóm tắt cảnh cũ để có ngữ cảnh viết tiếp, phân tích nội tâm...) sẽ được giao cho Phụ tá giải quyết ở phông nền. Giúp <strong>Gemini không bị kiệt sức (Rate limit)</strong> và tiết kiệm quota.</p>
                                <ul>
                                    <li>Khuyên dùng <strong>Groq Cloud</strong>: Một nền tảng AI siêu tốc miễn phí, dùng model Llama 3 cực kỳ ổn cho các việc vặt phụ trợ.</li>
                                </ul>

                                <h4>5. Thông số sinh (Generation Config)</h4>
                                <ul>
                                    <li><strong>Nhiệt độ (Temperature) [0.0 - 2.0]:</strong> Điều khiển mức độ sáng tạo.
                                        <ul>
                                            <li><em>Thấp (0.3 - 0.5):</em> Văn phong chuẩn mực, logic chặt chẽ, ít sai sót (phù hợp trinh thám, khoa học).</li>
                                            <li><em>Cao (0.8 - 1.2):</em> Bay bổng, giàu hình ảnh, từ vựng phong phú (phù hợp tả cảnh, tình cảm, combat).</li>
                                        </ul>
                                    </li>
                                    <li><strong>Top P [0.0 - 1.0]:</strong> Độ rộng của vốn từ. Thường để 0.9 - 1.0 để AI dùng từ đa dạng.</li>
                                    <li><strong>Top K [1 - 150]:</strong> Số lượng từ tiếp theo AI cân nhắc. Số nhỏ làm văn gọn gàng hơn, số lớn làm câu văn phong phú nhưng dễ nói lan man.</li>
                                    <li><strong>Kích thước phản hồi (Max Tokens):</strong> Giới hạn độ dài đoạn văn AI trả về (Gợi ý: 8192 cho các model nhúng mới).</li>
                                </ul>

                                <h4>6. Mở rộng Gemini (Chỉ chạy API trực tiếp)</h4>
                                <ul>
                                    <li><strong>Bật Web Search:</strong> AI có khả năng tự tra cứu Internet (Google Search). Cực hữu ích khi viết bối cảnh đô thị, sự kiện lịch sử thật.</li>
                                    <li><strong>Chất lượng suy luận (Reasoning Effort):</strong> Cho phép model "suy nghĩ" ngầm trước khi viết. Mức 'High' tốn token nhưng giải quyết plot-hole tốt hơn.</li>
                                    <li><strong>Ảnh minh họa (Inline Images):</strong> Yêu cầu AI tự chèn/vẽ ảnh minh họa mô tả ngay trong lúc viết văn.</li>
                                </ul>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="guide-section text-content">
                                <h3>Quản Lý & Bảo Vệ Dữ Liệu</h3>
                                <div className="info-box error" style={{ borderColor: 'var(--color-error)' }}>
                                    <h4>⚠️ Cảnh Báo Ghi Nhớ Tối Quan Trọng</h4>
                                    <p>AI Story Writer là app chạy hoàn toàn <strong>dưới trình duyệt điện thoại/máy tính của bạn</strong> (Client-side). Chúng tôi KHÔNG có máy chủ máy tính để lưu truyện của bạn.</p>
                                    <p>Nếu bạn <strong>xóa lịch sử / xóa Cookie / mở chế độ Ẩn danh</strong> → BẠN SẼ MẤT SẠCH TOÀN BỘ TRUYỆN ĐÃ VIẾT mà không thể khôi phục!</p>
                                </div>

                                <p>Để không "ôm hận" khi mất điện thoại hay lỡ tay xóa web, hãy tạo thói quen dùng 1 trong 2 cách sau mỗi khi viết xong:</p>

                                <h4>Cách 1: Đồng bộ Google Drive (Tiện nhất - Khuyên dùng)</h4>
                                <p>Tính năng này giúp bạn đồng bộ truyện trực tiếp vào Google Drive cá nhân, vừa an toàn vừa giúp bạn <strong>viết tiếp trên thiết bị khác</strong> (VD: Sáng viết trên PC, tối lên giường cầm điện thoại viết tiếp).</p>
                                <ol className="guide-stepper">
                                    <li>Bấm nút <strong>Drive</strong> có hình ổ cứng ở thanh công cụ trên cùng.</li>
                                    <li>Đăng nhập tài khoản Google.</li>
                                    <li>Bấm nút <strong>Khôi phục truyện từ Drive</strong> nếu bạn cài sang máy mới. Hệ thống cũng <strong>tự động lưu ngầm</strong> lên Drive mỗi khi bạn gõ phím.</li>
                                </ol>

                                <h4>Cách 2: Xuất / Nhập file JSON (Thủ công)</h4>
                                <p>Đây là cách tải file vật lý về máy.</p>
                                <ul>
                                    <li><strong>Xuất JSON:</strong> Bấm menu 3 chấm (ở Mobile) hoặc nút Xuất JSON ở Desktop. File tải về sẽ có đuôi <code>.json</code> chứa toàn bộ chương, dàn ý, nhân vật.</li>
                                    <li><strong>Nhập JSON:</strong> Khi cần khôi phục, tạo bấm nút Nhập JSON và chọn file tương ứng. App sẽ load lại từ đầu.</li>
                                </ul>

                                <h4>Xuất file TXT</h4>
                                <p>Khi hoàn thành tác phẩm, bấm <strong>Xuất TXT</strong> để lấy một file văn bản trơn chứa tất cả các chương từ 1 đến hết. Gửi file này cho máy in hoặc post lên các web đọc truyện online.</p>
                            </div>
                        )}

                        {activeTab === 'database' && (
                            <div className="guide-section text-content">
                                <h3>Cơ sở dữ liệu (Database)</h3>
                                <p>Đây là "bộ não dài hạn" của AI. Khi bạn tạo thông tin ở đây, AI sẽ ghi nhớ chúng cho toàn bộ hành trình viết truyện.</p>

                                <ul>
                                    <li><strong>Dàn ý:</strong> Xương sống của truyện. Bạn nên tạo "Dàn ý tổng" (cốt truyện chính) và "Dàn ý chương" chi tiết. Ghi chú rõ mục tiêu của từng giai đoạn.</li>
                                    <li><strong>Nhân vật:</strong> Cung cấp Tên, Tuổi, Ngoại hình, Tính cách, Thân phận. AI sẽ đọc ngoại hình khi bạn dùng lệnh <code>/vẽ</code>. Nó cũng hiểu tính cách để cho nhân vật hành xử đúng chuẩn.</li>
                                    <li><strong>Bối cảnh & Thời gian:</strong> Nơi chốn (Lục địa, Tông môn, Thành phố...) và Mốc thời gian (Thời đại, mùa màng, ngày tháng) để AI tả cảnh vật xung quanh không bị sai lệch.</li>
                                    <li><strong>Năng lực / Tu vi:</strong> Cảnh giới, kỹ năng thi triển, sức mạnh... Rất cần thiết cho dòng truyện Tiên hiệp / Huyền huyễn.</li>
                                    <li><strong>Vật phẩm & Tổ chức:</strong> Bảo vật, vũ khí, môn phái, công ty... giúp AI nhận diện và sử dụng thuật ngữ chính xác trong truyện.</li>
                                </ul>

                                <div className="info-box info">
                                    <strong>Mẹo:</strong> AI sẽ dùng cơ chế <strong>RAG</strong> để quét tất cả dữ liệu này một cách chọn lọc. Hãy viết mô tả ngắn gọn, súc tích (ví dụ gạch đầu dòng) để AI dễ đọc và tiết kiệm token nhất.
                                </div>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="guide-section text-content">
                                <h3>Hệ thống (Tính năng nâng cao)</h3>
                                <p>Các tính năng sức mạnh tiện ích nằm trong menu <strong>HỆ THỐNG</strong> bên trái.</p>

                                <h4>1. Tự động (Auto Workflow)</h4>
                                <p>Tính năng rảnh tay nhất. Phù hợp khi bạn đã có sẵn Dàn ý chi tiết. Bạn cung cấp "Gợi ý diễn biến" 1-2 câu, AI sẽ tự động phân tích dàn ý, tóm tắt chương cũ, và viết ra 1000-2000 chữ cho chương mới. Có thể yêu cầu viết liên tục nhiều chương.</p>

                                <h4>2. Nghiên cứu (Research)</h4>
                                <p>Công cụ hỗ trợ cung cấp thêm tư liệu, hoặc "Cào văn bản" (Scraping) từ tài liệu web ngoài. Rất hữu ích khi bạn muốn clone quy tắc một game/phim, clone giọng văn, thiết lập, hoặc học hỏi từ truyện khác đưa vào bộ nhớ.</p>
                                <ul>
                                    <li><strong>Cần thiết:</strong> Nhấn chọn Cài đặt AI & API ➔ Bật Proxy Custom WS Relay ➔ Tải App Server + Extension Bypasser để app có quyền truy cập Internet tải nội dung không bị giới hạn.</li>
                                </ul>

                                <h4>3. Kiểm tra (Check)</h4>
                                <p>Công cụ dò lỗi chính tả, lỗi lặp từ, rà soát lại văn phong hoặc các lỗi logic trong bản thảo mà mắt thường hay bỏ sót trước khi xuất bản.</p>

                                <h4>4. Quy tắc AI (AI Rules)</h4>
                                <p>Phần này giữ vai trò "tẩy não", thiết lập luật lệ thép cho AI. Nó sẽ ghi đè lên toàn bộ thiết lập mặc định của hệ thống.</p>
                                <ul>
                                    <li>Ví dụ quy tắc: <em>"Truyện bối cảnh phương Tây, không dùng từ Hán Việt", "Tuyệt đối không viết cảnh nhạy cảm", "Nhân vật Lâm Phong luôn phải lạnh lùng, ít nói, nói không bao giờ quá 5 chữ", v.v...</em></li>
                                </ul>
                            </div>
                        )}

                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                    <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
                        Đã hiểu
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
