import { useState, useEffect, useRef } from 'react';
import './PasswordGate.css';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

const CORRECT_PASSWORD = 'longden@';
const SESSION_KEY = 'app_authenticated';

export default function PasswordGate({ children }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        // Check if already authenticated in this session
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            setAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (!authenticated && inputRef.current) {
            inputRef.current.focus();
        }
    }, [authenticated]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!password.trim()) {
            setError('Vui lòng nhập mật khẩu');
            triggerShake();
            return;
        }

        setLoading(true);

        // Small delay for visual feedback
        setTimeout(() => {
            if (password === CORRECT_PASSWORD) {
                sessionStorage.setItem(SESSION_KEY, 'true');
                setAuthenticated(true);
            } else {
                setError('Mật khẩu không đúng!');
                setPassword('');
                triggerShake();
                if (inputRef.current) inputRef.current.focus();
            }
            setLoading(false);
        }, 500);
    };

    const triggerShake = () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    if (authenticated) {
        return children;
    }

    return (
        <div className="password-gate">
            <div className="password-gate__particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="password-gate__particle" style={{
                        '--delay': `${Math.random() * 5}s`,
                        '--x': `${Math.random() * 100}%`,
                        '--duration': `${3 + Math.random() * 4}s`,
                        '--size': `${2 + Math.random() * 4}px`,
                    }} />
                ))}
            </div>

            <div className={`password-gate__card ${shaking ? 'password-gate__card--shake' : ''}`}>
                <div className="password-gate__icon-wrapper">
                    <div className="password-gate__icon-glow" />
                    <Lock size={32} className="password-gate__icon" />
                </div>

                <h1 className="password-gate__title">Xác thực bảo mật</h1>
                <p className="password-gate__subtitle">Nhập mật khẩu để truy cập ứng dụng</p>

                <form onSubmit={handleSubmit} className="password-gate__form">
                    <div className="password-gate__input-group">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập mật khẩu..."
                            className={`password-gate__input ${error ? 'password-gate__input--error' : ''}`}
                            autoComplete="off"
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="password-gate__toggle-vis"
                            onClick={() => setShowPassword(v => !v)}
                            tabIndex={-1}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div className="password-gate__error">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="password-gate__submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="password-gate__spinner" />
                        ) : (
                            <>
                                <ShieldCheck size={18} />
                                <span>Xác nhận</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="password-gate__footer">
                    <ShieldCheck size={14} />
                    <span>Được bảo vệ bởi hệ thống bảo mật</span>
                </div>
            </div>
        </div>
    );
}
