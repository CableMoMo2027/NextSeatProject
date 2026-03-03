import axios from 'axios';

const API_BASE = 'http://localhost:3000';
const HERO_COUNT = 5;

// Global cache object so it persists across Home unmount/mounts.
const globalCache = {
    langCache: {},       // { 'en-US': { trending, heroSlides, categories } }
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

// Moving the fetch logic here so we can guarantee caching perfectly outside the component lifecycle
export const fetchHomeData = async (fetchLang, GENRE_ROWS) => {
    // Check cache first
    const cached = getCachedData(fetchLang);
    if (cached) return cached;

    try {
        const trendingRes = await axios.get(`${API_BASE}/movies/trending?lang=${fetchLang}`);
        const trendingMovies = trendingRes.data.results || [];

        // Fetch cert + trailer for top HERO_COUNT movies in parallel
        const heroMovies = trendingMovies.slice(0, HERO_COUNT);
        const slideData = await Promise.all(
            heroMovies.map(async (movie) => {
                let cert = 'N/A';
                let trailerKey = null;
                try {
                    const [certRes, videoRes] = await Promise.all([
                        axios.get(`${API_BASE}/movies/${movie.id}/certification`),
                        axios.get(`${API_BASE}/movies/${movie.id}/videos`),
                    ]);
                    cert = certRes.data.certification || 'N/A';
                    const videos = videoRes.data.results || [];
                    const trailer =
                        videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
                        videos.find((v) => v.site === 'YouTube');
                    trailerKey = trailer?.key || null;
                } catch { /* use defaults */ }
                return { movie, cert, trailerKey };
            })
        );

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
        };

        // Save to cache
        setCachedData(fetchLang, dataToCache);

        return dataToCache;

    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
};
