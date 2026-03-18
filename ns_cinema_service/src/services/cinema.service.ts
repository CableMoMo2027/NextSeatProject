import { Cinema } from '../models/Cinema';
import { Showtime } from '../models/Showtime';
import { CINEMA_CATALOG, Chain } from '../data/cinema-catalog';

// ─── Plain-object interfaces (from lean()) ────────────────────────────────────
export interface ICinemaPlain {
    id: string;
    chain: 'major' | 'sf';
    nameEn: string;
    nameTh: string;
    province: string;
    district: string;
    address: string;
    lat: number;
    lon: number;
    halls: string[];
    screenTypes: string[];
    isActive: boolean;
    distanceM?: number;
}

export interface CinemaFilter {
    chain?: Chain;
    province?: string;
    /** Free-text search: matches nameEn, nameTh, district, address */
    query?: string;
    lat?: number;
    lon?: number;
    /** Only used when lat+lon are provided. Default: no radius cap */
    radiusM?: number;
}

// ─── Haversine distance ───────────────────────────────────────────────────────
function toRadians(deg: number) { return (deg * Math.PI) / 180; }

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Guard against undefined / NaN coordinates
    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
        return Infinity;
    }
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Build a flexible regex pattern that allows optional whitespace between
 * characters, so queries like "Rama9" match "Rama 9" in the database.
 *
 * Examples:
 *   "Rama9"         → `R\s*a\s*m\s*a\s*9`     matches "Rama 9"
 *   "Central Rama9" → `C…l\s+R\s*a\s*m\s*a\s*9` matches "Central Rama 9"
 */
function buildFlexPattern(query: string): string {
    // Escape regex special characters first
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Split on whitespace → each word becomes a char-by-char pattern
    // Words are joined with \s+ (space required between words)
    return escaped
        .split(/\s+/)
        .map((word) => word.split('').join('\\s*'))   // "Rama9" → "R\s*a\s*m\s*a\s*9"
        .join('\\s+');                                  // "Central Rama9" → "…\s+…"
}

export class CinemaService {

    /** List cinemas with optional filters */
    async listCinemas(filters: CinemaFilter = {}): Promise<ICinemaPlain[]> {
        // Build the MongoDB filter using $and so each condition is independent
        const conditions: Record<string, unknown>[] = [{ isActive: true }];

        if (filters.chain) {
            conditions.push({ chain: filters.chain });
        }
        if (filters.province) {
            conditions.push({ province: { $regex: filters.province, $options: 'i' } });
        }
        if (filters.query && filters.query.trim()) {
            // Build a flexible regex: "Rama9" → R\s*a\s*m\s*a\s*9
            // so it matches "Rama 9", "Rama  9", etc. (ignores/allows spaces)
            // Spaces in the original query become \s+ (required word boundary)
            const pattern = buildFlexPattern(filters.query.trim());
            const rx = { $regex: pattern, $options: 'i' };
            conditions.push({
                $or: [
                    { nameEn: rx },
                    { nameTh: rx },
                    { district: rx },
                    { address: rx },
                    { province: rx },
                ],
            });
        }

        const mongoQuery = conditions.length === 1 ? conditions[0] : { $and: conditions };
        const rawCinemas = await Cinema.find(mongoQuery).lean().exec();
        let cinemas = rawCinemas as unknown as ICinemaPlain[];

        const hasLocation = typeof filters.lat === 'number' && typeof filters.lon === 'number';

        // Radius filter (only when lat+lon AND radiusM are all provided)
        if (hasLocation && typeof filters.radiusM === 'number') {
            cinemas = cinemas.filter(
                (c) => distanceMeters(filters.lat!, filters.lon!, c.lat, c.lon) <= filters.radiusM!,
            );
        }

        if (hasLocation) {
            // Attach distance and sort closest-first
            return cinemas
                .map((c) => ({
                    ...c,
                    distanceM: distanceMeters(filters.lat!, filters.lon!, c.lat, c.lon),
                }))
                .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
        }

        return cinemas.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    }

    /** Find a single cinema by its string ID */
    async findById(id: string): Promise<ICinemaPlain | null> {
        const raw = await Cinema.findOne({ id }).lean().exec();
        return raw as unknown as ICinemaPlain | null;
    }

    /** Chain summary statistics */
    async getChainSummary() {
        const [major, sf] = await Promise.all([
            Cinema.countDocuments({ chain: 'major', isActive: true }),
            Cinema.countDocuments({ chain: 'sf', isActive: true }),
        ]);
        const provinces = await Cinema.distinct('province');
        const majorProvinces = await Cinema.distinct('province', { chain: 'major', isActive: true });
        const sfProvinces = await Cinema.distinct('province', { chain: 'sf', isActive: true });
        return {
            asOf: new Date().toISOString(),
            total: major + sf,
            provinces: (provinces as string[]).sort(),
            major: { total: major, provinces: (majorProvinces as string[]).sort() },
            sf: { total: sf, provinces: (sfProvinces as string[]).sort() },
        };
    }

    /**
     * Nearby cinemas sorted by distance.
     * @param radiusM  if provided, only return cinemas within this radius.
     *                 Pass undefined to return ALL cinemas sorted by distance.
     */
    async findNearby(
        lat: number,
        lon: number,
        radiusM?: number,
    ): Promise<(ICinemaPlain & { distanceM: number })[]> {
        const raw = await Cinema.find({ isActive: true }).lean().exec();
        const all = raw as unknown as ICinemaPlain[];

        const withDistance = all
            .map((c) => ({ ...c, distanceM: distanceMeters(lat, lon, c.lat, c.lon) }))
            .filter((c) => Number.isFinite(c.distanceM));          // skip bad coords

        const filtered = radiusM !== undefined
            ? withDistance.filter((c) => c.distanceM <= radiusM)
            : withDistance;                                          // no cap → all

        return filtered.sort((a, b) => a.distanceM - b.distanceM);  // closest first
    }

    /** Upsert all cinemas from the static catalog into MongoDB */
    static async syncCatalog(): Promise<void> {
        const ops = CINEMA_CATALOG.map((entry) => ({
            updateOne: {
                filter: { id: entry.id },
                update: { $set: { ...entry, isActive: true } },
                upsert: true,
            },
        }));
        await Cinema.bulkWrite(ops);
        const catalogIds = CINEMA_CATALOG.map((c) => c.id);
        await Cinema.updateMany({ id: { $nin: catalogIds } }, { $set: { isActive: false } });
        console.log(`✅ Synced ${ops.length} cinemas from catalog.`);
        const count = await Showtime.countDocuments();
        console.log(`   Showtime collection currently has ${count} documents.`);
    }
}
