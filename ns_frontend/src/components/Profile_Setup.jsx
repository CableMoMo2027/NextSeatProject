// import React, { useState, useRef } from 'react';
// import { Camera, Check, Loader2, ArrowRight, User, Upload } from 'lucide-react';
// import { updateProfile } from 'firebase/auth';
// import { auth } from '../firebase';
// import axios from 'axios';

// const AVATAR_OPTIONS = [
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffd5dc',
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Whiskers&backgroundColor=c0aede',
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight&backgroundColor=d1d4f9',
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Gamer&backgroundColor=ffdfbf',
//     'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky&backgroundColor=baffc9',
//     'https://api.dicebear.com/7.x/lorelei/svg?seed=Pro&backgroundColor=ffd5dc',
//     'https://api.dicebear.com/7.x/lorelei/svg?seed=Star&backgroundColor=b6e3f4',
// ];

// /* ─── Styles that exactly mirror the NextSeat signup page ─── */
// const CSS = `
//   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

//   .ns-wrap * { box-sizing: border-box; }

//   /* ── Full-screen background ── */
//   .ns-wrap {
//     min-height: 100vh;
//     background: #0e0700;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//     font-family: 'Inter', sans-serif;
//     position: relative;
//     overflow: hidden;
//     padding: 40px 20px;
//   }

//   /* ── Light streak layers (matching the diagonal orange rays in the screenshot) ── */
//   .ns-ray {
//     position: absolute;
//     pointer-events: none;
//     border-radius: 50%;
//   }
//   /* Ambient warm glow from upper-right */
//   .ns-ray-glow {
//     width: 120vw; height: 120vw;
//     background: radial-gradient(ellipse at 80% 10%,
//       rgba(200,80,0,0.35) 0%,
//       rgba(140,50,0,0.18) 30%,
//       transparent 65%
//     );
//     top: -30vw; right: -30vw;
//     filter: blur(40px);
//   }
//   /* Main bright streak */
//   .ns-ray-1 {
//     width: 180%; height: 260px;
//     background: linear-gradient(90deg,
//       transparent 0%,
//       rgba(255,130,0,0.06) 20%,
//       rgba(255,180,20,0.55) 50%,
//       rgba(255,130,0,0.06) 80%,
//       transparent 100%
//     );
//     top: 28%;
//     left: -40%;
//     transform: rotate(-22deg);
//     filter: blur(18px);
//     animation: nsRay1 7s ease-in-out infinite alternate;
//   }
//   /* Second streak, slightly lower */
//   .ns-ray-2 {
//     width: 160%; height: 160px;
//     background: linear-gradient(90deg,
//       transparent 0%,
//       rgba(255,110,0,0.04) 15%,
//       rgba(255,160,10,0.38) 50%,
//       rgba(255,110,0,0.04) 85%,
//       transparent 100%
//     );
//     top: 40%;
//     left: -20%;
//     transform: rotate(-20deg);
//     filter: blur(22px);
//     animation: nsRay2 9s ease-in-out infinite alternate;
//   }
//   /* Third faint streak */
//   .ns-ray-3 {
//     width: 140%; height: 100px;
//     background: linear-gradient(90deg,
//       transparent 0%,
//       rgba(200,80,0,0.22) 50%,
//       transparent 100%
//     );
//     top: 55%;
//     left: -10%;
//     transform: rotate(-18deg);
//     filter: blur(28px);
//     animation: nsRay1 11s ease-in-out infinite alternate-reverse;
//   }
//   /* Thin bright core line */
//   .ns-ray-core {
//     width: 180%; height: 6px;
//     background: linear-gradient(90deg,
//       transparent 0%,
//       rgba(255,220,80,0.0) 15%,
//       rgba(255,220,100,0.7) 48%,
//       rgba(255,220,80,0.0) 85%,
//       transparent 100%
//     );
//     top: calc(28% + 127px);
//     left: -40%;
//     transform: rotate(-22deg);
//     filter: blur(3px);
//     animation: nsRay1 7s ease-in-out infinite alternate;
//   }

//   @keyframes nsRay1 {
//     from { transform: rotate(-22deg) translateY(0px);   opacity: 0.85; }
//     to   { transform: rotate(-20deg) translateY(-14px); opacity: 1;    }
//   }
//   @keyframes nsRay2 {
//     from { transform: rotate(-20deg) translateY(0px);   opacity: 0.7; }
//     to   { transform: rotate(-22deg) translateY(10px);  opacity: 0.9; }
//   }
//   @keyframes nsSpin { to { transform: rotate(360deg); } }

//   /* ── Logo (above card, centered) ── */
//   .ns-logo {
//     position: relative; z-index: 10;
//     display: flex; align-items: center; gap: 10px;
//     margin-bottom: 22px;
//   }
//   .ns-logo-icon {
//     width: 46px; height: 46px;
//     background: linear-gradient(140deg, #ff9500, #e05a00);
//     border-radius: 10px;
//     display: flex; align-items: center; justify-content: center;
//     font-size: 22px;
//     box-shadow: 0 0 24px rgba(255,120,0,0.5);
//     flex-shrink: 0;
//   }
//   .ns-logo-text {
//     display: flex; flex-direction: column;
//   }
//   .ns-logo-name {
//     font-size: 19px; font-weight: 800;
//     letter-spacing: 3px; text-transform: uppercase;
//     color: #fff; line-height: 1.1;
//   }
//   .ns-logo-name em { color: #ff8c00; font-style: normal; }
//   .ns-logo-tag {
//     font-size: 8.5px; color: rgba(255,255,255,0.3);
//     letter-spacing: 1.5px; text-transform: uppercase;
//     margin-top: 2px;
//   }

//   /* ── Card ── */
//   .ns-card {
//     position: relative; z-index: 10;
//     width: 100%; max-width: 380px;
//     background: #1a1008;
//     border-radius: 14px;
//     padding: 28px 26px 24px;
//     box-shadow: 0 8px 60px rgba(0,0,0,0.7);
//   }

//   /* ── Error banner ── */
//   .ns-error {
//     background: rgba(220,38,38,0.12);
//     border: 1px solid rgba(220,38,38,0.35);
//     color: #fca5a5;
//     border-radius: 7px;
//     padding: 9px 13px;
//     font-size: 12px;
//     margin-bottom: 16px;
//   }

//   /* ── Avatar preview (centered) ── */
//   .ns-preview {
//     display: flex; justify-content: center;
//     margin-bottom: 22px;
//   }
//   .ns-av-outer {
//     position: relative; width: 86px; height: 86px;
//   }
//   .ns-av-ring {
//     position: absolute; inset: -3px;
//     border-radius: 50%;
//     background: linear-gradient(135deg, #ff8c00, #ff4500);
//     opacity: 0; transition: opacity 0.3s;
//   }
//   .ns-av-ring.active { opacity: 1; }
//   .ns-av-mask {
//     position: absolute; inset: 1px;
//     border-radius: 50%; background: #1a1008;
//   }
//   .ns-av-img {
//     position: absolute; inset: 4px;
//     border-radius: 50%; overflow: hidden; z-index: 1;
//   }
//   .ns-av-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
//   .ns-av-empty {
//     position: absolute; inset: 4px;
//     border-radius: 50%;
//     background: rgba(255,255,255,0.04);
//     border: 1px dashed rgba(255,140,0,0.3);
//     display: flex; align-items: center; justify-content: center;
//     color: rgba(255,255,255,0.2); z-index: 1;
//   }
//   .ns-av-badge {
//     position: absolute; bottom: 1px; right: 1px;
//     width: 24px; height: 24px;
//     background: linear-gradient(135deg, #ff8c00, #e05000);
//     border-radius: 50%; border: 2px solid #1a1008;
//     display: flex; align-items: center; justify-content: center;
//     z-index: 2;
//     box-shadow: 0 2px 8px rgba(255,100,0,0.4);
//   }

//   /* ── Section labels (same small-caps style as FULL NAME / EMAIL ADDRESS) ── */
//   .ns-field-label {
//     font-size: 10.5px;
//     font-weight: 700;
//     letter-spacing: 1.8px;
//     text-transform: uppercase;
//     color: rgba(255,255,255,0.55);
//     margin-bottom: 8px;
//   }

//   /* ── Upload button (styled like the form inputs in the card) ── */
//   .ns-upload-btn {
//     width: 100%;
//     padding: 11px 14px;
//     border-radius: 8px;
//     border: 1.5px dashed rgba(255,255,255,0.15);
//     background: rgba(255,255,255,0.05);
//     color: rgba(255,255,255,0.45);
//     font-family: 'Inter', sans-serif;
//     font-size: 13px; font-weight: 500;
//     cursor: pointer;
//     display: flex; align-items: center; justify-content: center; gap: 8px;
//     transition: all 0.2s;
//     margin-bottom: 20px;
//   }
//   .ns-upload-btn:hover {
//     border-color: rgba(255,140,0,0.45);
//     color: rgba(255,255,255,0.75);
//     background: rgba(255,100,0,0.07);
//   }
//   .ns-upload-btn.uploaded {
//     border-style: solid;
//     border-color: #ff8c00;
//     color: #ff9a20;
//     background: rgba(255,100,0,0.09);
//   }

//   /* ── Avatar grid ── */
//   .ns-av-grid {
//     display: grid;
//     grid-template-columns: repeat(4, 1fr);
//     gap: 8px;
//     margin-bottom: 20px;
//   }
//   .ns-av-item {
//     aspect-ratio: 1;
//     border-radius: 8px;
//     overflow: hidden;
//     border: 2px solid rgba(255,255,255,0.08);
//     background: rgba(255,255,255,0.04);
//     cursor: pointer; padding: 0;
//     position: relative;
//     transition: all 0.18s;
//   }
//   .ns-av-item:hover {
//     border-color: rgba(255,140,0,0.5);
//     transform: scale(1.06);
//   }
//   .ns-av-item.selected {
//     border-color: #ff8c00;
//     box-shadow: 0 0 0 1px #ff8c00, 0 0 12px rgba(255,140,0,0.3);
//   }
//   .ns-av-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
//   .ns-av-check {
//     position: absolute; inset: 0;
//     background: rgba(255,120,0,0.28);
//     display: flex; align-items: center; justify-content: center;
//   }

//   /* ── OR divider (matches "OR CONTINUE WITH" in the screenshot) ── */
//   .ns-or {
//     display: flex; align-items: center; gap: 12px;
//     margin: 2px 0 16px;
//     color: rgba(255,255,255,0.25);
//     font-size: 10px; font-weight: 600;
//     letter-spacing: 1.5px; text-transform: uppercase;
//   }
//   .ns-or::before, .ns-or::after {
//     content: ''; flex: 1; height: 1px;
//     background: rgba(255,255,255,0.1);
//   }

//   /* ── URL input (styled like the email input in the signup page) ── */
//   .ns-input-wrap {
//     position: relative; margin-bottom: 22px;
//   }
//   .ns-input-icon {
//     position: absolute; left: 13px; top: 50%;
//     transform: translateY(-50%);
//     color: rgba(255,255,255,0.25); pointer-events: none;
//     display: flex;
//   }
//   .ns-url-input {
//     width: 100%;
//     padding: 12px 14px 12px 40px;
//     border-radius: 8px;
//     background: rgba(255,255,255,0.06);
//     border: 1.5px solid rgba(255,255,255,0.12);
//     color: #fff;
//     font-family: 'Inter', sans-serif; font-size: 13px;
//     outline: none; transition: all 0.2s;
//   }
//   .ns-url-input::placeholder { color: rgba(255,255,255,0.22); }
//   .ns-url-input:focus {
//     background: #fff;
//     border-color: #ff8c00;
//     color: #111;
//     box-shadow: 0 0 0 3px rgba(255,140,0,0.18);
//   }
//   .ns-url-input:focus::placeholder { color: rgba(0,0,0,0.25); }

//   /* ── Bottom buttons ── */
//   .ns-actions {
//     display: flex; gap: 10px; margin-top: 2px;
//   }
//   .ns-btn-skip {
//     flex: 1; padding: 12px;
//     border-radius: 8px;
//     border: 1.5px solid rgba(255,255,255,0.12);
//     background: transparent;
//     color: rgba(255,255,255,0.4);
//     font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
//     cursor: pointer; transition: all 0.2s;
//   }
//   .ns-btn-skip:hover {
//     border-color: rgba(255,255,255,0.25);
//     color: rgba(255,255,255,0.7);
//   }
//   /* Main CTA – matches the orange "Create Account" button exactly */
//   .ns-btn-continue {
//     flex: 2; padding: 13px 18px;
//     border-radius: 8px; border: none;
//     background: linear-gradient(90deg, #ff6d00, #ff9a00);
//     color: #fff;
//     font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
//     cursor: pointer;
//     display: flex; align-items: center; justify-content: center; gap: 8px;
//     transition: all 0.2s;
//     box-shadow: 0 4px 22px rgba(255,120,0,0.35);
//     letter-spacing: 0.2px;
//   }
//   .ns-btn-continue:hover:not(:disabled) {
//     background: linear-gradient(90deg, #ff8000, #ffb020);
//     box-shadow: 0 6px 28px rgba(255,140,0,0.5);
//     transform: translateY(-1px);
//   }
//   .ns-btn-continue:disabled {
//     background: linear-gradient(90deg, rgba(255,109,0,0.3), rgba(255,154,0,0.3));
//     color: rgba(255,255,255,0.3);
//     box-shadow: none; cursor: not-allowed; transform: none;
//   }

//   /* ── Footer (same as "By signing up…" line) ── */
//   .ns-footer {
//     position: relative; z-index: 10;
//     margin-top: 18px; text-align: center;
//     font-size: 11px; color: rgba(255,255,255,0.22);
//   }
//   .ns-footer a { color: rgba(255,140,0,0.75); text-decoration: none; }
//   .ns-footer a:hover { color: #ff9a00; text-decoration: underline; }
// `;

// const ProfileSetup = ({ user, onComplete, onSkip, noBackground = false }) => {
//     const [selectedAvatar, setSelectedAvatar] = useState(null);
//     const [customUrl, setCustomUrl] = useState('');
//     const [uploadedImage, setUploadedImage] = useState(null);
//     const [useCustom, setUseCustom] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//     const fileInputRef = useRef(null);

//     const handleFileUpload = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             if (file.size > 20 * 1024 * 1024) {
//                 setError('Image too large. Please choose an image under 20MB.');
//                 return;
//             }
//             if (!file.type.startsWith('image/')) {
//                 setError('Please select an image file.');
//                 return;
//             }
//             const reader = new FileReader();
//             reader.onload = (event) => {
//                 setUploadedImage(event.target.result);
//                 setUseCustom(true);
//                 setCustomUrl('');
//                 setError('');
//             };
//             reader.readAsDataURL(file);
//         }
//     };

//     const getSelectedImage = () => {
//         if (useCustom) return uploadedImage || customUrl;
//         return selectedAvatar;
//     };

//     const handleSave = async () => {
//         const photoURL = getSelectedImage();
//         if (!photoURL) {
//             setError('Please select an avatar or upload an image');
//             return;
//         }
//         setLoading(true);
//         setError('');
//         try {
//             const isBase64 = photoURL.startsWith('data:');
//             if (isBase64) {
//                 await axios.put(`http://localhost:3000/users/${user.uid}/photo`, { photoURL });
//             } else {
//                 await updateProfile(auth.currentUser, { photoURL });
//                 await axios.put(`http://localhost:3000/users/${user.uid}/photo`, { photoURL });
//             }
//             await auth.currentUser.reload();
//             onComplete(auth.currentUser);
//         } catch (err) {
//             setError('Failed to update profile picture. Please try again.');
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const currentImage = getSelectedImage();
//     const isUploaded = !!(uploadedImage && useCustom);
//     const hasSelection = !!(selectedAvatar || customUrl || uploadedImage);

//     const content = (
//         <>
//             <style>{CSS}</style>
//             <div className="ns-wrap">
//                 {/* ── Background rays ── */}
//                 <div className="ns-ray ns-ray-glow" />
//                 <div className="ns-ray ns-ray-1" />
//                 <div className="ns-ray ns-ray-core" />
//                 <div className="ns-ray ns-ray-2" />
//                 <div className="ns-ray ns-ray-3" />

//                 {/* ── Logo ── */}
//                 <div className="ns-logo">
//                     <div className="ns-logo-icon">🪑</div>
//                     <div className="ns-logo-text">
//                         <span className="ns-logo-name">NEXT<em>SE🪑T</em></span>
//                         <span className="ns-logo-tag">Get the best seats. Book now.</span>
//                     </div>
//                 </div>

//                 {/* ── Card ── */}
//                 <div className="ns-card">
//                     {error && <div className="ns-error">⚠ {error}</div>}

//                     {/* Avatar preview */}
//                     <div className="ns-preview">
//                         <div className="ns-av-outer">
//                             <div className={`ns-av-ring ${currentImage ? 'active' : ''}`} />
//                             <div className="ns-av-mask" />
//                             {currentImage ? (
//                                 <div className="ns-av-img">
//                                     <img
//                                         src={currentImage}
//                                         alt="Selected avatar"
//                                         onError={(e) => { e.target.style.display = 'none'; }}
//                                     />
//                                 </div>
//                             ) : (
//                                 <div className="ns-av-empty">
//                                     <User size={30} />
//                                 </div>
//                             )}
//                             <div className="ns-av-badge">
//                                 <Camera size={11} color="#fff" />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Upload from device */}
//                     <div className="ns-field-label">Profile Picture</div>
//                     <input
//                         type="file"
//                         ref={fileInputRef}
//                         onChange={handleFileUpload}
//                         accept="image/*"
//                         style={{ display: 'none' }}
//                     />
//                     <button
//                         className={`ns-upload-btn ${isUploaded ? 'uploaded' : ''}`}
//                         onClick={() => fileInputRef.current?.click()}
//                     >
//                         <Upload size={15} />
//                         {isUploaded ? 'Image uploaded ✓' : 'Upload from device'}
//                     </button>

//                     {/* Avatar grid */}
//                     <div className="ns-field-label">Or choose an avatar</div>
//                     <div className="ns-av-grid">
//                         {AVATAR_OPTIONS.map((avatar, index) => (
//                             <button
//                                 key={index}
//                                 className={`ns-av-item ${selectedAvatar === avatar && !useCustom ? 'selected' : ''}`}
//                                 onClick={() => {
//                                     setSelectedAvatar(avatar);
//                                     setUseCustom(false);
//                                     setUploadedImage(null);
//                                 }}
//                             >
//                                 <img src={avatar} alt={`Avatar ${index + 1}`} />
//                                 {selectedAvatar === avatar && !useCustom && (
//                                     <div className="ns-av-check">
//                                         <Check size={18} color="#fff" strokeWidth={3} />
//                                     </div>
//                                 )}
//                             </button>
//                         ))}
//                     </div>

//                     {/* URL input */}
//                     <div className="ns-or">or paste image url</div>
//                     <div className="ns-input-wrap">
//                         <span className="ns-input-icon">
//                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
//                                 stroke="currentColor" strokeWidth="2"
//                                 strokeLinecap="round" strokeLinejoin="round">
//                                 <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
//                                 <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
//                             </svg>
//                         </span>
//                         <input
//                             type="url"
//                             className="ns-url-input"
//                             value={customUrl}
//                             onChange={(e) => {
//                                 setCustomUrl(e.target.value);
//                                 if (e.target.value) {
//                                     setUseCustom(true);
//                                     setUploadedImage(null);
//                                 }
//                             }}
//                             onFocus={() => { if (customUrl) setUseCustom(true); }}
//                             placeholder="https://example.com/your-image.jpg"
//                         />
//                     </div>

//                     {/* Action buttons */}
//                     <div className="ns-actions">
//                         <button className="ns-btn-skip" onClick={onSkip}>
//                             Skip
//                         </button>
//                         <button
//                             className="ns-btn-continue"
//                             onClick={handleSave}
//                             disabled={loading || (!selectedAvatar && !customUrl && !uploadedImage)}
//                         >
//                             {loading ? (
//                                 <>
//                                     <Loader2
//                                         size={16}
//                                         style={{ animation: 'nsSpin 1s linear infinite' }}
//                                     />
//                                     Saving...
//                                 </>
//                             ) : (
//                                 <>
//                                     Continue
//                                     <ArrowRight size={15} />
//                                 </>
//                             )}
//                         </button>
//                     </div>
//                 </div>

//                 {/* Footer */}
//                 <div className="ns-footer">
//                     By signing up you agree to our{' '}
//                     <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
//                 </div>
//             </div>
//         </>
//     );

//     // Support noBackground mode (renders without the full-page bg wrapper)
//     if (noBackground) {
//         return (
//             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
//                 {content}
//             </div>
//         );
//     }

//     return content;
// };

// export default ProfileSetup;

















import React, { useState, useRef } from 'react';
import { Camera, Check, Loader2, ArrowRight, User, Upload } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import axios from 'axios';
import FloatingLines from '../Background/FloatingLines';
import logo from '../assets/logo/NextSeat.png';
import './Profile_Setup.css';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Whiskers&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Gamer&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky&backgroundColor=baffc9',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Pro&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Star&backgroundColor=b6e3f4',
];

const ProfileSetup = ({ user, onComplete, onSkip, noBackground = false }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('Image too large. Please choose an image under 20MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setUseCustom(true);
      setCustomUrl('');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const getSelectedImage = () => {
    if (useCustom) return uploadedImage || customUrl;
    return selectedAvatar;
  };

  const handleSave = async () => {
    const photoURL = getSelectedImage();

    if (!photoURL) {
      setError('Please select an avatar or upload an image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isBase64 = photoURL.startsWith('data:');

      if (isBase64) {
        // Save to MongoDB only — Firebase doesn't support large base64
        await axios.put(`http://localhost:3000/users/${user.uid}/photo`, { photoURL });
      } else {
        // For URLs save to both Firebase and MongoDB
        await updateProfile(auth.currentUser, { photoURL });
        await axios.put(`http://localhost:3000/users/${user.uid}/photo`, { photoURL });
      }

      await auth.currentUser.reload();
      onComplete(auth.currentUser);
    } catch (err) {
      setError('Failed to update profile picture. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentImage = getSelectedImage();
  const isUploaded = !!(uploadedImage && useCustom);

  const content = (
    <div className="ns-wrap">
      {!noBackground && (
        <div className="ns-bg">
          <FloatingLines
            linesGradient={['#EB5600', '#FF8C23', '#C44700', '#FF6A35']}
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[8, 6, 4]}
            animationSpeed={0.8}
            interactive={true}
            parallax={true}
            parallaxStrength={0.15}
            mixBlendMode="normal"
          />
        </div>
      )}

      {/* Logo */}
      <div className="ns-logo">
        <img src={logo} alt="NextSeat" className="ns-logo-img" />
      </div>

      {/* Card */}
      <div className="ns-card">
        {error && <div className="ns-error">⚠ {error}</div>}

        {/* Avatar preview */}
        <div className="ns-preview">
          <div className="ns-av-outer">
            <div className={`ns-av-ring ${currentImage ? 'active' : ''}`} />
            <div className="ns-av-mask" />
            {currentImage ? (
              <div className="ns-av-img">
                <img
                  src={currentImage}
                  alt="Selected avatar"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="ns-av-empty">
                <User size={30} />
              </div>
            )}
            <div className="ns-av-badge">
              <Camera size={11} color="#fff" />
            </div>
          </div>
        </div>

        {/* Upload from device */}
        <div className="ns-field-label">Profile Picture</div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button
          className={`ns-upload-btn ${isUploaded ? 'uploaded' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          {isUploaded ? 'Image uploaded ✓' : 'Upload from device'}
        </button>

        {/* Avatar grid */}
        <div className="ns-field-label">Or choose an avatar</div>
        <div className="ns-av-grid">
          {AVATAR_OPTIONS.map((avatar, index) => (
            <button
              key={index}
              className={`ns-av-item ${selectedAvatar === avatar && !useCustom ? 'selected' : ''}`}
              onClick={() => {
                setSelectedAvatar(avatar);
                setUseCustom(false);
                setUploadedImage(null);
              }}
            >
              <img src={avatar} alt={`Avatar ${index + 1}`} />
              {selectedAvatar === avatar && !useCustom && (
                <div className="ns-av-check">
                  <Check size={18} color="#fff" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* URL input */}
        <div className="ns-or">or paste image url</div>
        <div className="ns-input-wrap">
          <span className="ns-input-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </span>
          <input
            type="url"
            className="ns-url-input"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              if (e.target.value) {
                setUseCustom(true);
                setUploadedImage(null);
              }
            }}
            onFocus={() => { if (customUrl) setUseCustom(true); }}
            placeholder="https://example.com/your-image.jpg"
          />
        </div>

        {/* Action buttons */}
        <div className="ns-actions">
          <button className="ns-btn-skip" onClick={onSkip}>
            Skip
          </button>
          <button
            className="ns-btn-continue"
            onClick={handleSave}
            disabled={loading || (!selectedAvatar && !customUrl && !uploadedImage)}
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: 'nsSpin 1s linear infinite' }}
                />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="ns-footer">
        By signing up you agree to our{' '}
        <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
      </div>
    </div>
  );

  return content;
};

export default ProfileSetup;
