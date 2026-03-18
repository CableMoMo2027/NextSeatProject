import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnimatedContent from '../../components/animation/Animated_Content';
import { MAIN_API_BASE } from '../../config/runtime';
import { fetchHomeData, getSavedLanguage } from '../../services/homeCache';
import './SearchResultsPage.css';
import './Home.css';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p';

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

export default function SearchResultsPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [upcomingMovieIds, setUpcomingMovieIds] = useState(new Set());
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [modalTrailerKey, setModalTrailerKey] = useState(null);
  const castRowRef = useRef(null);
  const [canScrollCastLeft, setCanScrollCastLeft] = useState(false);
  const [canScrollCastRight, setCanScrollCastRight] = useState(true);
  const isMoviesPage = location.pathname === '/movies';

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [lang, setLang] = useState(() => {
    const langFromState = location.state?.lang;
    const langFromQuery = searchParams.get('lang');
    return langFromState || langFromQuery || getSavedLanguage();
  });
  const isThai = lang === 'th-TH';

  const query = useMemo(
    () => (location.state?.query ?? searchParams.get('q') ?? '').toString().trim(),
    [location.state?.query, searchParams],
  );
  const genreId = useMemo(
    () => (location.state?.genreId ?? searchParams.get('genre') ?? 'all').toString(),
    [location.state?.genreId, searchParams],
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setLoading(true);
        setErrorText('');
        const data = await fetchHomeData(lang, GENRE_ROWS);
        const upcomingIds = new Set((data.upcoming || []).map((movie) => movie?.id).filter(Boolean));
        const byId = new Map();
        [...(data.trending || []), ...Object.values(data.categories || {}).flat()].forEach((movie) => {
          if (!movie?.id || byId.has(movie.id)) return;
          if (isMoviesPage && upcomingIds.has(movie.id)) return;
          byId.set(movie.id, movie);
        });
        if (!mounted) return;
        setMovies([...byId.values()]);
        setUpcomingMovieIds(upcomingIds);
      } catch (err) {
        if (!mounted) return;
        console.error('Search results fetch error:', err);
        setMovies([]);
        setUpcomingMovieIds(new Set());
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
  }, [isMoviesPage, lang, isThai]);

  const filteredMovies = useMemo(() => {
    let pool = movies;
    if (genreId !== 'all') {
      const genreNum = Number(genreId);
      pool = pool.filter((movie) => Array.isArray(movie?.genre_ids) && movie.genre_ids.includes(genreNum));
    }
    if (query) {
      const q = query.toLowerCase();
      pool = pool.filter((movie) => String(movie?.title || '').toLowerCase().includes(q));
    }
    return [...pool].sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  }, [genreId, movies, query]);

  const genreLabel = useMemo(() => {
    const genre = GENRE_ROWS.find((g) => String(g.id) === genreId);
    if (!genre) return isThai ? 'ทุกประเภท' : 'All Types';
    return isThai ? genre.nameTh : genre.nameEn;
  }, [genreId, isThai]);
  const isSelectedUpcoming = selectedMovieId !== null && upcomingMovieIds.has(selectedMovieId);

  useEffect(() => {
    const langFromState = location.state?.lang;
    const langFromQuery = searchParams.get('lang');
    setLang(langFromState || langFromQuery || getSavedLanguage());
  }, [location.state?.lang, searchParams]);

  useEffect(() => {
    const onLangChanged = (event) => {
      const nextLang = event?.detail?.lang || getSavedLanguage();
      setLang(nextLang);
    };
    window.addEventListener('nextseat:lang-changed', onLangChanged);
    return () => window.removeEventListener('nextseat:lang-changed', onLangChanged);
  }, []);
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
  const goToBooking = useCallback((movie) => {
    navigate('/screening-selection', {
      state: {
        movieId: movie?.id,
        movieTitle: movie?.title || '',
        posterPath: movie?.poster_path || movie?.posterPath || '',
        lang,
      },
    });
  }, [lang, navigate]);
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
    <div className="search-results-page">
      <main className="search-results-main">
        <AnimatedContent key={`sr_head_${lang}`} distance={40} duration={0.55} ease="power3.out">
          <div className="search-results-head">
            <button className="search-back-btn" onClick={() => navigate('/home')}>
              ← {isThai ? 'กลับ' : 'Back'}
            </button>
            <h1>{isMoviesPage ? (isThai ? 'ภาพยนตร์ทั้งหมด' : 'All Movies') : (isThai ? 'ผลการค้นหา' : 'Search Results')}</h1>
            {isMoviesPage ? (
              <p>{isThai ? 'แสดงภาพยนตร์ที่พร้อมจองทั้งหมด' : 'Showing all available movies'}</p>
            ) : (
              <p>
                {isThai ? 'คำค้นหา' : 'Query'}: <strong>{query || '-'}</strong> | {isThai ? 'ประเภท' : 'Type'}: <strong>{genreLabel}</strong>
              </p>
            )}
          </div>
        </AnimatedContent>

        {loading && <p className="search-status">{isThai ? 'กำลังโหลด...' : 'Loading...'}</p>}
        {!loading && errorText && <p className="search-status">{errorText}</p>}
        {!loading && !errorText && filteredMovies.length === 0 && (
          <p className="search-status">{isThai ? 'ไม่พบภาพยนตร์ตามเงื่อนไขนี้' : 'No movies found for this filter.'}</p>
        )}

        {!loading && filteredMovies.length > 0 && (
          <div className="search-grid">
            {filteredMovies.map((movie, index) => {
                const isUpcomingMovie = upcomingMovieIds.has(movie.id);
                return (
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
                        <button
                          className={`search-action-btn${isUpcomingMovie ? ' soon' : ''}`}
                          disabled={isUpcomingMovie}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUpcomingMovie) return;
                            navigate('/screening-selection', {
                              state: {
                                movieId: movie.id,
                                movieTitle: movie.title || '',
                                posterPath: movie.poster_path || '',
                                lang,
                              },
                            });
                          }}
                        >
                          {isUpcomingMovie ? (
                            <>
                              <svg viewBox="0 0 24 24" className="search-action-lock" aria-hidden="true">
                                <path fill="currentColor" d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 1 0-6 0v2z" />
                              </svg>
                              SOON
                            </>
                          ) : (
                            (isThai ? 'จองเลย' : 'Book Now')
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </AnimatedContent>
                );
              })}
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
                    <button
                      className={`btn-play modal-book-btn${isSelectedUpcoming ? ' disabled' : ''}`}
                      onClick={() => {
                        if (isSelectedUpcoming) return;
                        goToBooking(movieDetails);
                      }}
                      disabled={isSelectedUpcoming}
                    >
                      {isSelectedUpcoming ? (
                        <>
                          <svg viewBox="0 0 24 24" className="modal-book-lock" aria-hidden="true">
                            <path fill="currentColor" d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 1 0-6 0v2z" />
                          </svg>
                          SOON
                        </>
                      ) : (
                        (isThai ? 'จองเลย' : 'BOOK NOW')
                      )}
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
    </div>
  );
}
