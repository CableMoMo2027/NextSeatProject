import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import AnimatedContent from '../../components/animation/Animated_Content';
import { getSavedLanguage } from '../../services/homeCache';
import { MAIN_API_BASE } from '../../config/runtime';
import './SearchResultsPage.css';
import './Home.css';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p';

export default function UpcomingPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [modalTrailerKey, setModalTrailerKey] = useState(null);
  const castRowRef = useRef(null);
  const [canScrollCastLeft, setCanScrollCastLeft] = useState(false);
  const [canScrollCastRight, setCanScrollCastRight] = useState(true);
  const [lang, setLang] = useState(() => getSavedLanguage());
  const isThai = lang === 'th-TH';
  const dateLocale = lang === 'th-TH' ? 'th-TH' : 'en-US';

  const formatReleaseDate = (releaseDate) => {
    if (!releaseDate) return '-';
    const date = new Date(releaseDate);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };
  const formatRuntime = useCallback((minutes) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }, []);
  const getCertification = useCallback((releaseDates) => {
    if (!releaseDates?.results) return 'N/A';
    const th = releaseDates.results.find((r) => r.iso_3166_1 === 'TH');
    const us = releaseDates.results.find((r) => r.iso_3166_1 === 'US');
    const entry = th || us;
    const cert = entry?.release_dates?.find((rd) => rd.certification)?.certification;
    return cert || 'N/A';
  }, []);
  const openModal = useCallback(async (movieId) => {
    setSelectedMovieId(movieId);
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
      setMovieDetails(details);
      setModalTrailerKey(trailer?.key || null);
    } catch (err) {
      console.error('Movie detail error:', err);
    }
  }, [lang]);
  const closeModal = useCallback(() => {
    setSelectedMovieId(null);
    setMovieDetails(null);
    setModalTrailerKey(null);
  }, []);
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

  useEffect(() => {
    const onLangChanged = (event) => {
      const nextLang = event?.detail?.lang || getSavedLanguage();
      setLang(nextLang);
    };
    window.addEventListener('nextseat:lang-changed', onLangChanged);
    return () => window.removeEventListener('nextseat:lang-changed', onLangChanged);
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setLoading(true);
        setErrorText('');
        const res = await axios.get(`${API_BASE}/movies/upcoming`, { params: { lang } });
        if (!mounted) return;
        setMovies(Array.isArray(res.data?.results) ? res.data.results : []);
      } catch (err) {
        if (!mounted) return;
        console.error('Upcoming fetch error:', err);
        setMovies([]);
        setErrorText(
          isThai
            ? `ไม่สามารถเชื่อมต่อ backend (${MAIN_API_BASE})`
            : `Cannot connect to backend (${MAIN_API_BASE}).`,
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [lang, isThai]);
  useEffect(() => {
    if (selectedMovieId) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedMovieId]);
  useEffect(() => {
    if (selectedMovieId && movieDetails?.credits?.cast?.length > 0) {
      setTimeout(checkCastScroll, 100);
    }
  }, [selectedMovieId, movieDetails, checkCastScroll]);

  return (
    <motion.div
      className="search-results-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <main className="search-results-main">
        <AnimatedContent key={`up_head_${lang}`} distance={40} duration={0.55} ease="power3.out">
          <div className="search-results-head">
            <button className="search-back-btn" onClick={() => navigate('/home')}>
            ← {isThai ? 'กลับ' : 'Back'}
            </button>
          <h1>{isThai ? 'หนังที่กำลังจะเข้า' : 'Upcoming Movies'}</h1>
          <p>{isThai ? 'ภาพยนตร์ที่กำลังจะเข้าฉายในโรง' : 'Movies that are coming soon in theaters'}</p>
          </div>
        </AnimatedContent>

        {loading && <p className="search-status">{isThai ? 'กำลังโหลด...' : 'Loading...'}</p>}
        {!loading && errorText && <p className="search-status">{errorText}</p>}
        {!loading && !errorText && movies.length === 0 && <p className="search-status">{isThai ? 'ไม่พบหนังที่กำลังจะเข้า' : 'No upcoming movies found.'}</p>}

        {!loading && movies.length > 0 && (
          <div className="search-grid">
            {movies.map((movie, index) => (
              <AnimatedContent
                key={`${movie.id}_${lang}`}
                distance={36}
                duration={0.45}
                ease="power3.out"
                delay={Math.min(index * 0.03, 0.3)}
              >
                <article
                  className="search-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openModal(movie.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openModal(movie.id);
                    }
                  }}
                >
                  <div className="search-poster-wrap">
                    <img
                      src={movie.poster_path ? `${IMG_BASE}/w300${movie.poster_path}` : 'https://via.placeholder.com/240x360?text=No+Image'}
                      alt={movie.title}
                    />
                    <div className="search-hover-overlay">
                      <h3 className="search-title-bar" title={movie.title}>{movie.title}</h3>
                      <div className="search-hover-actions">
                        <button type="button" className="search-action-btn soon" disabled>
                          {isThai ? 'เร็วๆ นี้' : 'SOON'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="search-card-body">
                    <p className="search-card-release">
                    {isThai ? 'เข้าฉาย' : 'Release'}: <strong>{formatReleaseDate(movie.release_date)}</strong>
                    </p>
                  </div>
                </article>
              </AnimatedContent>
            ))}
          </div>
        )}
        {selectedMovieId && (
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
                    <button className="btn-play modal-book-btn disabled" disabled>
                      <svg viewBox="0 0 24 24" className="modal-book-lock" aria-hidden="true">
                        <path fill="currentColor" d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 1 0-6 0v2z" />
                      </svg>
                      {isThai ? 'เร็วๆ นี้' : 'SOON'}
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
              ) : (
                <div className="loading-spinner" style={{ minHeight: 120 }}>
                  <div className="spinner" />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}
