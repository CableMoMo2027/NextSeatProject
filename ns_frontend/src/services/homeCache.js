import axios from 'axios';
import { MAIN_API_BASE } from '../config/runtime';

const API_BASE = MAIN_API_BASE;
const HERO_COUNT = 5;
const LANGUAGE_KEY = 'nextseat_lang';
const HERO_EXCLUDED_TITLES = new Set([
    'the testament of ann lee',
    'the super mario galaxy movie',
]);

function selectBestYouTubeVideo(videos) {
    const list = Array.isArray(videos) ? videos : [];
    const candidates = list.filter((v) => v?.site === 'YouTube' && v?.key);
    if (candidates.length === 0) return null;

    const scoreType = (type) => {
        const normalized = String(type || '').trim().toLowerCase();
        if (normalized === 'trailer') return 3;
        if (normalized === 'teaser') return 2;
        return 1;
    };

    const scoreOfficial = (official) => (official ? 1 : 0);
    const scoreSize = (size) => {
        const numericSize = Number(size);
        return Number.isFinite(numericSize) ? numericSize : 0;
    };
    const scorePublishedAt = (publishedAt) => {
        const timestamp = Date.parse(String(publishedAt || ''));
        return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return [...candidates].sort((a, b) => {
        const typeDelta = scoreType(b.type) - scoreType(a.type);
        if (typeDelta !== 0) return typeDelta;

        const officialDelta = scoreOfficial(b.official) - scoreOfficial(a.official);
        if (officialDelta !== 0) return officialDelta;

        const sizeDelta = scoreSize(b.size) - scoreSize(a.size);
        if (sizeDelta !== 0) return sizeDelta;

        return scorePublishedAt(b.published_at) - scorePublishedAt(a.published_at);
    })[0];
}

// Global cache object so it persists across Home unmount/mounts.
const globalCache = {
    langCache: {},       // { 'en-US': { trending, heroSlides, categories, upcoming } }
    detailsCache: {},    // { '1234_en-US': { details, trailerKey } }
    lastSlideIdx: 0,
    lastScrollY: 0
};

export const getCachedData = (lang) => {
    return globalCache.langCache[lang] || null;
};

export const setCachedData = (lang, data) => {
    globalCache.langCache[lang] = data;
};

export const getCachedDetails = (movieId, lang) => {
    return globalCache.detailsCache[`${movieId}_${lang}`] || null;
};

export const setCachedDetails = (movieId, lang, details, trailerKey) => {
    globalCache.detailsCache[`${movieId}_${lang}`] = { details, trailerKey };
};

export const saveHomeState = (slideIdx, scrollY) => {
    globalCache.lastSlideIdx = slideIdx;
    globalCache.lastScrollY = scrollY;
};

export const getHomeState = () => {
    return {
        slideIdx: globalCache.lastSlideIdx,
        scrollY: globalCache.lastScrollY
    };
};

export const getSavedLanguage = () => {
    try {
        const raw = localStorage.getItem(LANGUAGE_KEY);
        return raw === 'th-TH' ? 'th-TH' : 'en-US';
    } catch {
        return 'en-US';
    }
};

export const setSavedLanguage = (lang) => {
    const normalized = lang === 'th-TH' ? 'th-TH' : 'en-US';
    try {
        localStorage.setItem(LANGUAGE_KEY, normalized);
    } catch {
        // ignore storage errors
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nextseat:lang-changed', { detail: { lang: normalized } }));
    }
};

// Moving the fetch logic here so we can guarantee caching perfectly outside the component lifecycle
export const fetchHomeData = async (fetchLang, GENRE_ROWS) => {
    // Check cache first
    const cached = getCachedData(fetchLang);
    if (cached) return cached;

    try {
        const [trendingRes, upcomingRes] = await Promise.all([
            axios.get(`${API_BASE}/movies/trending?lang=${fetchLang}`),
            axios.get(`${API_BASE}/movies/upcoming?lang=${fetchLang}`),
        ]);
        const trendingMovies = trendingRes.data.results || [];
        const upcomingMovies = upcomingRes.data.results || [];
        const upcomingIds = new Set(upcomingMovies.map((movie) => movie?.id).filter(Boolean));

        // Hero section should only show non-upcoming movies and must have both TH/EN localized data.
        const heroCandidates = trendingMovies
            .filter((movie) => {
                if (upcomingIds.has(movie?.id)) return false;
                const title = String(movie?.title || '').trim().toLowerCase();
                const originalTitle = String(movie?.original_title || '').trim().toLowerCase();
                if (HERO_EXCLUDED_TITLES.has(title)) return false;
                if (HERO_EXCLUDED_TITLES.has(originalTitle)) return false;
                return true;
            });

        const slideData = [];
        for (const movie of heroCandidates) {
            if (slideData.length >= HERO_COUNT) break;

            try {
                const [thDetailRes, enDetailRes, activeDetailRes, certRes, videoRes] = await Promise.all([
                    axios.get(`${API_BASE}/movies/${movie.id}?lang=th-TH`),
                    axios.get(`${API_BASE}/movies/${movie.id}?lang=en-US`),
                    axios.get(`${API_BASE}/movies/${movie.id}?lang=${fetchLang}`),
                    axios.get(`${API_BASE}/movies/${movie.id}/certification`),
                    axios.get(`${API_BASE}/movies/${movie.id}/videos`),
                ]);

                const thTitle = String(thDetailRes?.data?.title || '').trim();
                const thOverview = String(thDetailRes?.data?.overview || '').trim();
                const enTitle = String(enDetailRes?.data?.title || '').trim();
                const enOverview = String(enDetailRes?.data?.overview || '').trim();
                const hasBothLocalized = Boolean(thTitle && thOverview && enTitle && enOverview);
                if (!hasBothLocalized) continue;

                const activeTitle = String(activeDetailRes?.data?.title || movie?.title || '').trim();
                const activeOverview = String(activeDetailRes?.data?.overview || '').trim();
                const resolvedTitle = activeTitle || (fetchLang === 'th-TH' ? thTitle : enTitle);
                const resolvedOverview = activeOverview || (fetchLang === 'th-TH' ? thOverview : enOverview);

                const videos = videoRes.data.results || [];
                const trailer = selectBestYouTubeVideo(videos);

                slideData.push({
                    movie: {
                        ...movie,
                        title: resolvedTitle,
                        overview: resolvedOverview,
                    },
                    cert: certRes.data.certification || 'N/A',
                    trailerKey: trailer?.key || null,
                });
            } catch {
                // Skip movie if localized metadata cannot be fetched reliably.
            }
        }

        // Fetch genre rows
        const genreResults = await Promise.all(
            GENRE_ROWS.map(async (genre) => {
                const res = await axios.get(`${API_BASE}/movies/genre/${genre.id}?lang=${fetchLang}`);
                return { id: genre.id, movies: res.data.results || [] };
            })
        );
        const map = {};
        genreResults.forEach((g) => { map[g.id] = g.movies; });

        const dataToCache = {
            trending: trendingMovies,
            heroSlides: slideData,
            categories: map,
            upcoming: upcomingMovies,
        };

        // Save to cache
        setCachedData(fetchLang, dataToCache);

        return dataToCache;

    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
};
