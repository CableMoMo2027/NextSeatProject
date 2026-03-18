import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, ArrowRight, User, Upload } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import axios from 'axios';
import FloatingLines from '../../components/Background/FloatingLines';
import logo from '../../assets/logo/NextSeat.png';
import { MAIN_API_BASE } from '../../config/runtime';
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
  const API_BASE = MAIN_API_BASE;
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbPhotoURL, setDbPhotoURL] = useState('');
  const [initializing, setInitializing] = useState(true);
  const fileInputRef = useRef(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const applyInitialPhoto = (rawUrl) => {
      const url = String(rawUrl || '').trim();
      if (!url || hasInitializedRef.current) return;

      if (AVATAR_OPTIONS.includes(url)) {
        setSelectedAvatar(url);
        setUseCustom(false);
      } else {
        setCustomUrl(url);
        setUseCustom(true);
      }
      hasInitializedRef.current = true;
    };

    const loadUserPhoto = async () => {
      try {
        if (user?.photoURL) {
          applyInitialPhoto(user.photoURL);
        }

        if (!user?.uid) return;
        const res = await axios.get(`${API_BASE}/users/${user.uid}`);
        const backendPhotoURL = String(res?.data?.photoURL || '').trim();
        if (mounted) {
          setDbPhotoURL(backendPhotoURL);
          applyInitialPhoto(backendPhotoURL);
        }
      } catch (_err) {
        // Ignore and fallback to current local state/Firebase photoURL.
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    loadUserPhoto();
    return () => {
      mounted = false;
    };
  }, [user]);

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
      let savedPhotoURL = photoURL;

      if (isBase64) {
        // Save to backend, then use returned URL for Firebase profile to reflect immediately in UI.
        const res = await axios.put(`${API_BASE}/users/${user.uid}/photo`, { photoURL });
        savedPhotoURL = String(res?.data?.photoURL || photoURL);
      } else {
        const res = await axios.put(`${API_BASE}/users/${user.uid}/photo`, { photoURL });
        savedPhotoURL = String(res?.data?.photoURL || photoURL);
      }

      const resolvedPhotoURL = savedPhotoURL.startsWith('/uploads')
        ? `${API_BASE}${savedPhotoURL}`
        : savedPhotoURL.startsWith('uploads/')
          ? `${API_BASE}/${savedPhotoURL}`
          : savedPhotoURL;

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: resolvedPhotoURL });
        await auth.currentUser.reload();
      }
      onComplete(auth.currentUser);
    } catch (err) {
      setError('Failed to update profile picture. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentImage = getSelectedImage() || dbPhotoURL || user?.photoURL || '';
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
            disabled={loading || initializing || (!selectedAvatar && !customUrl && !uploadedImage && !dbPhotoURL && !user?.photoURL)}
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
