import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { AUTH_ACTION_SETTINGS } from '../../config/runtime';
import logo from '../../assets/logo/NextSeat.png';
import '../../components/auth/AuthContainer.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const normalizedEmail = String(email || '').trim();
        setError('');
        setInfo('');

        if (!normalizedEmail) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, normalizedEmail, AUTH_ACTION_SETTINGS);
            setInfo('Password reset email sent. Please check your inbox.');
        } catch (err) {
            if (err?.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else if (err?.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait and try again.');
            } else if (err?.code === 'auth/user-not-found') {
                setInfo('If this email is registered, a reset link has been sent.');
            } else {
                setError('Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="forgot-page-wrap"
        >
            <div className="auth-container">
                <div className="auth-inner">
                    <div className="auth-logo">
                        <img src={logo} alt="NextSeat" className="auth-logo-img" />
                    </div>

                    <div className="auth-card">
                        <h2 className="forgot-title">Forgot Password</h2>
                        <p className="forgot-subtitle">Enter your email to receive a password reset link.</p>

                        <form onSubmit={handleSubmit} className="auth-form">
                            {error && <div className="auth-error"><span className="auth-error-dot" />{error}</div>}
                            {info && <div className="auth-info"><span className="auth-info-dot" />{info}</div>}

                            <div className="auth-field">
                                <label>Email Address</label>
                                <div className="auth-input-wrap">
                                    <span className="auth-input-icon">✉</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="you@example.com"
                                        className="auth-input"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit">
                                {loading ? 'Sending...' : 'Send Reset Email'}
                            </button>
                            <button
                                type="button"
                                className="auth-back"
                                onClick={() => navigate('/login')}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ForgotPassword;
