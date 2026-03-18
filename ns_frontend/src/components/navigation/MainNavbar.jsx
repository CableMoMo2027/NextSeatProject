import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase.js';
import { setSavedLanguage } from '../../services/homeCache.js';
import { useAppLanguage } from '../../hooks/useAppLanguage.js';
import { useToast } from '../../hooks/useToast.jsx';
import { MAIN_API_BASE } from '../../config/runtime.js';
import logo from '../../assets/logo/NextSeat.png';
import '../../pages/browse/Home.css';

const API_BASE = MAIN_API_BASE;
const TICKET_API_BASE = MAIN_API_BASE;
const TICKET_UPCOMING_GRACE_MS = 10 * 60 * 1000;

function formatTicketDateTime(showtime, isThai) {
  const dt = new Date(showtime);
  return {
    date: dt.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString(isThai ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

const GENRE_ROWS = [
  { id: 28, nameEn: 'Action', nameTh: 'แอ็กชัน' },
  { id: 35, nameEn: 'Comedy', nameTh: 'คอมเมดี้' },
  { id: 27, nameEn: 'Horror', nameTh: 'สยองขวัญ' },
  { id: 16, nameEn: 'Anime / Animation', nameTh: 'อนิเมะ / แอนิเมชัน' },
  { id: 878, nameEn: 'Sci-Fi', nameTh: 'ไซไฟ' },
  { id: 18, nameEn: 'Drama', nameTh: 'ดราม่า' },
  { id: 10749, nameEn: 'Romance', nameTh: 'โรแมนติก' },
  { id: 14, nameEn: 'Fantasy', nameTh: 'แฟนตาซี' },
];

const normalizeProfilePhotoUrl = (rawValue) => {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/uploads')) return `${API_BASE}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE}/${raw}`;
  return raw;
};

export default function MainNavbar({
  user,
  active = 'home',
  memberDetailAsPopup = true,
  searchCandidates = [],
}) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [authUser, setAuthUser] = useState(() => auth.currentUser || null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(true);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const { lang, isThai } = useAppLanguage();
  const [isToggling, setIsToggling] = useState(false);
  const [memberPopupOpen, setMemberPopupOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberDbUser, setMemberDbUser] = useState(null);
  const [localAvatarRaw, setLocalAvatarRaw] = useState('');
  const [pendingPhotoRaw, setPendingPhotoRaw] = useState('');
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [appliedGenreId, setAppliedGenreId] = useState('all');
  const [myTicketPopupOpen, setMyTicketPopupOpen] = useState(false);
  const [myTicketLoading, setMyTicketLoading] = useState(false);
  const [myTicketError, setMyTicketError] = useState('');
  const [myTickets, setMyTickets] = useState([]);
  const [myTicketTab, setMyTicketTab] = useState('upcoming');
  const [myTicketSlideDir, setMyTicketSlideDir] = useState('left');
  const [myTicketNowTs, setMyTicketNowTs] = useState(Date.now);
  const typeMenuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const avatarInputRef = useRef(null);

  const readAxiosMessage = (error, fallback) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (typeof error?.message === 'string' ? error.message : '');
    return message || fallback;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setAuthUser(nextUser || null);
    });
    return () => unsubscribe();
  }, []);

  const currentUser = user || authUser || null;
  useEffect(() => {
    let mounted = true;
    const uid = currentUser?.uid;
    if (!uid) {
      setMemberDbUser(null);
      setLocalAvatarRaw('');
      return () => {
        mounted = false;
      };
    }

    const loadDbProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/${uid}`);
        if (!mounted) return;
        const dbUser = res?.data || null;
        setMemberDbUser(dbUser);
        const dbPhoto = String(dbUser?.photoURL || '').trim();
        if (dbPhoto) {
          setLocalAvatarRaw(dbPhoto);
        }
      } catch {
        // Keep fallback to Firebase profile data when backend profile is unavailable.
      }
    };

    loadDbProfile();
    return () => {
      mounted = false;
    };
  }, [currentUser?.uid]);

  const avatarUrl = useMemo(() => {
    return normalizeProfilePhotoUrl(localAvatarRaw || currentUser?.photoURL) || null;
  }, [localAvatarRaw, currentUser]);
  const memberAvatarUrl = useMemo(() => {
    if (pendingPhotoPreview) return pendingPhotoPreview;
    if (pendingPhotoRaw) return normalizeProfilePhotoUrl(pendingPhotoRaw);
    return normalizeProfilePhotoUrl(memberDbUser?.photoURL || localAvatarRaw || currentUser?.photoURL);
  }, [memberDbUser, localAvatarRaw, currentUser, pendingPhotoRaw, pendingPhotoPreview]);
  const memberPhotoHistory = useMemo(() => {
    const current = String(memberDbUser?.photoURL || localAvatarRaw || '').trim();
    const history = Array.isArray(memberDbUser?.photoHistory) ? memberDbUser.photoHistory : [];
    return history
      .map((item) => String(item || '').trim())
      .filter((item) => item && item !== current)
      .slice(0, 8);
  }, [memberDbUser, localAvatarRaw]);

  const hasPendingPhotoChange = useMemo(
    () => Boolean(pendingPhotoFile || pendingPhotoRaw),
    [pendingPhotoFile, pendingPhotoRaw],
  );
  const autoCompleteResults = useMemo(() => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return [];
    return (Array.isArray(searchCandidates) ? searchCandidates : [])
      .filter((movie) => String(movie?.title || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [navSearch, searchCandidates]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverflowY = document.body.style.overflowY;
    const prevOverflowX = document.body.style.overflowX;

    if (memberPopupOpen || myTicketPopupOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflowY = 'auto';
      document.body.style.overflowX = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overflowY = prevOverflowY;
      document.body.style.overflowX = prevOverflowX;
    };
  }, [memberPopupOpen, myTicketPopupOpen]);

  useEffect(() => {
    if (!myTicketPopupOpen) return undefined;
    const timer = setInterval(() => setMyTicketNowTs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [myTicketPopupOpen]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) {
        setTypeMenuOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!pendingPhotoPreview || !pendingPhotoPreview.startsWith('blob:')) return undefined;
    return () => {
      URL.revokeObjectURL(pendingPhotoPreview);
    };
  }, [pendingPhotoPreview]);

  const openMemberPopup = async () => {
    if (!currentUser?.uid) {
      navigate('/login');
      setProfileOpen(false);
      return;
    }
    setProfileOpen(false);
    setMemberPopupOpen(true);
    setMemberLoading(true);
    setMemberError('');
    clearPendingPhotoChange();
    try {
      const res = await axios.get(`${API_BASE}/users/${currentUser.uid}`);
      setMemberDbUser(res.data || null);
      if (res.data?.photoURL) {
        setLocalAvatarRaw(String(res.data.photoURL));
      }
    } catch (error) {
      setMemberError(
        readAxiosMessage(error, isThai ? 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ' : 'Unable to load member data.'),
      );
    } finally {
      setMemberLoading(false);
    }
  };

  const openMyTicketPopup = async () => {
    if (!currentUser?.uid) {
      navigate('/login');
      setProfileOpen(false);
      return;
    }
    setProfileOpen(false);
    setMyTicketPopupOpen(true);
    setMyTicketLoading(true);
    setMyTicketError('');
    setMyTicketTab('upcoming');
    setMyTicketNowTs(Date.now());
    try {
      const res = await axios.get(`${TICKET_API_BASE}/bookings/my/${currentUser.uid}`);
      const raw = Array.isArray(res.data) ? res.data : [];
      const mapped = raw.map((b) => {
        const screening = b.screeningId || {};
        const { date, time } = formatTicketDateTime(screening.showtime || b.createdAt, isThai);
        return {
          id: b._id,
          bookingId: b._id,
          date,
          time,
          title: screening.movieTitle || 'Movie',
          cinema: b.selectedCinema || screening.theater || '-',
          seats: b.seats || [],
          duration: '-',
          status: b.status,
          showtime: screening.showtime,
          createdAt: b.createdAt,
        };
      });
      setMyTickets(mapped);
    } catch {
      setMyTicketError(isThai ? 'โหลดรายการตั๋วไม่สำเร็จ' : 'Unable to load tickets.');
    } finally {
      setMyTicketLoading(false);
    }
  };

  const openAvatarPicker = () => {
    if (memberSaving || memberLoading) return;
    avatarInputRef.current?.click();
  };

  const clearPendingPhotoChange = () => {
    setPendingPhotoRaw('');
    setPendingPhotoFile(null);
    setPendingPhotoPreview('');
  };

  const uploadAvatarFromInput = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentUser?.uid) return;

    const isImage = String(file.type || '').startsWith('image/');
    if (!isImage) {
      setMemberError(isThai ? 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' : 'Please choose an image file only.');
      return;
    }

    setMemberError('');
    setPendingPhotoFile(file);
    setPendingPhotoRaw('');
    setPendingPhotoPreview(URL.createObjectURL(file));
  };

  const selectHistoryAvatar = async (photoURL) => {
    if (!photoURL || memberSaving) return;
    setMemberError('');
    setPendingPhotoFile(null);
    setPendingPhotoPreview('');
    setPendingPhotoRaw(String(photoURL));
  };

  const savePendingPhotoChange = async () => {
    if (!currentUser?.uid || !hasPendingPhotoChange || memberSaving) return;
    setMemberSaving(true);
    setMemberError('');
    try {
      let res;
      if (pendingPhotoFile) {
        const formData = new FormData();
        formData.append('avatar', pendingPhotoFile);
        res = await axios.put(`${API_BASE}/users/${currentUser.uid}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await axios.put(`${API_BASE}/users/${currentUser.uid}/photo`, { photoURL: pendingPhotoRaw });
      }

      const nextUser = res?.data || null;
      if (nextUser) {
        setMemberDbUser(nextUser);
      }
      if (nextUser?.photoURL) {
        setLocalAvatarRaw(String(nextUser.photoURL));
      } else if (pendingPhotoRaw) {
        setLocalAvatarRaw(String(pendingPhotoRaw));
      }
      clearPendingPhotoChange();
      success(isThai ? 'บันทึกรูปโปรไฟล์แล้ว' : 'Profile picture saved.');
    } catch (error) {
      setMemberError(
        readAxiosMessage(error, isThai ? 'บันทึกรูปโปรไฟล์ไม่สำเร็จ' : 'Failed to save profile picture.'),
      );
    } finally {
      setMemberSaving(false);
    }
  };

  useEffect(() => {
    if (!memberPopupOpen) {
      clearPendingPhotoChange();
      setMemberError('');
    }
  }, [memberPopupOpen]);

  const myGroupedTickets = useMemo(() => {
    const now = myTicketNowTs;
    const upcoming = [];
    const history = [];
    for (const t of myTickets) {
      const bookedAtMs = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
      const withinWindow = Number.isFinite(bookedAtMs) && (now - bookedAtMs) < TICKET_UPCOMING_GRACE_MS;
      if (t.status === 'confirmed' && withinWindow) upcoming.push(t);
      else history.push(t);
    }
    return { upcoming, history };
  }, [myTickets, myTicketNowTs]);

  const links = useMemo(
    () => [
      { key: 'home', label: isThai ? 'หน้าแรก' : 'Home', to: '/home' },
      { key: 'movies', label: isThai ? 'ภาพยนตร์' : 'Movies', to: '/movies' },
      { key: 'upcoming', label: isThai ? 'เร็วๆ นี้' : 'Upcoming', to: '/upcoming' },
      { key: 'promotion', label: isThai ? 'โปรโมชั่น' : 'Promotion', to: '/promotion' },
    ],
    [isThai],
  );

  const goToSearchResults = (queryText, genreId = appliedGenreId) => {
    const params = new URLSearchParams();
    const q = String(queryText || '').trim();
    if (q) params.set('q', q);
    if (genreId && genreId !== 'all') params.set('genre', String(genreId));
    params.set('lang', lang);
    navigate(`/search-results?${params.toString()}`, {
      state: {
        query: q,
        genreId,
        lang,
      },
    });
  };

  const submitNavbarSearch = (e) => {
    e.preventDefault();
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    setShowSearchSuggestions(false);
    goToSearchResults(navSearch, appliedGenreId);
  };

  const applyTypeFilter = (genreId) => {
    setAppliedGenreId(genreId);
    setNavSearch('');
    setTypeMenuOpen(false);
    setMobileMenuOpen(false);
    setShowSearchSuggestions(false);
    goToSearchResults('', genreId);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      success(isThai ? 'ออกจากระบบแล้ว' : 'Signed out successfully.');
      setProfileOpen(false);
    } catch {
      toastError(isThai ? 'ออกจากระบบไม่สำเร็จ' : 'Failed to sign out.');
    }
  };

  return (
    <nav className={`home-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-brand">
        <img src={logo} alt="NextSeat" className="navbar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/home')} />
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen((p) => !p)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <ul className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {links.map((l) => (
            <li key={l.key}>
              <a
                href="#"
                className={active === l.key ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(l.to);
                  setMobileMenuOpen(false);
                }}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="nav-type-wrap" ref={typeMenuRef}>
            <button
              type="button"
              className="nav-type-btn"
              onClick={() => setTypeMenuOpen((prev) => !prev)}
            >
              {isThai ? 'ประเภท ▾' : 'Type ▾'}
            </button>
            {typeMenuOpen && (
              <div className="nav-type-menu">
                <button
                  type="button"
                  className="nav-type-item"
                  onClick={() => applyTypeFilter('all')}
                >
                  {isThai ? 'ทุกประเภท' : 'All Types'}
                </button>
                {GENRE_ROWS.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    className="nav-type-item"
                    onClick={() => applyTypeFilter(String(genre.id))}
                  >
                    {isThai ? genre.nameTh : genre.nameEn}
                  </button>
                ))}
              </div>
            )}
          </li>
        </ul>
      </div>

      <div className="navbar-right">
        <form className={`navbar-search-form ${searchOpen ? 'open' : ''}`} onSubmit={submitNavbarSearch} ref={searchBoxRef}>
          <button
            type="button"
            className="navbar-search-toggle"
            onClick={() => {
              setSearchOpen((prev) => {
                const next = !prev;
                if (!next) setShowSearchSuggestions(false);
                return next;
              });
            }}
            aria-label="Toggle search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <div className="navbar-search-input-wrap">
            <input
              type="text"
              className="navbar-search-input"
              value={navSearch}
              onChange={(e) => {
                setNavSearch(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder={isThai ? 'ค้นหาหนัง...' : 'Search movies...'}
            />

            {showSearchSuggestions && autoCompleteResults.length > 0 && (
              <div className="navbar-search-suggestions">
                {autoCompleteResults.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="navbar-suggestion-item"
                    onClick={() => {
                      const title = String(movie?.title || '');
                      setNavSearch(title);
                      setShowSearchSuggestions(false);
                      goToSearchResults(title, appliedGenreId);
                    }}
                  >
                    {movie.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="navbar-search-btn">
            {isThai ? 'ค้นหา' : 'Search'}
          </button>
        </form>

        <button
          className={`lang-toggle${isToggling ? ' toggle-animate' : ''}`}
          onClick={() => {
            setIsToggling(true);
            const nextLang = lang === 'en-US' ? 'th-TH' : 'en-US';
            setSavedLanguage(nextLang);
            setTimeout(() => setIsToggling(false), 450);
          }}
        >
          {lang === 'en-US' ? '🇹🇭 TH' : '🇺🇸 EN'}
        </button>
        <div className="navbar-profile-wrap">
          <button className="navbar-profile-btn" onClick={() => setProfileOpen((p) => !p)}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="profile" className="navbar-avatar" />
            ) : (
              <div className="navbar-avatar-guest">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <span className={`navbar-profile-arrow ${profileOpen ? 'open' : ''}`}>▾</span>
          </button>

          {profileOpen && (
            <>
              <div className="profile-dropdown-overlay" onClick={() => setProfileOpen(false)} />
              <div className="profile-dropdown">
                {currentUser ? (
                  <>
                    <div className="profile-dropdown-header">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="dropdown-avatar" />
                      ) : (
                        <div className="dropdown-avatar-guest">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">
                          {memberDbUser?.displayName || currentUser.displayName || (isThai ? 'ผู้ใช้' : 'User')}
                        </span>
                        <span className="dropdown-user-email">{memberDbUser?.email || currentUser.email || '-'}</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        if (memberDetailAsPopup) {
                          openMemberPopup();
                          return;
                        }
                        navigate('/member-detail');
                        setProfileOpen(false);
                      }}
                    >
                      {isThai ? 'รายละเอียดสมาชิก' : 'Member Detail'}
                    </button>
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        if (memberDetailAsPopup) {
                          openMyTicketPopup();
                          return;
                        }
                        navigate('/my-ticket');
                        setProfileOpen(false);
                      }}
                    >
                      {isThai ? 'ตั๋วของฉัน' : 'My Ticket'}
                    </button>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item signout" onClick={handleSignOut}>
                      {isThai ? 'ออกจากระบบ' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="profile-dropdown-header">
                      <div className="dropdown-avatar-guest">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">{isThai ? 'ผู้เยี่ยมชม' : 'Guest'}</span>
                        <span className="dropdown-user-email">{isThai ? 'ยังไม่ได้เข้าสู่ระบบ' : 'Not signed in'}</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item" onClick={() => { navigate('/login'); setProfileOpen(false); }}>{isThai ? 'เข้าสู่ระบบ' : 'Login'}</button>
                    <button className="profile-dropdown-item" onClick={() => { navigate('/signup'); setProfileOpen(false); }}>{isThai ? 'สมัครสมาชิก' : 'Sign Up'}</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {memberPopupOpen && (
        <div className="modal-backdrop" onClick={() => setMemberPopupOpen(false)}>
          <div className="member-popup" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMemberPopupOpen(false)}>✕</button>
            <h3 className="member-popup-title">{isThai ? 'รายละเอียดสมาชิก' : 'Member Detail'}</h3>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="member-popup-file-input"
              onChange={uploadAvatarFromInput}
            />

            {memberLoading && <p className="member-popup-status">{isThai ? 'กำลังโหลดข้อมูล...' : 'Loading member data...'}</p>}
            {!memberLoading && memberSaving && <p className="member-popup-status">{isThai ? 'กำลังบันทึกรูปโปรไฟล์...' : 'Saving profile picture...'}</p>}
            {!memberLoading && memberError && <p className="member-popup-status error">{memberError}</p>}

            {!memberLoading && (
              <>
                <div className="member-profile-center">
                  <button
                    type="button"
                    className="member-popup-avatar-btn"
                    onClick={openAvatarPicker}
                    title={isThai ? 'เปลี่ยนรูปโปรไฟล์' : 'Change profile picture'}
                  >
                    {memberAvatarUrl ? (
                      <img src={memberAvatarUrl} alt="avatar" className="member-popup-avatar" />
                    ) : (
                      <div className="member-popup-avatar member-popup-avatar-fallback">
                        {(memberDbUser?.displayName || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className="member-avatar-change-link"
                    onClick={openAvatarPicker}
                  >
                    {isThai ? 'แตะเพื่อเปลี่ยนรูปโปรไฟล์' : 'Tap to change profile picture'}
                  </button>
                </div>

                {hasPendingPhotoChange && (
                  <div className="member-profile-edit-actions">
                    <button
                      type="button"
                      className="member-profile-save-btn"
                      onClick={savePendingPhotoChange}
                      disabled={memberSaving}
                    >
                      {memberSaving ? (isThai ? 'กำลังบันทึก...' : 'Saving...') : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="member-profile-cancel-btn"
                      onClick={clearPendingPhotoChange}
                      disabled={memberSaving}
                    >
                      {isThai ? 'ยกเลิก' : 'Cancel'}
                    </button>
                  </div>
                )}

                <div className="member-popup-form">
                  <div className="member-popup-field">
                    <span className="member-popup-label">Name</span>
                    <div className="member-popup-value">
                      {memberDbUser?.displayName || currentUser?.displayName || (isThai ? 'ผู้ใช้' : 'User')}
                    </div>
                  </div>
                  <div className="member-popup-field">
                    <span className="member-popup-label">Email</span>
                    <div className="member-popup-value">{memberDbUser?.email || currentUser?.email || '-'}</div>
                  </div>
                </div>

                {memberPhotoHistory.length > 0 && (
                  <div className="member-history-wrap">
                    <p className="member-history-title">{isThai ? 'รูปโปรไฟล์เดิมของคุณ' : 'Your previous profile pictures'}</p>
                    <div className="member-history-grid">
                      {memberPhotoHistory.map((historyUrl, index) => (
                        <button
                          key={`${historyUrl}-${index}`}
                          type="button"
                          className="member-history-item"
                          onClick={() => selectHistoryAvatar(historyUrl)}
                          disabled={memberSaving}
                          title={isThai ? 'ใช้รูปนี้' : 'Use this picture'}
                        >
                          <img src={normalizeProfilePhotoUrl(historyUrl)} alt={`history-avatar-${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {myTicketPopupOpen && (
        <div className="modal-backdrop" onClick={() => setMyTicketPopupOpen(false)}>
          <div className="ticket-popup" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMyTicketPopupOpen(false)}>✕</button>
            <h3 className="member-popup-title">{isThai ? 'ตั๋วของฉัน' : 'My Tickets'}</h3>

            {/* Tabs */}
            <div className="ticket-popup-tabs">
              {['upcoming', 'history'].map((tab) => (
                <button
                  key={tab}
                  className={`ticket-popup-tab${myTicketTab === tab ? ' active' : ''}`}
                  onClick={() => {
                    if (tab === myTicketTab) return;
                    setMyTicketSlideDir(tab === 'history' ? 'left' : 'right');
                    setMyTicketTab(tab);
                  }}
                >
                  {tab === 'upcoming'
                    ? (isThai ? 'กำลังจะมาถึง' : 'Upcoming')
                    : (isThai ? 'ประวัติ' : 'History')}
                </button>
              ))}
            </div>

            {/* Body */}
            {myTicketLoading && (
              <p className="member-popup-status">{isThai ? 'กำลังโหลดตั๋ว...' : 'Loading tickets...'}</p>
            )}
            {myTicketError && (
              <p className="member-popup-status error">{myTicketError}</p>
            )}

            {!myTicketLoading && !myTicketError && (
              <div key={myTicketTab} className={`ticket-popup-scroll ticket-popup-scroll--${myTicketSlideDir}`}>
                {myGroupedTickets[myTicketTab].length === 0 ? (
                  <div className="ticket-popup-empty">
                    <svg className="ticket-popup-empty-icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="10" y="18" width="60" height="44" rx="7" stroke="#333" strokeWidth="2.5"/>
                      <path d="M10 32h60" stroke="#333" strokeWidth="2.5" strokeDasharray="5 4"/>
                      <circle cx="40" cy="52" r="8" stroke="#444" strokeWidth="2"/>
                      <path d="M37 52h6M40 49v6" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M22 25h8M22 38h36M22 44h20" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="58" cy="22" r="10" fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
                      <path d="M55 22h6M58 19v6" stroke="#ff6a00" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p className="ticket-popup-empty-title">{isThai ? 'ไม่พบตั๋ว' : 'No tickets found'}</p>
                    <p className="ticket-popup-empty-sub">
                      {myTicketTab === 'upcoming'
                        ? (isThai ? 'ยังไม่มีการจองที่กำลังจะมาถึง' : 'You have no upcoming bookings')
                        : (isThai ? 'ยังไม่มีประวัติการจอง' : 'No booking history yet')}
                    </p>
                  </div>
                ) : (
                  <div className="ticket-popup-grid">
                    {myGroupedTickets[myTicketTab].map((ticket) => (
                      <div
                        key={ticket.id}
                        className="ticket-popup-card"
                        onClick={() => {
                          setMyTicketPopupOpen(false);
                          navigate('/ticket-detail', { state: { ticket } });
                        }}
                      >
                        <div className="ticket-popup-card-row">
                          <span className="ticket-popup-label">{isThai ? 'วันที่' : 'Date'}</span>
                          <span className="ticket-popup-value">{ticket.date}</span>
                        </div>
                        <div className="ticket-popup-card-divider" />
                        <p className="ticket-popup-title">{ticket.title}</p>
                        <div className="ticket-popup-card-footer">
                          <div>
                            <span className="ticket-popup-label">
                              {isThai ? `ที่นั่ง (${ticket.seats.length})` : `Seats (${ticket.seats.length})`}
                            </span>
                            <span className="ticket-popup-value">{ticket.seats.join(', ')}</span>
                          </div>
                          <span className="ticket-popup-time">{ticket.time}</span>
                        </div>
                        <p className="ticket-popup-cinema">{ticket.cinema}</p>
                        {ticket.status === 'cancelled' && (
                          <span className="ticket-popup-cancelled">{isThai ? 'ยกเลิกแล้ว' : 'CANCELLED'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              className="member-popup-edit-btn"
              onClick={() => { setMyTicketPopupOpen(false); navigate('/my-ticket'); }}
            >
              {isThai ? 'ดูทั้งหมด' : 'View All Tickets'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
