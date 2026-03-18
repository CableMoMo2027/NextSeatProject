import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnimatedContent from '../../components/animation/Animated_Content';
import MainNavbar from '../../components/navigation/MainNavbar';
import {
    fetchHomeData,
    getHomeState,
    saveHomeState,
    getCachedDetails,
    setCachedDetails,
} from '../../services/homeCache';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import esrbEveryone from '../../assets/RateMovie/ESRB_Everyone.svg.svg';
import esrbEveryone10 from '../../assets/RateMovie/ESRB_Everyone_10.svg';
import esrbTeen from '../../assets/RateMovie/ESRB_Teen.svg';
import esrbMature17 from '../../assets/RateMovie/ESRB_Mature_17.svg.svg';
import esrbAdultsOnly18 from '../../assets/RateMovie/ESRB_Adults_Only_18.svg';
import esrbEarlyChildhood from '../../assets/RateMovie/ESRB_Early_Childhood.svg';
import esrbRatingPending from '../../assets/RateMovie/ESRB_Rating_Pending.svg';
import { MAIN_API_BASE } from '../../config/runtime';
import './Home.css';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p';
const IMAGE_SLIDE_INTERVAL = 10000;
const DEFAULT_TRAILER_SLIDE_INTERVAL = 18000;
const TRAILER_PLAYBACK_RATIO = 0.8;
const MIN_TRAILER_SLIDE_INTERVAL = 12000;
const MAX_TRAILER_SLIDE_INTERVAL = 45000;
// Genre IDs to show as category rows

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getHeroRatingIcon(cert) {
    const raw = String(cert || '').trim().toUpperCase();
    if (!raw || raw === 'N/A' || raw === 'NR' || raw === 'NOT RATED') return esrbRatingPending;

    const byCert = {
        EC: esrbEarlyChildhood,
        E: esrbEveryone,
        'E10+': esrbEveryone10,
        T: esrbTeen,
        'PG-13': esrbTeen,
        M: esrbMature17,
        R: esrbMature17,
        'M17+': esrbMature17,
        AO: esrbAdultsOnly18,
        'AO18+': esrbAdultsOnly18,
        'NC-17': esrbAdultsOnly18,
        '13+': esrbTeen,
        '15+': esrbMature17,
        '18+': esrbAdultsOnly18,
        RP: esrbRatingPending,
    };

    return byCert[raw] || esrbRatingPending;
}

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
    { id: 28, nameEn: 'Action', nameTh: 'แอ็กชัน' },
    { id: 35, nameEn: 'Comedy', nameTh: 'คอมเมดี้' },
    { id: 27, nameEn: 'Horror', nameTh: 'สยองขวัญ' },
    { id: 16, nameEn: 'Anime / Animation', nameTh: 'อนิเมะ / แอนิเมชัน' },
    { id: 878, nameEn: 'Sci-Fi', nameTh: 'ไซไฟ' },
    { id: 18, nameEn: 'Drama', nameTh: 'ดราม่า' },
    { id: 10749, nameEn: 'Romance', nameTh: 'โรแมนติก' },
    { id: 14, nameEn: 'Fantasy', nameTh: 'แฟนตาซี' },
];



// ===== Reusable CategoryRow with smart scroll arrows =====
function CategoryRow({ genre, movies, openModal, isTop10, showRelease, formatReleaseDate }) {
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
            <h2 className="category-title">{genre.displayName || genre.name}</h2>
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
                            {showRelease && !isTop10 && (
                                <div className="card-release-badge">
                                    {formatReleaseDate ? formatReleaseDate(movie.release_date) : (movie.release_date || '-')}
                                </div>
                            )}
                            {isTop10 && <span className="top10-number">{index + 1}</span>}
                            <img
                                src={
                                    movie.poster_path
                                        ? `${IMG_BASE}/w300${movie.poster_path}`
                                        : 'https://via.placeholder.com/200x300?text=No+Image'
                                }
                                alt={movie.title}
                                loading={isTop10 && index < 3 ? 'eager' : 'lazy'}
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
function HeroVideoBackground({ trailerKey, visible, onDurationChange }) {
    if (!trailerKey) return null;
    const frameRef = useRef(null);
    const containerRef = useRef(null);
    const [isInView, setIsInView] = useState(false);
    const [isFrameReady, setIsFrameReady] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.25);
            },
            { threshold: [0, 0.25, 0.5, 0.75, 1] },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const postYouTubeCommand = useCallback((func, args = []) => {
        const target = frameRef.current?.contentWindow;
        if (!target) return;
        target.postMessage(
            JSON.stringify({
                event: 'command',
                func,
                args,
            }),
            '*',
        );
    }, []);

    const notifyYouTubeListening = useCallback(() => {
        const target = frameRef.current?.contentWindow;
        if (!target) return;
        target.postMessage(
            JSON.stringify({
                event: 'listening',
                id: trailerKey,
                channel: 'widget',
            }),
            '*',
        );
    }, [trailerKey]);

    useEffect(() => {
        const currentWindow = frameRef.current?.contentWindow;
        if (!currentWindow) return undefined;

        const handleMessage = (event) => {
            if (event.source !== currentWindow) return;

            let payload = event.data;
            if (typeof payload === 'string') {
                if (!payload.startsWith('{')) return;
                try {
                    payload = JSON.parse(payload);
                } catch {
                    return;
                }
            }

            const durationSeconds = Number(payload?.info?.duration);
            if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
            onDurationChange?.(trailerKey, durationSeconds);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isFrameReady, onDurationChange, trailerKey]);

    useEffect(() => {
        if (!isFrameReady) return;
        notifyYouTubeListening();
        postYouTubeCommand('addEventListener', ['onReady']);
        postYouTubeCommand('addEventListener', ['onStateChange']);
        if (visible && isInView) {
            postYouTubeCommand('mute');
            postYouTubeCommand('playVideo');
            return;
        }
        postYouTubeCommand('pauseVideo');
    }, [visible, isInView, isFrameReady, notifyYouTubeListening, postYouTubeCommand]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${origin}`;

    return (
        <div ref={containerRef} className={`hero-video-wrap ${visible ? 'visible' : ''}`}>
            <iframe
                ref={frameRef}
                src={src}
                title="hero-bg"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen={false}
                tabIndex={-1}
                referrerPolicy="strict-origin-when-cross-origin"
                loading="eager"
                onLoad={() => setIsFrameReady(true)}
            />
        </div>
    );
}

export default function Home({ user }) {
    const navigate = useNavigate();
    const [trending, setTrending] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [categories, setCategories] = useState({});
    const [heroSlides, setHeroSlides] = useState([]);  // [{movie, cert, trailerKey}]
    const [slideIdx, setSlideIdx] = useState(() => {
        const { slideIdx: savedSlide } = getHomeState();
        return savedSlide !== undefined ? savedSlide : 0;
    });
    const [prevSlideIdx, setPrevSlideIdx] = useState(null);
    const [transitioning, setTransitioning] = useState(false);

    const [selectedMovie, setSelectedMovie] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);
    const [modalTrailerKey, setModalTrailerKey] = useState(null);
    const { lang, isThai } = useAppLanguage();
    const [isBookingTransitioning, setIsBookingTransitioning] = useState(false);
    const [heroTrailerDurations, setHeroTrailerDurations] = useState({});
    const bookingNavTimerRef = useRef(null);

    const handleHeroTrailerDuration = useCallback((trailerKey, durationSeconds) => {
        if (!trailerKey || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

        const durationMs = Math.round(durationSeconds * 1000);
        setHeroTrailerDurations((prev) => {
            if (prev[trailerKey] === durationMs) return prev;
            return {
                ...prev,
                [trailerKey]: durationMs,
            };
        });
    }, []);

    // Restore saved state
    useEffect(() => {
        const { scrollY: savedScroll } = getHomeState();
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

    // Fetch data (on mount and when language changes)
    useEffect(() => {
        let active = true;
        const loadData = async () => {
            try {
                const data = await fetchHomeData(lang, GENRE_ROWS);
                if (!active) return;
                setTrending(data.trending);
                setUpcoming(data.upcoming || []);
                setHeroSlides(data.heroSlides);
                setCategories(data.categories);
            } catch (err) {
                if (!active) return;
                console.error('Fetch error:', err);
            }
        };
        loadData();
        return () => {
            active = false;
        };
    }, [lang]);

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

    // Auto-advance slideshow. Trailer slides stay up longer so the preview is watchable.
    useEffect(() => {
        if (heroSlides.length < 2) return undefined;

        const activeSlide = heroSlides[slideIdx];
        const trailerDurationMs = activeSlide?.trailerKey
            ? heroTrailerDurations[activeSlide.trailerKey]
            : null;
        const slideDuration = trailerDurationMs
            ? clamp(
                Math.round(trailerDurationMs * TRAILER_PLAYBACK_RATIO),
                MIN_TRAILER_SLIDE_INTERVAL,
                MAX_TRAILER_SLIDE_INTERVAL,
            )
            : activeSlide?.trailerKey
                ? DEFAULT_TRAILER_SLIDE_INTERVAL
                : IMAGE_SLIDE_INTERVAL;

        const timer = setTimeout(() => {
            goToSlide((prev) => (prev + 1) % heroSlides.length);
        }, slideDuration);

        return () => clearTimeout(timer);
    }, [heroSlides, slideIdx, goToSlide, heroTrailerDurations]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (selectedMovie) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto'; // cleanup on unmount
        };
    }, [selectedMovie]);

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

    const goToBooking = useCallback((movie) => {
        if (isBookingTransitioning) return;
        setIsBookingTransitioning(true);
        bookingNavTimerRef.current = setTimeout(() => {
            navigate('/screening-selection', {
                state: {
                    movieId: movie?.id,
                    movieTitle: movie?.title || '',
                    posterPath: movie?.poster_path || movie?.posterPath || '',
                    lang,
                },
            });
        }, 220);
    }, [isBookingTransitioning, lang, navigate]);

    useEffect(() => {
        return () => {
            if (bookingNavTimerRef.current) clearTimeout(bookingNavTimerRef.current);
        };
    }, []);

    const formatRuntime = (minutes) => {
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };
    const formatReleaseDate = useCallback((releaseDate) => {
        if (!releaseDate) return '-';
        const date = new Date(releaseDate);
        if (Number.isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat(lang === 'th-TH' ? 'th-TH' : 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    }, [lang]);
    const currentSlide = heroSlides[slideIdx];
    const upcomingIds = useMemo(
        () => new Set(upcoming.map((movie) => movie?.id).filter(Boolean)),
        [upcoming],
    );
    const top10Movies = useMemo(
        () => trending.filter((movie) => !upcomingIds.has(movie?.id)).slice(0, 10),
        [trending, upcomingIds],
    );
    const categoriesWithoutUpcoming = useMemo(() => {
        const map = {};
        Object.entries(categories).forEach(([genreId, movies]) => {
            map[genreId] = (movies || []).filter((movie) => !upcomingIds.has(movie?.id));
        });
        return map;
    }, [categories, upcomingIds]);
    const uniqueUpcoming = useMemo(() => {
        const seen = new Set();
        return upcoming.filter((movie) => {
            const id = movie?.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [upcoming]);
    const upcomingForRow = useMemo(() => uniqueUpcoming.slice(0, 10), [uniqueUpcoming]);
    const isSelectedMovieUpcoming = useMemo(() => {
        if (!selectedMovie) return false;
        return upcomingIds.has(selectedMovie);
    }, [selectedMovie, upcomingIds]);

    const allMoviesForSearch = useMemo(() => {
        const byId = new Map();
        [...trending, ...upcoming, ...Object.values(categories).flat()].forEach((movie) => {
            if (!movie?.id || byId.has(movie.id)) return;
            byId.set(movie.id, movie);
        });
        return [...byId.values()];
    }, [trending, upcoming, categories]);

    return (
        <div className="home" style={isBookingTransitioning ? { opacity: 0.72, transform: 'scale(0.985)' } : undefined}>
            {/* ===== Navbar ===== */}
            <MainNavbar
                user={user}
                active="home"
                memberDetailAsPopup
                searchCandidates={allMoviesForSearch}
            />

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
                                <HeroVideoBackground
                                    trailerKey={slide.trailerKey}
                                    visible={isActive || isExiting}
                                    onDurationChange={handleHeroTrailerDuration}
                                />
                            </div>
                        );
                    })}

                    <div className="hero-gradient" />

                    {/* Hero content */}
                    <div className="hero-content" key={`${slideIdx}_${lang}`}>
                        <div className="hero-top10">
                            <span className="top10-badge">TOP 10</span>
                            <span>{isThai ? 'หนังยอดนิยมวันนี้' : 'Top Movies Today'}</span>
                        </div>
                        <h1 className="hero-title">{currentSlide.movie.title}</h1>
                        <p className="hero-overview">
                            {String(currentSlide.movie.overview || '').trim() || (isThai ? 'ยังไม่มีเรื่องย่อ' : 'No synopsis available yet.')}
                        </p>
                        <div className="hero-buttons">
                            <button className="btn-play" onClick={() => goToBooking(currentSlide.movie)}>
                                {isThai ? 'จองเลย' : 'BOOK NOW'}
                            </button>
                            <button className="btn-info" onClick={() => openModal(currentSlide.movie.id)}>
                                <svg viewBox="0 0 24 24" className="info-icon-img" aria-hidden="true">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <circle cx="12" cy="8" r="1.4" fill="currentColor" />
                                    <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {isThai ? 'รายละเอียดเพิ่มเติม' : 'More Info'}
                            </button>
                        </div>
                    </div>

                    {/* Age badge */}
                    <div className="hero-age-badge">
                        <img
                            src={getHeroRatingIcon(currentSlide.cert)}
                            alt={`Rating ${currentSlide.cert || 'N/A'}`}
                            className="hero-age-badge-icon"
                        />
                    </div>

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
            <div className="hero-top10-fade-bridge">
                <AnimatedContent key={`top10_${lang}`} distance={30} duration={2} ease="power1.out" threshold={0.05}>
                    <CategoryRow
                        genre={{ id: 'top10', displayName: isThai ? '10 อันดับวันนี้' : 'Top 10 Today' }}
                        movies={top10Movies}
                        openModal={openModal}
                        isTop10
                    />
                </AnimatedContent>
            </div>

            {/* ===== Upcoming ===== */}
            {upcomingForRow.length > 0 && (
                <AnimatedContent key={`upcoming_${lang}`} distance={30} duration={2} ease="power1.out" threshold={0.05}>
                    <CategoryRow
                        genre={{ id: 'upcoming', displayName: isThai ? 'ภาพยนตร์เร็วๆ นี้' : 'Upcoming Movies' }}
                        movies={upcomingForRow}
                        openModal={openModal}
                        showRelease
                        formatReleaseDate={formatReleaseDate}
                    />
                </AnimatedContent>
            )}

            {/* ===== Genre Category Rows ===== */}
            {GENRE_ROWS.map((genre, idx) => {
                const movies = categoriesWithoutUpcoming[genre.id] || [];
                if (movies.length === 0) return null;
                return (
                    <AnimatedContent key={`${genre.id}_${lang}`} distance={30} duration={2} ease="power1.out" delay={idx * 0.1} threshold={0.05}>
                        <CategoryRow
                            genre={{ ...genre, displayName: isThai ? genre.nameTh : genre.nameEn }}
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
                                    src={`https://www.youtube.com/embed/${modalTrailerKey}?autoplay=1&mute=1&rel=0&playsinline=1`}
                                    title="Trailer"
                                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                    allowFullScreen
                                    referrerPolicy="strict-origin-when-cross-origin"
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
                                            {Math.round(movieDetails.vote_average * 10)}% {isThai ? 'คะแนน' : 'Score'}
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
                                        <button
                                            className={`btn-play modal-book-btn${isSelectedMovieUpcoming ? ' disabled' : ''}`}
                                            onClick={isSelectedMovieUpcoming ? undefined : () => goToBooking(movieDetails)}
                                            disabled={isSelectedMovieUpcoming}
                                        >
                                            {isSelectedMovieUpcoming ? (
                                                <>
                                                    <svg viewBox="0 0 24 24" className="modal-book-lock" aria-hidden="true">
                                                        <path fill="currentColor" d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 1 0-6 0v2z" />
                                                    </svg>
                                                    {isThai ? 'เร็วๆ นี้' : 'SOON'}
                                                </>
                                            ) : (isThai ? 'จองเลย' : 'BOOK NOW')}
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
                                            <h4>{isThai ? 'นักแสดง' : 'Cast'}</h4>

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

        </div>
    );
}
