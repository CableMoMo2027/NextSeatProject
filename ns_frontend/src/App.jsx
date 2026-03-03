import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase';
import SplashScreen from './components/SplashScreen';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import AuthLayout from './components/AuthLayout';
import ProfileSetup from './components/Profile_Setup';
import Member from './components/Member';
import MyTicket from './components/MyTicket';
import TicketDetail from "./components/TicketDetail";

// Sub-component to use `useLocation`
const AnimatedRoutes = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home user={user} />} />
        <Route path="/member-detail" element={<Member user={user} />} />
        <Route path="/my-ticket" element={<MyTicket user={user} />} />
        <Route path="/ticket-detail" element={<TicketDetail />} />

        {/* Auth routes with shared FloatingLines background */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route
          path="/customize-profile"
          element={
            <ProfileSetup
              user={user}
              onComplete={() => navigate('/home')}
              onSkip={() => navigate('/home')}
              noBackground={false}
            />
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [user, setUser] = useState(null);

  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      {splashDone && <AnimatedRoutes user={user} />}
    </BrowserRouter>
  );
}

export default App;
