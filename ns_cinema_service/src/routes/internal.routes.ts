import { Router, Request, Response } from 'express';
import { CinemaService } from '../services/cinema.service';
import { ShowtimeService } from '../services/showtime.service';
import { Chain } from '../data/cinema-catalog';

const router = Router();
const cinemaService = new CinemaService();
const showtimeService = new ShowtimeService();

// ─── Helper ──────────────────────────────────────────────────────────────────
function parseNumber(val: unknown): number | undefined {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
}

function validateChain(val: unknown): Chain | undefined {
    if (val === 'major' || val === 'sf') return val;
    return undefined;
}

// ─── GET /internal/cinemas ────────────────────────────────────────────────────
// Query: chain, province, query, lat, lon, radiusM
router.get('/cinemas', async (req: Request, res: Response) => {
    try {
        const cinemas = await cinemaService.listCinemas({
            chain: validateChain(req.query.chain),
            province: req.query.province as string | undefined,
            query: req.query.query as string | undefined,
            lat: parseNumber(req.query.lat),
            lon: parseNumber(req.query.lon),
            // Only pass radiusM when explicitly specified — undefined means no radius cap
            radiusM: parseNumber(req.query.radiusM),
        });
        res.json({ success: true, count: cinemas.length, data: cinemas });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/chains ────────────────────────────────────────────
router.get('/cinemas/chains', async (_req: Request, res: Response) => {
    try {
        const summary = await cinemaService.getChainSummary();
        res.json({ success: true, data: summary });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/chain/:chain ──────────────────────────────────────
router.get('/cinemas/chain/:chain', async (req: Request, res: Response) => {
    try {
        const chain = validateChain(req.params.chain);
        if (!chain) {
            res.status(400).json({ success: false, message: 'chain must be "major" or "sf"' });
            return;
        }
        const cinemas = await cinemaService.listCinemas({ chain });
        res.json({ success: true, chain, count: cinemas.length, data: cinemas });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/province/:province ────────────────────────────────
router.get('/cinemas/province/:province', async (req: Request, res: Response) => {
    try {
        const cinemas = await cinemaService.listCinemas({
            province: req.params.province,
        });
        res.json({
            success: true,
            province: req.params.province,
            count: cinemas.length,
            data: cinemas,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/nearby ────────────────────────────────────────────
// Query: lat (required), lon (required), radiusM (optional, default 10000)
router.get('/cinemas/nearby', async (req: Request, res: Response) => {
    try {
        const lat = parseNumber(req.query.lat);
        const lon = parseNumber(req.query.lon);
        if (lat === undefined || lon === undefined) {
            res.status(400).json({ success: false, message: 'lat and lon are required' });
            return;
        }
        // radiusM is optional — omit it to get ALL cinemas sorted nearest-first
        const radiusM = parseNumber(req.query.radiusM);
        const cinemas = await cinemaService.findNearby(lat, lon, radiusM);
        res.json({ success: true, lat, lon, radiusM: radiusM ?? null, count: cinemas.length, data: cinemas });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/:id ───────────────────────────────────────────────
router.get('/cinemas/:id', async (req: Request, res: Response) => {
    try {
        const cinema = await cinemaService.findById(req.params.id);
        if (!cinema) {
            res.status(404).json({ success: false, message: `Cinema "${req.params.id}" not found` });
            return;
        }
        res.json({ success: true, data: cinema });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/cinemas/:id/showtimes ─────────────────────────────────────
// Query: date (YYYY-MM-DD, optional — defaults to today Bangkok time)
router.get('/cinemas/:id/showtimes', async (req: Request, res: Response) => {
    try {
        const result = await showtimeService.getShowtimesByCinema(
            req.params.id,
            req.query.date as string | undefined,
        );
        if (!result) {
            res.status(404).json({ success: false, message: `Cinema "${req.params.id}" not found` });
            return;
        }
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

// ─── GET /internal/movies/:movieId/showtimes ─────────────────────────────────
// Query: date (YYYY-MM-DD), chain (major|sf)
router.get('/movies/:movieId/showtimes', async (req: Request, res: Response) => {
    try {
        const movieId = parseInt(req.params.movieId, 10);
        if (isNaN(movieId)) {
            res.status(400).json({ success: false, message: 'movieId must be a number' });
            return;
        }
        const result = await showtimeService.getShowtimesByMovie(
            movieId,
            req.query.date as string | undefined,
            validateChain(req.query.chain),
        );
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});

export default router;
