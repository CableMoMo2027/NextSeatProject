// import React, { useState } from 'react';
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
// import { auth, googleProvider, facebookProvider } from '../firebase';
// import logo from '../assets/logo/NextSeat.png';
// import './AuthContainer.css';

// // Sign In Form Component
// const SignInForm = ({ onSubmit, loading, error }) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [showPassword, setShowPassword] = useState(false);

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         onSubmit(email, password);
//     };

//     return (
//         <form onSubmit={handleSubmit} className="auth-form">
//             {error && (
//                 <div className="auth-error">{error}</div>
//             )}

//             {/* Email */}
//             <div className="auth-field">
//                 <label>Email</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">✉</span>
//                     <input
//                         type="email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         placeholder="your@email.com"
//                         className="auth-input"
//                         required
//                     />
//                 </div>
//             </div>

//             {/* Password */}
//             <div className="auth-field">
//                 <label>Password</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">🔒</span>
//                     <input
//                         type={showPassword ? 'text' : 'password'}
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         placeholder="••••••••"
//                         className="auth-input auth-input-has-toggle"
//                         required
//                     />
//                     <button
//                         type="button"
//                         onClick={() => setShowPassword(!showPassword)}
//                         className="auth-toggle-password"
//                     >
//                         {showPassword ? '🙈' : '👁'}
//                     </button>
//                 </div>
//             </div>

//             {/* Forgot Password */}
//             <div className="auth-forgot">
//                 <button type="button">Forgot password?</button>
//             </div>

//             {/* Submit Button */}
//             <button type="submit" disabled={loading} className="auth-submit">
//                 {loading ? (
//                     <>
//                         <span className="auth-spinner">⏳</span>
//                         Signing in...
//                     </>
//                 ) : (
//                     'Sign In'
//                 )}
//             </button>
//         </form>
//     );
// };

// // Sign Up Form Component
// const SignUpForm = ({ onSubmit, loading, error }) => {
//     const [name, setName] = useState('');
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [showPassword, setShowPassword] = useState(false);
//     const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//     const [validationError, setValidationError] = useState('');

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         setValidationError('');

//         if (password !== confirmPassword) {
//             setValidationError('Passwords do not match');
//             return;
//         }

//         if (password.length < 6) {
//             setValidationError('Password must be at least 6 characters');
//             return;
//         }

//         onSubmit(name, email, password);
//     };

//     const displayError = validationError || error;

//     return (
//         <form onSubmit={handleSubmit} className="auth-form auth-form-compact">
//             {displayError && (
//                 <div className="auth-error">{displayError}</div>
//             )}

//             {/* Name */}
//             <div className="auth-field auth-field-compact">
//                 <label>Full Name</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">👤</span>
//                     <input
//                         type="text"
//                         value={name}
//                         onChange={(e) => setName(e.target.value)}
//                         placeholder="John Doe"
//                         className="auth-input auth-input-compact"
//                         required
//                     />
//                 </div>
//             </div>

//             {/* Email */}
//             <div className="auth-field auth-field-compact">
//                 <label>Email</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">✉</span>
//                     <input
//                         type="email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         placeholder="your@email.com"
//                         className="auth-input auth-input-compact"
//                         required
//                     />
//                 </div>
//             </div>

//             {/* Password */}
//             <div className="auth-field auth-field-compact">
//                 <label>Password</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">🔒</span>
//                     <input
//                         type={showPassword ? 'text' : 'password'}
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         placeholder="••••••••"
//                         className="auth-input auth-input-compact auth-input-has-toggle"
//                         required
//                     />
//                     <button
//                         type="button"
//                         onClick={() => setShowPassword(!showPassword)}
//                         className="auth-toggle-password"
//                     >
//                         {showPassword ? '🙈' : '👁'}
//                     </button>
//                 </div>
//             </div>

//             {/* Confirm Password */}
//             <div className="auth-field auth-field-compact">
//                 <label>Confirm Password</label>
//                 <div className="auth-input-wrap">
//                     <span className="auth-input-icon">🔒</span>
//                     <input
//                         type={showConfirmPassword ? 'text' : 'password'}
//                         value={confirmPassword}
//                         onChange={(e) => setConfirmPassword(e.target.value)}
//                         placeholder="••••••••"
//                         className="auth-input auth-input-compact auth-input-has-toggle"
//                         required
//                     />
//                     <button
//                         type="button"
//                         onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                         className="auth-toggle-password"
//                     >
//                         {showConfirmPassword ? '🙈' : '👁'}
//                     </button>
//                 </div>
//             </div>

//             {/* Submit Button */}
//             <button type="submit" disabled={loading} className="auth-submit">
//                 {loading ? (
//                     <>
//                         <span className="auth-spinner">⏳</span>
//                         Creating account...
//                     </>
//                 ) : (
//                     'Create Account'
//                 )}
//             </button>
//         </form>
//     );
// };

// // Main Auth Container Component
// const AuthContainer = ({ initialPanel = 'signin', onNavigate, onSignInSuccess, onSignUpSuccess, noBackground = false }) => {
//     const [activePanel, setActivePanel] = useState(initialPanel);
//     const [loading, setLoading] = useState(false);
//     const [signInError, setSignInError] = useState('');
//     const [signUpError, setSignUpError] = useState('');

//     const handleSignIn = async (email, password) => {
//         setSignInError('');
//         setLoading(true);

//         try {
//             const userCredential = await signInWithEmailAndPassword(auth, email, password);
//             onSignInSuccess && onSignInSuccess(userCredential.user);
//         } catch (err) {
//             switch (err.code) {
//                 case 'auth/user-not-found':
//                     setSignInError('No account found with this email');
//                     break;
//                 case 'auth/wrong-password':
//                     setSignInError('Incorrect password');
//                     break;
//                 case 'auth/invalid-email':
//                     setSignInError('Invalid email address');
//                     break;
//                 case 'auth/invalid-credential':
//                     setSignInError('Invalid email or password');
//                     break;
//                 default:
//                     setSignInError('Failed to sign in. Please try again.');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleSignUp = async (name, email, password) => {
//         setSignUpError('');
//         setLoading(true);

//         try {
//             const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//             await updateProfile(userCredential.user, { displayName: name });
//             onSignUpSuccess && onSignUpSuccess(userCredential.user);
//         } catch (err) {
//             switch (err.code) {
//                 case 'auth/email-already-in-use':
//                     setSignUpError('This email is already registered');
//                     break;
//                 case 'auth/invalid-email':
//                     setSignUpError('Invalid email address');
//                     break;
//                 case 'auth/weak-password':
//                     setSignUpError('Password is too weak');
//                     break;
//                 default:
//                     setSignUpError('Failed to create account. Please try again.');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const switchPanel = (panel) => {
//         setActivePanel(panel);
//         setSignInError('');
//         setSignUpError('');
//     };

//     // Social Login Handlers
//     const handleGoogleSignIn = async () => {
//         setSignInError('');
//         setSignUpError('');
//         setLoading(true);
//         try {
//             const result = await signInWithPopup(auth, googleProvider);
//             onSignInSuccess && onSignInSuccess(result.user);
//         } catch (err) {
//             const errorMessage = err.code === 'auth/popup-closed-by-user'
//                 ? 'Sign in cancelled'
//                 : 'Failed to sign in with Google';
//             if (activePanel === 'signin') {
//                 setSignInError(errorMessage);
//             } else {
//                 setSignUpError(errorMessage);
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleFacebookSignIn = async () => {
//         setSignInError('');
//         setSignUpError('');
//         setLoading(true);
//         try {
//             const result = await signInWithPopup(auth, facebookProvider);
//             onSignInSuccess && onSignInSuccess(result.user);
//         } catch (err) {
//             const errorMessage = err.code === 'auth/popup-closed-by-user'
//                 ? 'Sign in cancelled'
//                 : 'Failed to sign in with Facebook';
//             if (activePanel === 'signin') {
//                 setSignInError(errorMessage);
//             } else {
//                 setSignUpError(errorMessage);
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="auth-container">
//             <div className="auth-inner">
//                 {/* Logo */}
//                 <div className="auth-logo">
//                     <img src={logo} alt="NextSeat" className="auth-logo-img" />
//                 </div>

//                 {/* Slide Container */}
//                 <div className="auth-slide-container">
//                     <div
//                         className="auth-slider"
//                         style={{
//                             transform: activePanel === 'signin' ? 'translateX(0%)' : 'translateX(-50%)'
//                         }}
//                     >
//                         {/* Sign In Panel */}
//                         <div className="auth-panel">
//                             <div className="auth-card">
//                                 <h2>Sign In</h2>

//                                 <SignInForm
//                                     onSubmit={handleSignIn}
//                                     loading={loading}
//                                     error={signInError}
//                                 />

//                                 {/* Divider */}
//                                 <div className="auth-divider">
//                                     <div className="auth-divider-line"><div></div></div>
//                                     <div className="auth-divider-text">
//                                         <span>or continue with</span>
//                                     </div>
//                                 </div>

//                                 {/* Social Login Buttons */}
//                                 <div className="auth-social-row">
//                                     {/* Google */}
//                                     <button
//                                         type="button"
//                                         onClick={handleGoogleSignIn}
//                                         disabled={loading}
//                                         className="auth-social-btn"
//                                         title="Sign in with Google"
//                                     >
//                                         <svg viewBox="0 0 24 24">
//                                             <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
//                                             <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
//                                             <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
//                                             <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
//                                         </svg>
//                                     </button>

//                                     {/* Facebook */}
//                                     <button
//                                         type="button"
//                                         onClick={handleFacebookSignIn}
//                                         disabled={loading}
//                                         className="auth-social-btn"
//                                         title="Sign in with Facebook"
//                                     >
//                                         <svg viewBox="0 0 24 24" fill="#1877F2">
//                                             <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
//                                         </svg>
//                                     </button>
//                                 </div>

//                                 {/* Switch to Sign Up */}
//                                 <p className="auth-switch">
//                                     Don't have an account?{' '}
//                                     <button onClick={() => switchPanel('signup')}>
//                                         Create account
//                                     </button>
//                                 </p>
//                             </div>
//                         </div>

//                         {/* Sign Up Panel */}
//                         <div className="auth-panel">
//                             <div className="auth-card auth-card-signup">
//                                 <h2>Create Account</h2>

//                                 <SignUpForm
//                                     onSubmit={handleSignUp}
//                                     loading={loading}
//                                     error={signUpError}
//                                 />

//                                 {/* Divider */}
//                                 <div className="auth-divider auth-divider-compact">
//                                     <div className="auth-divider-line"><div></div></div>
//                                     <div className="auth-divider-text">
//                                         <span>or continue with</span>
//                                     </div>
//                                 </div>

//                                 {/* Social Login Buttons */}
//                                 <div className="auth-social-row auth-social-row-compact">
//                                     {/* Google */}
//                                     <button
//                                         type="button"
//                                         onClick={handleGoogleSignIn}
//                                         disabled={loading}
//                                         className="auth-social-btn auth-social-btn-sm"
//                                         title="Sign up with Google"
//                                     >
//                                         <svg viewBox="0 0 24 24">
//                                             <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
//                                             <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
//                                             <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
//                                             <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
//                                         </svg>
//                                     </button>

//                                     {/* Facebook */}
//                                     <button
//                                         type="button"
//                                         onClick={handleFacebookSignIn}
//                                         disabled={loading}
//                                         className="auth-social-btn auth-social-btn-sm"
//                                         title="Sign up with Facebook"
//                                     >
//                                         <svg viewBox="0 0 24 24" fill="#1877F2">
//                                             <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
//                                         </svg>
//                                     </button>
//                                 </div>

//                                 {/* Switch to Sign In */}
//                                 <p className="auth-switch">
//                                     Already have an account?{' '}
//                                     <button onClick={() => switchPanel('signin')}>
//                                         Sign in
//                                     </button>
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Back to Home */}
//                 <button
//                     onClick={() => onNavigate('home')}
//                     className="auth-back"
//                 >
//                     ← Back to Home
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default AuthContainer;






























import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    sendEmailVerification,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../../firebase';
import axios from 'axios';
import logo from '../../assets/logo/NextSeat.png';
import { useToast } from '../../hooks/useToast.jsx';
import { AUTH_ACTION_SETTINGS, MAIN_API_BASE } from '../../config/runtime';
import './AuthContainer.css';

const API_BASE = MAIN_API_BASE;

/** Sync Firebase user → MongoDB */
const syncUserToDb = async (user) => {
    try {
        await axios.post(`${API_BASE}/users/sync`, {
            firebaseUid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            phone: user.phoneNumber || '',
        });
    } catch (err) {
        console.error('User sync error:', err);
    }
};

/* ── SVG Icon helpers ── */
const IconMail = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polyline points="2,4 12,13 22,4" />
    </svg>
);
const IconLock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const IconUser = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const IconEye = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const IconEyeOff = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);
const IconArrowLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);
const IconLoader = () => (
    <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);

/* ──────────────────────────────
   Sign In Form
────────────────────────────── */
const SignInForm = ({ onSubmit, onGoForgotPassword, loading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error"><span className="auth-error-dot" />{error}</div>}

            <div className="auth-field">
                <label>Email Address</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconMail /></span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="auth-input"
                        required
                    />
                </div>
            </div>

            <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconLock /></span>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="auth-input auth-input-has-toggle"
                        required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle-password">
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                </div>
            </div>

            <div className="auth-forgot">
                <button
                    type="button"
                    onClick={onGoForgotPassword}
                    disabled={loading}
                >
                    Forgot password?
                </button>
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
                {loading ? (<><IconLoader /> Signing in…</>) : 'Sign In'}
            </button>
        </form>
    );
};

/* ──────────────────────────────
   Sign Up Form
────────────────────────────── */
const SignUpForm = ({ onSubmit, loading, error }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationError, setValidationError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError('');
        if (password !== confirmPassword) { setValidationError('Passwords do not match'); return; }
        if (password.length < 6) { setValidationError('Password must be at least 6 characters'); return; }
        onSubmit(name, email, password);
    };

    const displayError = validationError || error;

    return (
        <form onSubmit={handleSubmit} className="auth-form auth-form-compact">
            {displayError && <div className="auth-error"><span className="auth-error-dot" />{displayError}</div>}

            <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconUser /></span>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe" className="auth-input" required />
                </div>
            </div>

            <div className="auth-field">
                <label>Email Address</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconMail /></span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" className="auth-input" required />
                </div>
            </div>

            <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconLock /></span>
                    <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 chars" className="auth-input auth-input-has-toggle" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle-password">
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                </div>
            </div>

            <div className="auth-field">
                <label>Confirm Password</label>
                <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconLock /></span>
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password" className="auth-input auth-input-has-toggle" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-toggle-password">
                        {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                </div>
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
                {loading ? (<><IconLoader /> Creating account…</>) : 'Create Account'}
            </button>
        </form>
    );
};

/* ──────────────────────────────
   Social Buttons (shared)
────────────────────────────── */
const SocialButtons = ({ onGoogle, onFacebook, loading }) => (
    <>
        <div className="auth-divider">
            <div className="auth-divider-line"><div /></div>
            <div className="auth-divider-text"><span>or continue with</span></div>
        </div>
        <div className="auth-social-row">
            <button type="button" onClick={onGoogle} disabled={loading} className="auth-social-btn" title="Google">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#EA4335" d="M5.27 9.76C6.2 6.94 8.85 4.91 12 4.91c1.69 0 3.22.6 4.42 1.58L19.91 3C17.78 1.15 15.05 0 12 0 7.27 0 3.2 2.7 1.24 6.65l4.03 3.11z" />
                    <path fill="#34A853" d="M16.04 18.01C14.95 18.72 13.57 19.09 12 19.09c-3.13 0-5.78-2.01-6.72-4.82l-4.04 3.07C3.19 21.29 7.27 24 12 24c2.93 0 5.74-1.04 7.83-3l-3.79-2.99z" />
                    <path fill="#4A90E2" d="M19.83 21C22.03 18.95 23.45 15.9 23.45 12c0-.71-.09-1.47-.27-2.18H12v4.64h6.44a5.47 5.47 0 0 1-2.4 3.55L19.83 21z" />
                    <path fill="#FBBC05" d="M5.28 14.27A7.12 7.12 0 0 1 4.91 12c0-.78.13-1.53.35-2.24L1.24 6.65A11.96 11.96 0 0 0 0 12c0 1.92.44 3.73 1.24 5.34l4.04-3.07z" />
                </svg>
                <span>Google</span>
            </button>

            <button type="button" onClick={onFacebook} disabled={loading} className="auth-social-btn" title="Facebook">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
            </button>
        </div>
    </>
);

/* ──────────────────────────────
   Main Container
────────────────────────────── */
const AuthContainer = ({ onNavigate, initialPanel = 'signin' }) => {
    const { success } = useToast();
    const [activePanel, setActivePanel] = useState(initialPanel);
    const [loading, setLoading] = useState(false);
    const [signInError, setSignInError] = useState('');
    const [signUpError, setSignUpError] = useState('');
    const [slideHeight, setSlideHeight] = useState(null);
    const signInPanelRef = useRef(null);
    const signUpPanelRef = useRef(null);

    const getFriendlyErrorMessage = (error) => {
        const code = error.code;
        if (code === 'auth/popup-closed-by-user') {
            return 'Google sign-in popup was closed before completing login.';
        } else if (code === 'auth/popup-blocked') {
            return 'Popup was blocked by your browser. Please allow popups for this site.';
        } else if (code === 'auth/cancelled-popup-request') {
            return 'Another sign-in popup is already open.';
        } else if (code === 'auth/unauthorized-domain') {
            return 'This domain is not authorized in Firebase Authentication.';
        } else if (code === 'auth/operation-not-allowed') {
            return 'Google sign-in is not enabled in Firebase Authentication.';
        } else if (code === 'auth/network-request-failed') {
            return 'Network error while contacting Firebase. Please try again.';
        }
        if (code === 'auth/email-already-in-use') {
            return 'Email already in use.';
        } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
            return 'Invalid email or password.';
        } else if (code === 'auth/weak-password') {
            return 'Password is too weak.';
        }
        // Fallback to the raw message or a generic one
        return error.message || 'An error occurred during authentication.';
    };

    const switchPanel = (panel) => {
        setSignInError('');
        setSignUpError('');
        setActivePanel(panel);
    };

    const handleSignIn = async (email, password) => {
        setLoading(true);
        setSignInError('');
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await syncUserToDb(result.user);
            success('Login successful.');
            onNavigate('home');
        } catch (err) {
            setSignInError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (name, email, password) => {
        setLoading(true);
        setSignUpError('');
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(result.user, { displayName: name });
            await sendEmailVerification(result.user, AUTH_ACTION_SETTINGS);
            await syncUserToDb(result.user);
            success('Account created. Please verify your email.');
            onNavigate('verify-email-waiting');
        } catch (err) {
            setSignUpError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await syncUserToDb(result.user);
            // Social login should use the provider profile (name/photo) immediately.
            onNavigate('home');
        } catch (err) {
            setSignInError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleFacebookSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            await syncUserToDb(result.user);
            // Social login should use the provider profile (name/photo) immediately.
            onNavigate('home');
        } catch (err) {
            setSignInError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const isSignup = activePanel === 'signup';
    const updateSlideHeight = useCallback(() => {
        const activeEl = isSignup ? signUpPanelRef.current : signInPanelRef.current;
        if (!activeEl) return;
        setSlideHeight(activeEl.scrollHeight);
    }, [isSignup]);

    useEffect(() => {
        const frame = requestAnimationFrame(updateSlideHeight);
        return () => cancelAnimationFrame(frame);
    }, [updateSlideHeight, loading, signInError, signUpError]);

    useEffect(() => {
        const onResize = () => updateSlideHeight();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [updateSlideHeight]);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => updateSlideHeight());
        if (signInPanelRef.current) observer.observe(signInPanelRef.current);
        if (signUpPanelRef.current) observer.observe(signUpPanelRef.current);
        return () => observer.disconnect();
    }, [updateSlideHeight]);

    return (
        <div className="auth-container">
            {/* Ambient glow blobs */}
            <div className="auth-glow auth-glow-1" />
            <div className="auth-glow auth-glow-2" />

            <div className="auth-inner">
                {/* Logo */}
                <div className="auth-logo">
                    <img src={logo} alt="NextSeat" className="auth-logo-img" />
                </div>

                {/* Tab Switcher */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${!isSignup ? 'auth-tab-active' : ''}`}
                        onClick={() => switchPanel('signin')}
                    >Sign In</button>
                    <button
                        className={`auth-tab ${isSignup ? 'auth-tab-active' : ''}`}
                        onClick={() => switchPanel('signup')}
                    >Create Account</button>
                    <div className="auth-tab-indicator" style={{ transform: isSignup ? 'translateX(100%)' : 'translateX(0)' }} />
                </div>

                {/* Card */}
                <div className="auth-card">
                    {/* Slide container */}
                    <div
                        className="auth-slide-container"
                        style={slideHeight ? { height: `${slideHeight}px` } : undefined}
                    >
                        <div
                            className="auth-slider"
                            style={{ transform: isSignup ? 'translateX(-50%)' : 'translateX(0%)' }}
                        >
                            {/* Sign In Panel */}
                            <div className="auth-panel" ref={signInPanelRef}>
                                <SignInForm
                                    onSubmit={handleSignIn}
                                    onGoForgotPassword={() => onNavigate('forgot-password')}
                                    loading={loading}
                                    error={signInError}
                                />
                                <SocialButtons onGoogle={handleGoogleSignIn} onFacebook={handleFacebookSignIn} loading={loading} />
                                <div className="auth-footer-links">
                                    <p className="auth-switch">
                                        Don't have an account?{' '}
                                        <button onClick={() => switchPanel('signup')}>Create account →</button>
                                    </p>
                                    <button onClick={() => onNavigate('home')} className="auth-back">
                                        <IconArrowLeft /> Back to Home
                                    </button>
                                </div>
                            </div>

                            {/* Sign Up Panel */}
                            <div className="auth-panel" ref={signUpPanelRef}>
                                <SignUpForm onSubmit={handleSignUp} loading={loading} error={signUpError} />
                                <SocialButtons onGoogle={handleGoogleSignIn} onFacebook={handleFacebookSignIn} loading={loading} />
                                <div className="auth-footer-links">
                                    <p className="auth-switch">
                                        Already have an account?{' '}
                                        <button onClick={() => switchPanel('signin')}>Sign in →</button>
                                    </p>
                                    <button onClick={() => onNavigate('home')} className="auth-back">
                                        <IconArrowLeft /> Back to Home
                                    </button>
                                    <p className="auth-terms">
                                        By signing up you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthContainer;
