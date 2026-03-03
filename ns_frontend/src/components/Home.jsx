import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo/NextSeat.png';
import infoIcon from '../assets/logo/2392583-200.png';
import AnimatedContent from './Animated_Content';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { fetchHomeData, getHomeState, saveHomeState, getCachedDetails, setCachedDetails } from '../services/homeCache';
import './Home.css';

const API_BASE = 'http://localhost:3000';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const SLIDE_INTERVAL = 8000; // ms per slide
// Genre IDs to show as category rows

// Helper: extract certification from TMDB release_dates
function getCertification(releaseDates) {
    if (!releaseDates?.results) return 'N/A';
    const th = releaseDates.results.find((r) => r.iso_3166_1 === 'TH');
    const us = releaseDates.results.find((r) => r.iso_3166_1 === 'US');
    const entry = th || us;
    const cert = entry?.release_dates?.find((rd) => rd.certification)?.certification;
    return cert || 'N/A';
}

// Genre IDs to show as category rows
const GENRE_ROWS = [
    { id: 28, name: 'Action' },
    { id: 35, name: 'Comedy' },
    { id: 27, name: 'Horror' },
    { id: 16, name: 'Anime / Animation' },
    { id: 878, name: 'Sci-Fi' },
    { id: 18, name: 'Drama' },
    { id: 10749, name: 'Romance' },
    { id: 14, name: 'Fantasy' },
];



// ===== Reusable CategoryRow with smart scroll arrows =====
function CategoryRow({ genre, movies, openModal, isTop10 }) {
    const rowRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = useCallback(() => {
        const el = rowRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 5);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll, movies]);

    const scroll = (dir) => {
        const el = rowRef.current;
        if (el) el.scrollBy({ left: dir * 600, behavior: 'smooth' });
    };

    return (
        <section className={`category-section${isTop10 ? ' top10-section-row' : ''}`}>
            <h2 className="category-title">{genre.name}</h2>
            <div className="category-row-wrapper">
                {canScrollLeft && (
                    <button className="scroll-arrow scroll-arrow-left" onClick={() => scroll(-1)}>
                        ‹
                    </button>
                )}
                <div className="category-row" ref={rowRef}>
                    {movies.map((movie, index) => (
                        <div
                            key={movie.id}
                            className={`movie-card${isTop10 ? ' top10-card' : ''}`}
                            onClick={() => openModal(movie.id)}
                        >
                            {isTop10 && <span className="top10-number">{index + 1}</span>}
                            <img
                                src={
                                    movie.poster_path
                                        ? `${IMG_BASE}/w300${movie.poster_path}`
                                        : 'https://via.placeholder.com/200x300?text=No+Image'
                                }
                                alt={movie.title}
                                loading="lazy"
                                className={isTop10 ? 'top10-poster' : undefined}
                            />
                            <div className="card-title-bar">{movie.title}</div>
                        </div>
                    ))}
                </div>
                {canScrollRight && (
                    <button className="scroll-arrow scroll-arrow-right" onClick={() => scroll(1)}>
                        ›
                    </button>
                )}
            </div>
        </section>
    );
}

// ===== YouTube background iframe (muted, looping, no controls) =====
function HeroVideoBackground({ trailerKey, visible }) {
    if (!trailerKey) return null;
    const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=0`;
    return (
        <div className={`hero-video-wrap ${visible ? 'visible' : ''}`}>
            <iframe
                src={src}
                title="hero-bg"
                allow="autoplay; encrypted-media"
                allowFullScreen={false}
                tabIndex={-1}
            />
        </div>
    );
}

export default function Home({ user }) {
    const navigate = useNavigate();
    const [trending, setTrending] = useState([]);
    const [categories, setCategories] = useState({});
    const [heroSlides, setHeroSlides] = useState([]);  // [{movie, cert, trailerKey}]
    const [slideIdx, setSlideIdx] = useState(0);
    const [prevSlideIdx, setPrevSlideIdx] = useState(null);
    const [transitioning, setTransitioning] = useState(false);

    const [selectedMovie, setSelectedMovie] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);
    const [modalTrailerKey, setModalTrailerKey] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dbUser, setDbUser] = useState(null);
    const [memberPopupOpen, setMemberPopupOpen] = useState(false);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberError, setMemberError] = useState('');

    // Language toggle
    const [lang, setLang] = useState('en-US');
    const [langLoading, setLangLoading] = useState(false);
    const [isToggling, setIsToggling] = useState(false); // For button animation

    const fetchDbUser = useCallback(async () => {
        if (!user?.uid) return null;
        try {
            setMemberLoading(true);
            setMemberError('');
            const res = await axios.get(`${API_BASE}/users/${user.uid}`);
            setDbUser(res.data);
            return res.data;
        } catch (err) {
            setMemberError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
            console.error('Error fetching user data:', err);
            return null;
        } finally {
            setMemberLoading(false);
        }
    }, [user]);

    // Fetch user from DB to get photoURL and profile data
    useEffect(() => {
        if (user?.uid) {
            fetchDbUser();
        } else {
            setDbUser(null);
            setMemberLoading(false);
        }
    }, [user, fetchDbUser]);

    const memberCoin = useMemo(() => {
        if (!dbUser) return 0;
        const value = dbUser.coin ?? dbUser.coins ?? dbUser.balance ?? 0;
        const asNumber = Number(value);
        return Number.isFinite(asNumber) ? asNumber : 0;
    }, [dbUser]);

    const openMemberPopup = useCallback(async () => {
        setProfileOpen(false);
        setMemberPopupOpen(true);
        if (user?.uid) {
            await fetchDbUser();
        }
    }, [user, fetchDbUser]);

    const closeMemberPopup = useCallback(() => {
        setMemberPopupOpen(false);
    }, []);

    const getAvatarUrl = () => {
        const url = dbUser?.photoURL || user?.photoURL;
        if (!url) return null;
        if (url.startsWith('/uploads')) {
            return `${API_BASE}${url}`;
        }
        return url;
    };

    // Restore saved state
    useEffect(() => {
        const { slideIdx: savedSlide, scrollY: savedScroll } = getHomeState();
        if (savedSlide !== undefined) setSlideIdx(savedSlide);
        if (savedScroll !== undefined) {
            // Let the render happen then scroll
            setTimeout(() => window.scrollTo(0, savedScroll), 10);
        }
    }, []);

    // Save state on unmount
    useEffect(() => {
        return () => {
            saveHomeState(slideIdx, window.scrollY);
        }
    }, [slideIdx]);

    // Toggle Language handler
    const toggleLanguage = () => {
        setIsToggling(true);
        setLang(prev => prev === 'en-US' ? 'th-TH' : 'en-US');
        setTimeout(() => setIsToggling(false), 450); // duration matches toggleJump animation
    };

    // Modal Cast Scroll
    const castRowRef = useRef(null);
    const [canScrollCastLeft, setCanScrollCastLeft] = useState(false);
    const [canScrollCastRight, setCanScrollCastRight] = useState(true);

    const checkCastScroll = useCallback(() => {
        const el = castRowRef.current;
        if (!el) return;
        setCanScrollCastLeft(el.scrollLeft > 5);
        setCanScrollCastRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    const scrollCast = (dir) => {
        if (!castRowRef.current) return;
        const scrollAmount = dir === 'left' ? -300 : 300;
        castRowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    // Initialize cast scroll state when movie details change
    useEffect(() => {
        if (selectedMovie && movieDetails?.credits?.cast?.length > 0) {
            // Need a tiny timeout to let the DOM render the cast cards first
            setTimeout(checkCastScroll, 100);
        }
    }, [selectedMovie, movieDetails, checkCastScroll]);

    // Scroll → navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch data (on mount and when language changes)
    const fetchAllData = useCallback(async (fetchLang) => {
        setLangLoading(true);
        try {
            const data = await fetchHomeData(fetchLang, GENRE_ROWS);
            setTrending(data.trending);
            setHeroSlides(data.heroSlides);
            setCategories(data.categories);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLangLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData(lang);
    }, [lang, fetchAllData]);

    // Auto-advance slideshow
    useEffect(() => {
        if (heroSlides.length < 2) return;
        const timer = setInterval(() => {
            goToSlide((prev) => (prev + 1) % heroSlides.length);
        }, SLIDE_INTERVAL);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    // Crossfade transition helper
    const goToSlide = useCallback((indexFn) => {
        setSlideIdx((prev) => {
            const next = typeof indexFn === 'function' ? indexFn(prev) : indexFn;
            if (next === prev) return prev;
            setPrevSlideIdx(prev);
            setTransitioning(true);
            setTimeout(() => {
                setPrevSlideIdx(null);
                setTransitioning(false);
            }, 900);
            return next;
        });
    }, []);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (selectedMovie || memberPopupOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto'; // cleanup on unmount
        };
    }, [selectedMovie, memberPopupOpen]);

    // Modal
    const openModal = useCallback(async (movieId) => {
        setSelectedMovie(movieId);

        const cached = getCachedDetails(movieId, lang);
        if (cached) {
            setMovieDetails(cached.details);
            setModalTrailerKey(cached.trailerKey);
            return;
        }

        setMovieDetails(null);
        setModalTrailerKey(null);
        try {
            const [detailRes, videoRes] = await Promise.all([
                axios.get(`${API_BASE}/movies/${movieId}?lang=${lang}`),
                axios.get(`${API_BASE}/movies/${movieId}/videos`),
            ]);

            const details = detailRes.data;
            const videos = videoRes.data.results || [];
            const trailer =
                videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
                videos.find((v) => v.site === 'YouTube');
            const trailerKey = trailer ? trailer.key : null;

            setCachedDetails(movieId, lang, details, trailerKey);

            setMovieDetails(details);
            setModalTrailerKey(trailerKey);
        } catch (err) {
            console.error('Movie detail error:', err);
        }
    }, [lang]);

    const closeModal = useCallback(() => {
        setSelectedMovie(null);
        setMovieDetails(null);
        setModalTrailerKey(null);
    }, []);

    const formatRuntime = (minutes) => {
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const currentSlide = heroSlides[slideIdx];
    const prevSlide = prevSlideIdx !== null ? heroSlides[prevSlideIdx] : null;

    return (
        <motion.div
            className="home"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {/* ===== Navbar ===== */}
            <nav className={`home-navbar ${scrolled ? 'scrolled' : ''}`}>
                <div className="navbar-brand">
                    <img src={logo} alt="NextSeat" className="navbar-logo" />
                    <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <ul className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                        <li><a href="#" className="active" onClick={() => setMobileMenuOpen(false)}>Home</a></li>
                        <li><a href="#" onClick={() => setMobileMenuOpen(false)}>Movies</a></li>
                        <li><a href="#" onClick={() => setMobileMenuOpen(false)}>Series</a></li>
                        <li><a href="#" onClick={() => setMobileMenuOpen(false)}>New & Popular</a></li>
                    </ul>
                </div>
                <div className="navbar-right">
                    <button
                        className={`lang-toggle${langLoading ? ' loading' : ''}${isToggling ? ' toggle-animate' : ''}`}
                        onClick={toggleLanguage}
                        disabled={langLoading}
                    >
                        {lang === 'en-US' ? '🇹🇭 TH' : '🇺🇸 EN'}
                    </button>

                    <div className="navbar-profile-wrap">
                        <button
                            className="navbar-profile-btn"
                            onClick={() => setProfileOpen(prev => !prev)}
                        >
                            {getAvatarUrl() ? (
                                <img src={getAvatarUrl()} alt="profile" className="navbar-avatar" />
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
                                    {user ? (
                                        <>
                                            <div className="profile-dropdown-header">
                                                {getAvatarUrl() ? (
                                                    <img src={getAvatarUrl()} alt="" className="dropdown-avatar" />
                                                ) : (
                                                    <div className="dropdown-avatar-guest">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                    </div>
                                                )}
                                                <div className="dropdown-user-info">
                                                    <span className="dropdown-user-name">{dbUser?.displayName || user.displayName || 'User'}</span>
                                                    <span className="dropdown-user-email">{user.email}</span>
                                                </div>
                                            </div>
                                            <div className="profile-dropdown-divider" />
                                            <button className="profile-dropdown-item" onClick={() => { navigate('/member-detail'); setProfileOpen(false); }}>
                                                Member Detail
                                            </button>
                                            <button className="profile-dropdown-item" onClick={() => { navigate('/my-ticket'); setProfileOpen(false); }}>
                                                My Ticket
                                            </button>
                                            <div className="profile-dropdown-divider" />
                                            <button className="profile-dropdown-item signout" onClick={() => { auth.signOut(); setProfileOpen(false); }}>
                                                Sign Out
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="profile-dropdown-header">
                                                <div className="dropdown-avatar-guest">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <div className="dropdown-user-info">
                                                    <span className="dropdown-user-name">Guest</span>
                                                    <span className="dropdown-user-email">Not signed in</span>
                                                </div>
                                            </div>
                                            <div className="profile-dropdown-divider" />
                                            <button className="profile-dropdown-item" onClick={() => { navigate('/login'); setProfileOpen(false); }}>
                                                Login
                                            </button>
                                            <button className="profile-dropdown-item" onClick={() => { navigate('/signup'); setProfileOpen(false); }}>
                                                Sign Up
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ===== Hero Slideshow ===== */}
            {currentSlide && (
                <section className="hero-banner">

                    {/* All slides rendered (cached) — active one is visible */}
                    {heroSlides.map((slide, i) => {
                        const isActive = i === slideIdx;
                        const isExiting = i === prevSlideIdx;
                        let cls = 'hero-slide';
                        if (isExiting) cls += ' hero-slide-exit';
                        else if (isActive && transitioning) cls += ' hero-slide-enter entering';
                        else if (isActive) cls += ' hero-slide-enter active';

                        return (
                            <div key={slide.movie.id} className={cls}>
                                <img
                                    className="hero-backdrop"
                                    src={`${IMG_BASE}/original${slide.movie.backdrop_path}`}
                                    alt={slide.movie.title}
                                />
                                <HeroVideoBackground trailerKey={slide.trailerKey} visible={isActive || isExiting} />
                            </div>
                        );
                    })}

                    <div className="hero-gradient" />

                    {/* Hero content */}
                    <div className="hero-content" key={`${slideIdx}_${lang}`}>
                        <div className="hero-top10">
                            <span className="top10-badge">TOP 10</span>
                            <span>Top Movies Today</span>
                        </div>
                        <h1 className="hero-title">{currentSlide.movie.title}</h1>
                        <p className="hero-overview">{currentSlide.movie.overview}</p>
                        <div className="hero-buttons">
                            <button className="btn-play" onClick={() => openModal(currentSlide.movie.id)}>
                                BOOK NOW
                            </button>
                            <button className="btn-info" onClick={() => openModal(currentSlide.movie.id)}>
                                <img src={infoIcon} alt="info" className="info-icon-img" /> More Info
                            </button>
                        </div>
                    </div>

                    {/* Age badge */}
                    <div className="hero-age-badge">{currentSlide.cert}</div>

                    {/* Slide dots */}
                    <div className="hero-dots">
                        {heroSlides.map((_, i) => (
                            <button
                                key={i}
                                className={`hero-dot${i === slideIdx ? ' active' : ''}`}
                                onClick={() => goToSlide(i)}
                                aria-label={`Slide ${i + 1}`}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Top 10 Trending ===== */}
            <AnimatedContent key={`top10_${lang}`} distance={30} duration={2} ease="power1.out" threshold={0.05}>
                <CategoryRow
                    genre={{ id: 'top10', name: 'Top 10 Today' }}
                    movies={trending.slice(0, 10)}
                    openModal={openModal}
                    isTop10
                />
            </AnimatedContent>

            {/* ===== Genre Category Rows ===== */}
            {GENRE_ROWS.map((genre, idx) => {
                const movies = categories[genre.id] || [];
                if (movies.length === 0) return null;
                return (
                    <AnimatedContent key={`${genre.id}_${lang}`} distance={30} duration={2} ease="power1.out" delay={idx * 0.1} threshold={0.05}>
                        <CategoryRow
                            genre={genre}
                            movies={movies}
                            openModal={openModal}
                        />
                    </AnimatedContent>
                );
            })}

            {/* ===== Footer ===== */}
            <AnimatedContent distance={20} duration={1.8} ease="power1.out" threshold={0.1}>
                <footer className="home-footer">
                    © 2026 NextSeat — Powered by TMDB
                </footer>
            </AnimatedContent>

            {/* ===== Movie Detail Modal ===== */}
            {selectedMovie && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>✕</button>

                        <div className="modal-trailer">
                            {modalTrailerKey ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${modalTrailerKey}?autoplay=1&mute=1&rel=0`}
                                    title="Trailer"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            ) : movieDetails?.backdrop_path ? (
                                <div className="modal-trailer-placeholder">
                                    <img
                                        src={`${IMG_BASE}/w1280${movieDetails.backdrop_path}`}
                                        alt={movieDetails.title}
                                    />
                                </div>
                            ) : null}
                        </div>

                        {movieDetails ? (
                            <AnimatedContent distance={30} duration={0.6} ease="power2.out">
                                <div className="modal-body">
                                    <h2 className="modal-title">{movieDetails.title}</h2>
                                    <div className="modal-meta">
                                        <span className="modal-rating">
                                            {Math.round(movieDetails.vote_average * 10)}% Score
                                        </span>
                                        <span className="modal-year">
                                            {movieDetails.release_date?.split('-')[0]}
                                        </span>
                                        <span className="modal-runtime">
                                            {formatRuntime(movieDetails.runtime)}
                                        </span>
                                        <span className="modal-age">
                                            {getCertification(movieDetails.release_dates)}
                                        </span>
                                    </div>
                                    <div className="modal-actions">
                                        <button className="btn-play modal-book-btn">
                                            BOOK NOW
                                        </button>
                                    </div>

                                    <p className="modal-overview">
                                        {movieDetails.overview}
                                    </p>

                                    <div className="modal-genres">
                                        {movieDetails.genres?.map((g) => (
                                            <span key={g.id} className="modal-genre-tag">{g.name}</span>
                                        ))}
                                    </div>

                                    {movieDetails.credits?.cast?.length > 0 && (
                                        <div className="modal-cast">
                                            <h4>Cast</h4>

                                            <div className="modal-cast-container">
                                                {canScrollCastLeft && (
                                                    <button
                                                        className="cast-scroll-btn left"
                                                        onClick={() => scrollCast('left')}
                                                        aria-label="Scroll cast left"
                                                    >
                                                        ‹
                                                    </button>
                                                )}

                                                <div
                                                    className="modal-cast-grid"
                                                    ref={castRowRef}
                                                    onScroll={checkCastScroll}
                                                >
                                                    {movieDetails.credits.cast
                                                        .slice(0, 10)
                                                        .map((c) => (
                                                            <div key={c.id} className="cast-card">
                                                                <div className="cast-photo-wrap">
                                                                    {c.profile_path ? (
                                                                        <img
                                                                            src={`${IMG_BASE}/w185${c.profile_path}`}
                                                                            alt={c.name}
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <div className="cast-no-photo">
                                                                            <span>👤</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="cast-name">{c.name}</span>
                                                                {c.character && (
                                                                    <span className="cast-character">{c.character}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>

                                                {canScrollCastRight && movieDetails.credits.cast.length > 5 && (
                                                    <button
                                                        className="cast-scroll-btn right"
                                                        onClick={() => scrollCast('right')}
                                                        aria-label="Scroll cast right"
                                                    >
                                                        ›
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AnimatedContent>
                        ) : (
                            <div className="loading-spinner" style={{ minHeight: 120 }}>
                                <div className="spinner" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {memberPopupOpen && (
                <div className="modal-backdrop" onClick={closeMemberPopup}>
                    <div className="member-popup" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeMemberPopup}>✕</button>

                        <h3 className="member-popup-title">Member Detail</h3>

                        <div className="member-popup-header">
                            {getAvatarUrl() ? (
                                <img src={getAvatarUrl()} alt="profile" className="member-popup-avatar" />
                            ) : (
                                <div className="member-popup-avatar member-popup-avatar-fallback">U</div>
                            )}
                            <div>
                                <p className="member-popup-name">{dbUser?.displayName || user?.displayName || 'User'}</p>
                                <p className="member-popup-email">{dbUser?.email || user?.email || '-'}</p>
                            </div>
                        </div>

                        {memberLoading && <p className="member-popup-status">กำลังโหลดข้อมูล...</p>}
                        {memberError && <p className="member-popup-status error">{memberError}</p>}

                        {!memberLoading && !memberError && (
                            <>
                                <div className="member-popup-coin">
                                    <span>Coin</span>
                                    <strong>{memberCoin.toLocaleString()}</strong>
                                </div>

                                <div className="member-popup-grid">
                                    <div className="member-popup-row">
                                        <span>Firebase UID</span>
                                        <strong>{dbUser?.firebaseUid || user?.uid || '-'}</strong>
                                    </div>
                                    <div className="member-popup-row">
                                        <span>Phone</span>
                                        <strong>{dbUser?.phone || '-'}</strong>
                                    </div>
                                    <div className="member-popup-row">
                                        <span>Birthday</span>
                                        <strong>
                                            {dbUser?.birthday
                                                ? new Date(dbUser.birthday).toLocaleDateString('th-TH')
                                                : '-'}
                                        </strong>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
