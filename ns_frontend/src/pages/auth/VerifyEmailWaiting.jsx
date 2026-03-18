import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { AUTH_ACTION_SETTINGS } from '../../config/runtime';
import logo from '../../assets/logo/NextSeat.png';
import '../../components/auth/AuthContainer.css';

const VerifyEmailWaiting = () => {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const currentUser = auth.currentUser;
    const emailText = useMemo(() => currentUser?.email || '-', [currentUser]);

    const goIfVerified = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/login');
            return;
        }

        setChecking(true);
        setError('');
        try {
            await user.reload();
            if (user.emailVerified) {
                navigate('/customize-profile');
            }
        } catch {
            setError('Unable to refresh verification status. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const resendVerification = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/login');
            return;
        }

        setResending(true);
        setError('');
        setInfo('');
        try {
            await sendEmailVerification(user, AUTH_ACTION_SETTINGS);
            setInfo('Verification email sent again. Please check your inbox.');
        } catch (err) {
            if (err?.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait and try again.');
            } else {
                setError('Failed to resend verification email.');
            }
        } finally {
            setResending(false);
        }
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/login');
            return;
        }

        let isMounted = true;
        const timerId = setInterval(async () => {
            if (!isMounted) return;
            try {
                await user.reload();
                if (user.emailVerified) {
                    navigate('/customize-profile');
                }
            } catch {
                // Ignore transient reload error during polling.
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(timerId);
        };
    }, [navigate]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="verify-page-wrap"
        >
            <div className="auth-container">
                <div className="auth-inner">
                    <div className="auth-logo">
                        <img src={logo} alt="NextSeat" className="auth-logo-img" />
                    </div>

                    <div className="auth-card">
                        <h2 className="forgot-title">Waiting for Email Verification</h2>
                        <p className="forgot-subtitle">
                            We sent a verification link to <strong>{emailText}</strong>. Verify your email, then this page will continue automatically.
                        </p>

                        {error && <div className="auth-error"><span className="auth-error-dot" />{error}</div>}
                        {info && <div className="auth-info"><span className="auth-info-dot" />{info}</div>}

                        <div className="verify-actions">
                            <button
                                type="button"
                                className="auth-submit"
                                onClick={goIfVerified}
                                disabled={checking}
                            >
                                {checking ? 'Checking...' : "I've Verified My Email"}
                            </button>
                            <button
                                type="button"
                                className="verify-secondary-btn"
                                onClick={resendVerification}
                                disabled={resending}
                            >
                                {resending ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                            <button
                                type="button"
                                className="auth-back"
                                onClick={() => navigate('/login')}
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default VerifyEmailWaiting;
