import { useEffect, useState } from 'react';
import logo from '../assets/logo/NextSeat.png';
import './SplashScreen.css';

export default function SplashScreen({ onDone }) {
    const [phase, setPhase] = useState('fadein'); // fadein → hold → fadeout

    useEffect(() => {
        // After logo fades in (0.9s), hold for ~4s, then fade out (0.8s)
        const holdTimer = setTimeout(() => setPhase('fadeout'), 4200);
        const doneTimer = setTimeout(() => onDone(), 5000);
        return () => {
            clearTimeout(holdTimer);
            clearTimeout(doneTimer);
        };
    }, [onDone]);

    return (
        <div className={`splash-screen ${phase}`}>
            <div className="splash-inner">
                <img src={logo} alt="NextSeat" className="splash-logo" />
                <div className="splash-tagline"></div>
            </div>
            <div className="splash-particles">
                {[...Array(6)].map((_, i) => (
                    <span key={i} className={`particle particle-${i + 1}`} />
                ))}
            </div>
        </div>
    );
}
