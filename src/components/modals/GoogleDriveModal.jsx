import { useState, useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { GoogleDriveService } from '../../services/googleDriveService';
import {
    HardDrive, X, Loader2,
    Upload, Download, LogIn, LogOut,
    Cloud, CloudOff, Info, User
} from 'lucide-react';

export default function GoogleDriveModal({ onClose }) {
    const { stories, replaceAllStories, reloadFromStorage } = useStory();
    const [status, setStatus] = useState('idle'); // idle, signing-in, connected, error
    const [userInfo, setUserInfo] = useState(null);
    const [message, setMessage] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [backupInfo, setBackupInfo] = useState(null);

    // Check saved connection on mount
    useEffect(() => {
        if (GoogleDriveService.isConnected()) {
            const savedUser = GoogleDriveService.getSavedUser();
            if (savedUser) {
                setUserInfo(savedUser);
                setStatus('connected');
            }
            // Verify token is still valid
            GoogleDriveService.testConnection()
                .then(result => {
                    setStatus('connected');
                    setUserInfo(result);
                    return GoogleDriveService.getBackupInfo();
                })
                .then(info => setBackupInfo(info))
                .catch(() => {
                    setStatus('idle');
                    setUserInfo(null);
                    setMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                });
        }
    }, []);

    const handleSignIn = async () => {
        setStatus('signing-in');
        setMessage('');
        try {
            await GoogleDriveService.signIn();
            const result = await GoogleDriveService.testConnection();
            setStatus('connected');
            setUserInfo(result);
            // Auto-load stories from Drive after sign-in
            setMessage('Đang tải dữ liệu từ Drive...');
            const loaded = await reloadFromStorage();
            setMessage(`✅ Đăng nhập thành công! Đã tải ${loaded.length} truyện từ Drive.`);
            try {
                const info = await GoogleDriveService.getBackupInfo();
                setBackupInfo(info);
            } catch { /* ignore */ }
        } catch (err) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    const handleSignOut = () => {
        GoogleDriveService.signOut();
        setStatus('idle');
        setUserInfo(null);
        setBackupInfo(null);
        setMessage('Đã đăng xuất');
    };

    const handleUpload = async () => {
        if (status !== 'connected') return;
        setSyncing(true);
        setMessage('Đang đồng bộ lên Drive...');
        try {
            const result = await GoogleDriveService.uploadStories(stories);
            setMessage(result.updated
                ? '✅ Đã cập nhật dữ liệu trên Drive thành công!'
                : '✅ Đã tạo file mới trên Drive thành công!'
            );
            const info = await GoogleDriveService.getBackupInfo();
            setBackupInfo(info);
        } catch (err) {
            if (err.message.includes('hết hạn')) {
                setStatus('idle');
                setUserInfo(null);
            }
            setMessage(`❌ Lỗi: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleDownload = async () => {
        if (status !== 'connected') return;
        setSyncing(true);
        setMessage('Đang tải dữ liệu từ Drive...');
        try {
            const result = await GoogleDriveService.downloadStories();
            if (!result.found) {
                setMessage('⚠️ Không tìm thấy file dữ liệu trên Drive. Hãy đồng bộ lên trước.');
                return;
            }
            if (!Array.isArray(result.stories)) {
                setMessage('❌ Dữ liệu trên Drive không hợp lệ.');
                return;
            }
            replaceAllStories(result.stories);
            setMessage(`✅ Đã tải ${result.stories.length} truyện từ Drive thành công!`);
        } catch (err) {
            if (err.message.includes('hết hạn')) {
                setStatus('idle');
                setUserInfo(null);
            }
            setMessage(`❌ Lỗi: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '?';
        const kb = parseInt(bytes) / 1024;
        return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
    };

    return (
        <div className="mca-modal-overlay" onClick={onClose}>
            <div className="mca-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                {/* Header */}
                <div className="mca-modal-header" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 'var(--space-lg)',
                    paddingBottom: 'var(--space-md)',
                    borderBottom: '1px solid var(--glass-border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <HardDrive size={22} className="text-primary" />
                        <h2 className="mca-modal-title" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>Google Drive</h2>
                        {status === 'connected' && (
                            <span style={{
                                fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px',
                                background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)',
                                fontWeight: 700
                            }}>
                                Đã kết nối
                            </span>
                        )}
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Not connected — Sign In button */}
                {status !== 'connected' && (
                    <div style={{
                        padding: 'var(--space-xl)',
                        textAlign: 'center',
                        background: 'var(--glass-bg)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--glass-border)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <Cloud size={48} style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-md)', opacity: 0.7 }} />
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                            Đăng nhập bằng tài khoản Google để lưu trữ và đồng bộ dữ liệu truyện lên Google Drive.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={handleSignIn}
                            disabled={status === 'signing-in'}
                            style={{
                                padding: 'var(--space-md) var(--space-xl)',
                                fontSize: 'var(--font-size-md)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: 600
                            }}
                        >
                            {status === 'signing-in' ? (
                                <>
                                    <Loader2 size={20} className="spin" />
                                    Đang đăng nhập...
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Đăng nhập với Google
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Connected — User Info */}
                {status === 'connected' && userInfo && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        background: 'rgba(34,197,94,0.05)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        {userInfo.photo ? (
                            <img
                                src={userInfo.photo}
                                alt="avatar"
                                style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--color-success)' }}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'rgba(139,92,246,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid var(--color-primary)'
                            }}>
                                <User size={20} style={{ color: 'var(--color-primary)' }} />
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{userInfo.name}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{userInfo.email}</div>
                        </div>
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={handleSignOut}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <LogOut size={14} />
                            Đăng xuất
                        </button>
                    </div>
                )}

                {/* Status Message */}
                {message && (
                    <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-md)',
                        background: status === 'connected' ? 'rgba(34,197,94,0.08)' : status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)',
                        border: `1px solid ${status === 'connected' ? 'rgba(34,197,94,0.25)' : status === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(139,92,246,0.25)'}`,
                        color: status === 'connected' ? 'var(--color-success)' : status === 'error' ? 'var(--color-error)' : 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)'
                    }}>
                        {status === 'connected' ? <Cloud size={16} /> : status === 'error' ? <CloudOff size={16} /> : <Info size={16} />}
                        {message}
                    </div>
                )}

                {/* Backup Info */}
                {backupInfo && status === 'connected' && (
                    <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-md)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '2px', color: 'var(--color-text-secondary)' }}>
                            📁 Bản sao lưu trên Drive
                        </div>
                        <div>Cập nhật: {new Date(backupInfo.modifiedTime).toLocaleString('vi-VN')}</div>
                        <div>Kích thước: {formatSize(backupInfo.size)}</div>
                    </div>
                )}

                {/* Sync Actions */}
                {status === 'connected' && (
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={syncing}
                            style={{ justifyContent: 'center', padding: 'var(--space-md)' }}
                        >
                            {syncing ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
                            <span>Đồng bộ lên Drive</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleDownload}
                            disabled={syncing}
                            style={{ justifyContent: 'center', padding: 'var(--space-md)' }}
                        >
                            {syncing ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                            <span>Tải từ Drive</span>
                        </button>
                    </div>
                )}

                {/* Help info */}
                <div style={{
                    padding: 'var(--space-md)',
                    background: 'rgba(139,92,246,0.05)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                    lineHeight: '1.6'
                }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                        📌 Thông tin
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-md)' }}>
                        <li>Dữ liệu được lưu vào thư mục <strong>AI-Story-Writer</strong> trên Google Drive của bạn.</li>
                        <li>Chỉ ứng dụng này có quyền truy cập file do nó tạo ra.</li>
                        <li>Phiên đăng nhập có thời hạn ~1 giờ. App sẽ tự yêu cầu đăng nhập lại khi hết hạn.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
