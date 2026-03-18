import { Showtime } from '../models/Showtime';
import { Cinema } from '../models/Cinema';

export interface IShowtimePlain {
    _id: unknown;
    cinemaId: string;
    hall: string;
    movieId: number;
    movieTitle: string;
    posterPath: string;
    showtime: Date;
    price: number;
    screenType: string;
    totalSeats: number;
    availableSeats: number;
    language: string;
    is3D: boolean;
}

export interface ICinemaPlain {
    id: string;
    chain: string;
    nameEn: string;
    nameTh: string;
    province: string;
    district: string;
    address: string;
    lat: number;
    lon: number;
    halls: string[];
    screenTypes: string[];
}

export interface ShowtimeFilter {
    cinemaId?: string;
    movieId?: number;
    date?: string;
    chain?: 'major' | 'sf';
}

interface MovieGroup {
    movieId: number;
    movieTitle: string;
    posterPath: string;
    showtimes: IShowtimePlain[];
}

interface CinemaGroup {
    cinema: ICinemaPlain;
    showtimes: IShowtimePlain[];
}

export class ShowtimeService {
    /** Get showtimes for a cinema on a given date, grouped by movie */
    async getShowtimesByCinema(cinemaId: string, date?: string) {
        const rawCinema = await Cinema.findOne({ id: cinemaId }).lean().exec();
        if (!rawCinema) return null;
        const cinema = rawCinema as unknown as ICinemaPlain;

        const { start, end, displayDate } = this.parseDateRange(date);

        const rawShowtimes = await Showtime.find({
            cinemaId,
            showtime: { $gte: start, $lt: end },
        })
            .sort({ showtime: 1 })
            .lean()
            .exec();

        const showtimes = rawShowtimes as unknown as IShowtimePlain[];

        // Group by movie
        const movieMap = new Map<number, MovieGroup>();
        for (const st of showtimes) {
            if (!movieMap.has(st.movieId)) {
                movieMap.set(st.movieId, {
                    movieId: st.movieId,
                    movieTitle: st.movieTitle,
                    posterPath: st.posterPath,
                    showtimes: [],
                });
            }
            movieMap.get(st.movieId)!.showtimes.push(st);
        }

        return {
            cinema,
            date: displayDate,
            movieCount: movieMap.size,
            showtimeCount: showtimes.length,
            movies: Array.from(movieMap.values()),
        };
    }

    /** Get showtimes for a movie across all cinemas.
     *  - date provided  → query that single day
     *  - date omitted   → query next 7 days (so the UI can show a full date picker)
     */
    async getShowtimesByMovie(movieId: number, date?: string, chain?: 'major' | 'sf') {
        const { start, end, displayDate } = date
            ? this.parseDateRange(date)
            : this.parseMultiDayRange(7);

        const rawShowtimes = await Showtime.find({
            movieId,
            showtime: { $gte: start, $lt: end },
        })
            .sort({ showtime: 1 })
            .lean()
            .exec();

        const showtimes = rawShowtimes as unknown as IShowtimePlain[];

        // Lookup cinemas
        const cinemaIds = [...new Set(showtimes.map((s) => s.cinemaId))];
        const cinemaQuery = chain ? { id: { $in: cinemaIds }, chain } : { id: { $in: cinemaIds } };
        const rawCinemas = await Cinema.find(cinemaQuery).lean().exec();
        const cinemas = rawCinemas as unknown as ICinemaPlain[];
        const cinemaMap = new Map(cinemas.map((c) => [c.id, c]));

        // Group by cinema
        const cinemaShowtimes: Record<string, CinemaGroup> = {};
        for (const st of showtimes) {
            const cinema = cinemaMap.get(st.cinemaId);
            if (!cinema) continue;
            if (!cinemaShowtimes[st.cinemaId]) {
                cinemaShowtimes[st.cinemaId] = { cinema, showtimes: [] };
            }
            cinemaShowtimes[st.cinemaId].showtimes.push(st);
        }

        return {
            movieId,
            date: displayDate,
            cinemaCount: Object.keys(cinemaShowtimes).length,
            showtimeCount: showtimes.length,
            cinemas: Object.values(cinemaShowtimes),
        };
    }

    /** Create a new showtime */
    async create(data: Partial<IShowtimePlain>): Promise<unknown> {
        return Showtime.create(data);
    }

    /** Delete all showtimes (for reseed) */
    async deleteAll(): Promise<void> {
        await Showtime.deleteMany({});
    }

    private parseDateRange(date?: string) {
        const dateInput = String(date || '').trim();
        const base = dateInput ? new Date(`${dateInput}T00:00:00+07:00`) : new Date();

        const localStr = base.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const [y, m, d] = localStr.split('-');

        const start = new Date(`${y}-${m}-${d}T00:00:00+07:00`);
        const end = new Date(`${y}-${m}-${d}T23:59:59+07:00`);
        const displayDate = `${y}-${m}-${d}`;

        return { start, end, displayDate };
    }

    /** Return a range from today 00:00 to today+days 23:59 (Bangkok time) */
    private parseMultiDayRange(days: number) {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const [y, m, d] = todayStr.split('-');
        const start = new Date(`${y}-${m}-${d}T00:00:00+07:00`);

        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + days);
        endDate.setSeconds(endDate.getSeconds() - 1); // 23:59:59 of last day

        return { start, end: endDate, displayDate: todayStr };
    }
}
