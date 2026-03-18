import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase';
import SplashScreen from './components/layout/SplashScreen';
import AuthLayout from './components/layout/AuthLayout';
import MainNavbar from './components/navigation/MainNavbar';
import Home from './pages/browse/Home';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmailWaiting from './pages/auth/VerifyEmailWaiting';
import ProfileSetup from './pages/account/Profile_Setup';
import Member from './pages/account/Member';
import MyTicket from './pages/account/MyTicket';
import TicketDetail from './pages/account/TicketDetail';
import Promotion from './pages/browse/Promotion';
import BookingModalPage from './pages/booking/BookingModalPage';
import SeatPage from './pages/booking/SeatPage';
import ScreeningSelectionPage from './pages/booking/ScreeningSelectionView';
import SearchResultsPage from './pages/browse/SearchResultsPage';
import AddPromotionCheckoutPage from './pages/booking/AddPromotionCheckoutPage';
import CheckoutPaymentPage from './pages/booking/CheckoutPaymentPage';
import NewPopularPage from './pages/browse/NewPopularPage';
import UpcomingPage from './pages/browse/UpcomingPage';
import { fetchHomeData, getSavedLanguage } from './services/homeCache';

const BROWSE_NAV_ROUTES = new Set(['/movies', '/search-results', '/upcoming', '/promotion']);
const HOME_PRELOAD_GENRES = [
  { id: 28 },
  { id: 35 },
  { id: 27 },
  { id: 16 },
  { id: 878 },
  { id: 18 },
  { id: 10749 },
  { id: 14 },
];

function BrowseLayout({ user }) {
  const location = useLocation();
  const active = location.pathname === '/upcoming'
    ? 'upcoming'
    : location.pathname === '/promotion'
      ? 'promotion'
      : 'movies';

  return (
    <>
      <MainNavbar user={user} active={active} memberDetailAsPopup />
      <Outlet />
    </>
  );
}

// Sub-component to use `useLocation`
const AnimatedRoutes = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeKey = BROWSE_NAV_ROUTES.has(location.pathname) ? 'browse-layout' : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home user={user} />} />
        <Route path="/member-detail" element={<Member user={user} />} />
        <Route path="/my-ticket" element={<MyTicket user={user} />} />
        <Route path="/ticket-detail" element={<TicketDetail />} />
        <Route path="/screening-selection" element={<ScreeningSelectionPage />} />
        <Route path="/seat-selection" element={<SeatPage />} />
        <Route path="/add-promotion-checkout" element={<AddPromotionCheckoutPage />} />
        <Route path="/checkout-payment" element={<CheckoutPaymentPage />} />
        <Route path="/booking-modal" element={<BookingModalPage />} />

        <Route element={<BrowseLayout user={user} />}>
          <Route path="/promotion" element={<Promotion user={user} />} />
          <Route path="/search-results" element={<SearchResultsPage user={user} />} />
          <Route path="/movies" element={<SearchResultsPage user={user} />} />
          <Route path="/upcoming" element={<UpcomingPage user={user} />} />
        </Route>

        <Route path="/new-popular" element={<NewPopularPage user={user} />} />

        {/* Auth routes with shared FloatingLines background */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email-waiting" element={<VerifyEmailWaiting />} />
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

  useEffect(() => {
    let cancelled = false;

    const preloadHomeData = async () => {
      try {
        const lang = getSavedLanguage();
        await fetchHomeData(lang, HOME_PRELOAD_GENRES);
      } catch (error) {
        if (!cancelled) {
          console.error('Home preload failed:', error);
        }
      }
    };

    preloadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BrowserRouter>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      {splashDone && <AnimatedRoutes user={user} />}
    </BrowserRouter>
  );
}

export default App;
