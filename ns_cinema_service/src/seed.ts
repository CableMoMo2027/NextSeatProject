/**
 * Seed script for ns_cinema_service.
 * Upserts all cinemas from the static catalog and inserts realistic showtimes.
 *
 * Showtime scheduling logic:
 *   - First show starts at OPENING_HOUR (10:00)
 *   - next = ceil30(prevStart + runtimeMin + BUFFER_MIN)
 *   - Repeats until start would be ≥ CLOSING_HOUR (23:00)
 *   - Movie runtime fetched from TMDB API (cached in RUNTIME_CACHE)
 *
 * Usage (from ns_cinema_service/):
 *   npm run seed
 */
import 'dotenv/config';
import https from 'https';
import mongoose from 'mongoose';
import { CinemaService } from './services/cinema.service';
import { ShowtimeService } from './services/showtime.service';
import { CINEMA_CATALOG } from './data/cinema-catalog';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/NextSeatCinemas';
const BACKEND_MONGODB_URI = process.env.BACKEND_MONGODB_URI ?? 'mongodb://localhost:27017/NextSeat';
const TMDB_API = process.env.TMDB_API ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────
type SeedMovie = {
    movieId: number;
    movieTitle: string;
    posterPath: string;
    runtimeMin: number;
};

type SlotConfig = {
    screenType: string;
    is3D: boolean;
    language: string;
    price: number;
};

// ─── Default movies (fallback when backend DB is empty) ───────────────────────
const DEFAULT_MOVIES_RAW = [
    { movieId: 698687, movieTitle: 'Transformers One', posterPath: '/iRLEBI3YCzMGhHvLOFjGL5bBGXs.jpg' },
    { movieId: 823219, movieTitle: 'Flow', posterPath: '/imKSymKBMlJIaMnOEPHHOqKxBJ7.jpg' },
    { movieId: 1184918, movieTitle: 'The Wild Robot', posterPath: '/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg' },
    { movieId: 533535, movieTitle: 'Deadpool & Wolverine', posterPath: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
    { movieId: 945961, movieTitle: 'Alien: Romulus', posterPath: '/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg' },
];

// Local runtime cache (seed-session only)
const RUNTIME_CACHE = new Map<number, number>();
const DEFAULT_RUNTIME = 120; // fallback when TMDB is unavailable

// ─── TMDB runtime fetch ───────────────────────────────────────────────────────
async function fetchRuntime(movieId: number): Promise<number> {
    if (RUNTIME_CACHE.has(movieId)) return RUNTIME_CACHE.get(movieId)!;
    if (!TMDB_API) {
        RUNTIME_CACHE.set(movieId, DEFAULT_RUNTIME);
        return DEFAULT_RUNTIME;
    }
    return new Promise<number>((resolve) => {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API}&language=en-US`;
        https.get(url, (res) => {
            let body = '';
            res.on('data', (chunk: string) => (body += chunk));
            res.on('end', () => {
                try {
                    const json = JSON.parse(body) as { runtime?: number };
                    const rt = json.runtime && json.runtime > 0 ? json.runtime : DEFAULT_RUNTIME;
                    RUNTIME_CACHE.set(movieId, rt);
                    resolve(rt);
                } catch {
                    RUNTIME_CACHE.set(movieId, DEFAULT_RUNTIME);
                    resolve(DEFAULT_RUNTIME);
                }
            });
        }).on('error', () => {
            RUNTIME_CACHE.set(movieId, DEFAULT_RUNTIME);
            resolve(DEFAULT_RUNTIME);
        });
    });
}

// ─── Theatre hours (Bangkok time) ─────────────────────────────────────────────
const OPENING_HOUR = 10;   // first show can start at this hour
const CLOSING_HOUR = 23;   // no new show can START at or after this hour
const BUFFER_MIN = 30;   // wait time after a showing ends before next starts

// ─── Screen type slot configs ─────────────────────────────────────────────────
const SLOT_CONFIGS: Record<string, SlotConfig[]> = {
    IMAX: [
        { screenType: 'IMAX', is3D: true, language: 'EN', price: 1 },
        { screenType: 'IMAX', is3D: true, language: 'TH', price: 1 },
    ],
    '4DX': [
        { screenType: '4DX', is3D: true, language: 'TH', price: 1 },
        { screenType: '4DX', is3D: false, language: 'EN', price: 1 },
    ],
    ScreenX: [
        { screenType: 'ScreenX', is3D: false, language: 'EN', price: 1 },
        { screenType: 'ScreenX', is3D: false, language: 'TH', price: 1 },
    ],
    Standard: [
        { screenType: 'Standard', is3D: false, language: 'TH', price: 1 },
        { screenType: 'Standard', is3D: false, language: 'EN', price: 1 },
        { screenType: 'Standard', is3D: true, language: 'TH', price: 1 },
    ],
};

// ─── Scheduling helpers ───────────────────────────────────────────────────────
/** Round minutes-since-midnight UP to next 30-min mark */
function ceilToNext30(totalMin: number): number {
    const rem = totalMin % 30;
    return rem === 0 ? totalMin : totalMin + (30 - rem);
}

/** Build Bangkok-TZ Date from dayOffset + minutes-since-midnight */
function buildBangkokDate(dayOffset: number, minutesSinceMidnight: number): Date {
    const base = new Date();
    base.setDate(base.getDate() + dayOffset);
    const y = base.getFullYear();
    const mo = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    const h = String(Math.floor(minutesSinceMidnight / 60)).padStart(2, '0');
    const mi = String(minutesSinceMidnight % 60).padStart(2, '0');
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00+07:00`);
}

/**
 * Generate all showtime start-minutes for one hall + movie in one day.
 * First show = OPENING_HOUR:00, then chain via ceilToNext30(end + buffer).
 */
function generateTimes(runtimeMin: number): number[] {
    const times: number[] = [];
    let cur = OPENING_HOUR * 60;
    const closeMin = CLOSING_HOUR * 60;
    while (cur < closeMin) {
        times.push(cur);
        cur = ceilToNext30(cur + runtimeMin + BUFFER_MIN);
    }
    return times;
}

// ─── Load movies from ns_backend screenings ───────────────────────────────────
async function loadMoviesFromBackend(): Promise<Omit<SeedMovie, 'runtimeMin'>[]> {
    const conn = await mongoose.createConnection(BACKEND_MONGODB_URI).asPromise();
    try {
        const rows = await conn.collection('screenings').aggregate([
            { $group: { _id: '$movieId', movieTitle: { $first: '$movieTitle' }, posterPath: { $first: '$posterPath' } } },
            { $project: { _id: 0, movieId: '$_id', movieTitle: 1, posterPath: 1 } },
        ]).toArray() as { movieId: unknown; movieTitle: string; posterPath: string }[];
        return rows
            .filter((m) => Number.isFinite(Number(m.movieId)))
            .map((m) => ({
                movieId: Number(m.movieId),
                movieTitle: String(m.movieTitle || '').trim() || `Movie ${m.movieId}`,
                posterPath: String(m.posterPath || '').trim(),
            }));
    } catch {
        return [];
    } finally {
        await conn.close();
    }
}

// ─── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`   Connected to: ${MONGODB_URI}`);

    // 1. Sync cinemas
    await CinemaService.syncCatalog();

    // 2. Clear old showtimes
    const showtimeService = new ShowtimeService();
    await showtimeService.deleteAll();
    console.log('🗑  Cleared existing showtimes.');

    // 3. Resolve movies + fetch runtimes from TMDB
    const backendRaw = await loadMoviesFromBackend();
    const rawMovies = backendRaw.length > 0 ? backendRaw : DEFAULT_MOVIES_RAW;
    console.log(`🎞  Fetching runtimes for ${rawMovies.length} movies from TMDB...`);

    const movies: SeedMovie[] = await Promise.all(
        rawMovies.map(async (m) => {
            const rt = await fetchRuntime(m.movieId);
            console.log(`   • ${m.movieTitle} → ${rt} min`);
            return { ...m, runtimeMin: rt };
        }),
    );

    // 4. Seed showtime docs
    const dayOffsets = [0, 1, 2, 3, 4, 5, 6, 7];
    const bulkDocs: object[] = [];

    for (const cinema of CINEMA_CATALOG) {
        const hasImax = cinema.screenTypes.some((s) => s.toLowerCase().includes('imax'));
        const has4dx = cinema.screenTypes.some((s) => s.toLowerCase().includes('4dx'));
        const hasScreenX = cinema.screenTypes.some((s) => s.toLowerCase().includes('screenx'));

        for (let mi = 0; mi < movies.length; mi++) {
            const movie = movies[mi];
            const hall = cinema.halls[mi % cinema.halls.length];
            const times = generateTimes(movie.runtimeMin);

            // Pick screen type for this movie at this cinema
            let screenType = 'Standard';
            if (movie.movieId === 533535 && hasImax) screenType = 'IMAX';
            else if (movie.movieId === 945961 && has4dx) screenType = '4DX';
            else if (movie.movieId === 1184918 && hasScreenX) screenType = 'ScreenX';

            const configs = SLOT_CONFIGS[screenType] ?? SLOT_CONFIGS['Standard'];
            const cfg = configs[mi % configs.length];
            const seats = screenType === 'IMAX' ? 300 : screenType === '4DX' ? 200 : screenType === 'ScreenX' ? 250 : 150;

            for (const dayOffset of dayOffsets) {
                for (const startMin of times) {
                    bulkDocs.push({
                        cinemaId: cinema.id,
                        hall,
                        movieId: movie.movieId,
                        movieTitle: movie.movieTitle,
                        posterPath: movie.posterPath,
                        showtime: buildBangkokDate(dayOffset, startMin),
                        price: cfg.price,
                        screenType: cfg.screenType,
                        totalSeats: seats,
                        availableSeats: Math.floor(Math.random() * (seats * 0.7)) + Math.floor(seats * 0.1),
                        language: cfg.language,
                        is3D: cfg.is3D,
                    });
                }
            }
        }
    }

    // Batch insert
    const { Showtime } = await import('./models/Showtime');
    if (bulkDocs.length > 0) {
        await Showtime.insertMany(bulkDocs, { ordered: false });
    }

    console.log(`\n✅ Inserted ${bulkDocs.length} showtimes across ${CINEMA_CATALOG.length} cinemas.`);

    // Sample schedule print
    const sample = movies[3] ?? movies[0];
    console.log(`\n📅 Sample schedule: "${sample.movieTitle}" (${sample.runtimeMin} min, +${BUFFER_MIN} min buffer)`);
    generateTimes(sample.runtimeMin).forEach((t) => {
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const end = t + sample.runtimeMin;
        const next = ceilToNext30(end + BUFFER_MIN);
        console.log(`   🎬 ${fmt(t)} → จบ ${fmt(end)} → +${BUFFER_MIN}min → รอบถัดไป ${fmt(next)}`);
    });

    await mongoose.disconnect();
    console.log('\n🌱 Seed complete!');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
