/**
 * Seed script — creates demo screenings in MongoDB.
 *
 * Usage:
 *   npx ts-node src/seed.ts
 *
 * Make sure MongoDB is running on localhost:27017/NextSeat.
 */
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/NextSeat';

type MovieSeed = {
    movieId: number;
    movieTitle: string;
    posterPath: string;
    theater: string;
    price: number;
    rows: number;
    seatsPerRow: number;
};

type TimeSlot = { hour: number; minute: number };

function buildBangkokDate(baseDate: Date, dayOffset: number, hour: number, minute: number): Date {
    const local = new Date(baseDate);
    local.setDate(local.getDate() + dayOffset);
    local.setHours(hour, minute, 0, 0);

    // Convert local to explicit +07:00 timestamp for stable seed time in Thailand.
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, '0');
    const d = String(local.getDate()).padStart(2, '0');
    const hh = String(local.getHours()).padStart(2, '0');
    const mm = String(local.getMinutes()).padStart(2, '0');
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+07:00`);
}

const baseDate = new Date('2026-03-04T00:00:00+07:00');
const dayOffsets = [0, 1, 2, 3, 4, 5]; // today + 5 more days

const movieSeeds: MovieSeed[] = [
    {
        movieId: 698687,
        movieTitle: 'Transformers One',
        posterPath: '/iRLEBI3YCzMGhHvLOFjGL5bBGXs.jpg',
        theater: 'HALL A',
        price: 1,
        rows: 8,
        seatsPerRow: 12,
    },
    {
        movieId: 823219,
        movieTitle: 'Flow',
        posterPath: '/imKSymKBMlJIaMnOEPHHOqKxBJ7.jpg',
        theater: 'HALL B',
        price: 1,
        rows: 6,
        seatsPerRow: 10,
    },
    {
        movieId: 1184918,
        movieTitle: 'The Wild Robot',
        posterPath: '/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg',
        theater: 'HALL A',
        price: 1,
        rows: 8,
        seatsPerRow: 12,
    },
    {
        movieId: 533535,
        movieTitle: 'Deadpool & Wolverine',
        posterPath: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        theater: 'IMAX',
        price: 1,
        rows: 10,
        seatsPerRow: 16,
    },
];

const showtimeByMovie: Record<number, TimeSlot[]> = {
    698687: [
        { hour: 11, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 17, minute: 30 },
        { hour: 20, minute: 30 },
    ],
    823219: [
        { hour: 10, minute: 45 },
        { hour: 13, minute: 30 },
        { hour: 16, minute: 15 },
        { hour: 19, minute: 45 },
    ],
    1184918: [
        { hour: 11, minute: 30 },
        { hour: 15, minute: 0 },
        { hour: 18, minute: 0 },
        { hour: 21, minute: 0 },
    ],
    533535: [
        { hour: 12, minute: 0 },
        { hour: 15, minute: 30 },
        { hour: 19, minute: 0 },
        { hour: 22, minute: 0 },
    ],
};

const screeningsData = movieSeeds.flatMap((movie) =>
    dayOffsets.flatMap((offset) =>
        (showtimeByMovie[movie.movieId] || []).map((slot) => ({
            movieId: movie.movieId,
            movieTitle: movie.movieTitle,
            posterPath: movie.posterPath,
            theater: movie.theater,
            showtime: buildBangkokDate(baseDate, offset, slot.hour, slot.minute),
            price: movie.price,
            rows: movie.rows,
            seatsPerRow: movie.seatsPerRow,
        })),
    ),
);

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db!;

    // Drop existing screenings (clean slate for demo)
    const collections = await db.listCollections({ name: 'screenings' }).toArray();
    if (collections.length > 0) {
        await db.dropCollection('screenings');
        console.log('   Dropped existing screenings collection.');
    }

    // Also clean up holds and bookings for fresh demo
    for (const col of ['seatholds', 'bookings']) {
        const exists = await db.listCollections({ name: col }).toArray();
        if (exists.length > 0) {
            await db.dropCollection(col);
            console.log(`   Dropped existing ${col} collection.`);
        }
    }

    // Insert demo screenings
    const result = await db.collection('screenings').insertMany(screeningsData);
    console.log(`✅ Inserted ${result.insertedCount} demo screenings.`);

    // Print them out
    const inserted = await db.collection('screenings').find().toArray();
    for (const s of inserted) {
        console.log(
            `   🎬 ${s.movieTitle} | ${s.theater} | ${new Date(s.showtime).toLocaleString()} | ฿${s.price}`,
        );
    }

    await mongoose.disconnect();
    console.log('\n🌱 Seed complete!');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
