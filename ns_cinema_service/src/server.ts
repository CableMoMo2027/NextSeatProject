import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app';

const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/NextSeatCinemas';

async function bootstrap() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(`🗃  MongoDB connected: ${MONGODB_URI}`);

        app.listen(PORT, () => {
            console.log(`🎬 ns-cinema-service listening on http://localhost:${PORT}`);
            console.log(`   Health:  GET http://localhost:${PORT}/health`);
            console.log(`   Cinemas: GET http://localhost:${PORT}/internal/cinemas`);
            console.log(`   Chain:   GET http://localhost:${PORT}/internal/cinemas/chain/major`);
            console.log(`   Nearby:  GET http://localhost:${PORT}/internal/cinemas/nearby?lat=13.74&lon=100.53&radiusM=5000`);
        });
    } catch (err) {
        console.error('❌ Failed to start cinema service:', err);
        process.exit(1);
    }
}

bootstrap();
