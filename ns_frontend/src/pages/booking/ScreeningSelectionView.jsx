import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import MainNavbar from '../../components/navigation/MainNavbar';
import Counter from '../../components/ui/Counter';
import Stepper, { Step } from '../../components/ui/Stepper';
import { AnimatePresence, motion } from 'framer-motion';
import CheckoutPaymentSection from '../../components/booking/CheckoutPaymentSection';
import { paymentApi } from '../../services/paymentApi';
import { MAIN_API_BASE } from '../../config/runtime';
import majorLogo from '../../assets/logo/Major.png';
import sfLogo from '../../assets/logo/SF.png';
import './ScreeningSelectionView.css';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const LOCATION_CACHE_KEY = 'nextseat_location_search_cache';
const PROMO_ORDER_CACHE_KEY = 'nextseat_promo_order_cache';
const BOOKING_FLOW_STEPS = ['Screening Selection', 'Seat Selection', 'Add Promotion (Optional)', 'Checkout'];
const BOOKING_WINDOW_MS = 10 * 60 * 1000;
const TICKET_PRICE_THB = 1;
const PROMO_IMAGE_MAP = import.meta.glob('../../assets/promotion/*', { eager: true, import: 'default' });
const PROMOS = [
  { id: 1, name: 'IMAX Combo Set', detail: 'Popcorn + 2 Drinks', price: 299, image: '/promotion/promo-imax-detail.png' },
  { id: 2, name: 'Pepsi Magic Tumbler', detail: 'Tumbler + Popcorn', price: 299, image: '/promotion/promo-pepsi.png' },
  { id: 3, name: 'SpongeBob Tintub Set', detail: 'Tintub + Drink', price: 399, image: '/promotion/promo-spongebob.png' },
  { id: 4, name: 'Supersize Set', detail: 'Large Popcorn + 2 Drinks', price: 340, image: '/promotion/promo-badguys.png' },
  { id: 5, name: 'Pokémon Movie Set', detail: 'Poké Ball Set', price: 590, image: '/promotion/promo-pokemon.png' },
  { id: 6, name: 'Year-End Couple Set', detail: '2 Popcorn + 2 Drinks', price: 350, image: '/promotion/promo-yearend-couple.png' },
];

function getPromoOrderCache() {
  try {
    const raw = sessionStorage.getItem(PROMO_ORDER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setPromoOrderCache(cache) {
  try {
    sessionStorage.setItem(PROMO_ORDER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

function resolvePromoImage(pathLike) {
  const fileName = String(pathLike || '').split('/').pop();
  if (!fileName) return '';
  const exactKey = `../../assets/promotion/${fileName}`;
  return PROMO_IMAGE_MAP[exactKey] || '';
}

function setLocationSearchCache(payload) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function resolvePosterUrl(path) {
  if (!path) return '';
  if (String(path).startsWith('http://') || String(path).startsWith('https://')) {
    return path;
  }
  return `${IMG_BASE}${path}`;
}

function resolveCinemaLogo(cinemaOrName) {
  // Accept either a cinema object {chain, name, nameEn, ...} or a plain string name
  if (cinemaOrName && typeof cinemaOrName === 'object') {
    const chain = String(cinemaOrName.chain || '').toLowerCase();
    if (chain === 'major') return majorLogo;
    if (chain === 'sf') return sfLogo;
    // Fallback: try to match from the name for legacy data
    return resolveCinemaLogo(cinemaOrName.name || cinemaOrName.nameEn || '');
  }
  // String path: keyword match
  const n = String(cinemaOrName || '').toLowerCase();
  if (n.includes('major') || n.includes('เมเจอร์')) return majorLogo;
  if (n.includes('sf') || n.includes('เอส เอฟ') || n.includes('เอสเอฟ') ||
    n.includes('sfx') || n.includes('esplanade')) return sfLogo;
  return '';
}

function toDateKey(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeKey(date) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildAutoShowtimeIso(dayOffset, hour, minute = 0) {
  const dt = new Date();
  dt.setHours(hour, minute, 0, 0);
  dt.setDate(dt.getDate() + dayOffset);
  return dt.toISOString();
}

function formatRuntimeLabel(runtimeMin, isThai) {
  if (!Number.isFinite(runtimeMin) || runtimeMin <= 0) return isThai ? '-' : '-';
  const h = Math.floor(runtimeMin / 60);
  const m = runtimeMin % 60;
  if (isThai) return `${h} ชม. ${m} นาที`;
  return `${h}h ${m}m`;
}

export default function ScreeningSelectionPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { lang: appLang, isThai } = useAppLanguage(state?.lang);
  const dateLocale = isThai ? 'th-TH' : 'en-GB';
  const timeLocale = isThai ? 'th-TH' : 'en-US';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screenings, setScreenings] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedScreeningId, setSelectedScreeningId] = useState('');
  const [currentStep, setCurrentStep] = useState(Number(state?.resumeStep) === 2 ? 2 : 1);
  const [stepTransitionDirection, setStepTransitionDirection] = useState(1);
  const [proceeding, setProceeding] = useState(false);

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [coords, setCoords] = useState(null);
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [selectedCinema, setSelectedCinema] = useState('');
  const [pendingCinema, setPendingCinema] = useState('');
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [keepSearchingMode, setKeepSearchingMode] = useState(false);
  const [movieRuntimeMin, setMovieRuntimeMin] = useState(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [seatRows, setSeatRows] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [heldSeats, setHeldSeats] = useState([]);
  const [bookingScreeningId, setBookingScreeningId] = useState('');
  const [bookingDeadlineAt, setBookingDeadlineAt] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoCounts, setPromoCounts] = useState({});
  const [promoCacheReady, setPromoCacheReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentTab, setPaymentTab] = useState('qr');
  const [qrCode, setQrCode] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState(false);
  const [pendingTicket, setPendingTicket] = useState(null);
  const searchBoxRef = useRef(null);
  const expiredReleaseRef = useRef(false);
  const prevStepRef = useRef(Number(state?.resumeStep) === 2 ? 2 : 1);
  const heldSeatsRef = useRef([]);
  const bookingScreeningIdRef = useRef('');
  const seatsKey = useMemo(
    () => [...selectedSeats].sort().join('|'),
    [selectedSeats],
  );
  const promoOrderKey = useMemo(
    () => `${String(bookingScreeningId || 'na')}::${String(state?.movieId || 'na')}::${seatsKey}`,
    [bookingScreeningId, state?.movieId, seatsKey],
  );

  useEffect(() => {
    heldSeatsRef.current = heldSeats;
  }, [heldSeats]);

  useEffect(() => {
    bookingScreeningIdRef.current = bookingScreeningId;
  }, [bookingScreeningId]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setLoading(true);
        setError('');
        const uid = auth.currentUser?.uid;
        if (!uid) {
          navigate('/login');
          return;
        }

        const targetMovieId = Number(state?.movieId);
        let byMovie = [];
        if (Number.isFinite(targetMovieId)) {
          const showtimesRes = await axios.get(`${API_BASE}/cinemas/movies/${targetMovieId}/showtimes`);
          const cinemaGroups = Array.isArray(showtimesRes?.data?.data?.cinemas) ? showtimesRes.data.data.cinemas : [];
          byMovie = cinemaGroups.flatMap((group, cinemaIndex) => {
            const cinemaName = group?.cinema?.nameEn || group?.cinema?.nameTh || '';
            const cinemaId = group?.cinema?.id || `cinema-${cinemaIndex}`;
            const showtimes = Array.isArray(group?.showtimes) ? group.showtimes : [];
            return showtimes.map((st, stIndex) => ({
              _id: String(st?._id || `${cinemaId}-${String(st?.showtime || '')}-${stIndex}`),
              movieId: Number(st?.movieId || targetMovieId),
              movieTitle: st?.movieTitle || state?.movieTitle || 'Movie',
              posterPath: st?.posterPath || state?.posterPath || '',
              theater: st?.hall || 'HALL A',
              showtime: st?.showtime || buildAutoShowtimeIso(0, 14, 0),
              price: TICKET_PRICE_THB,
              cinemaId,
              cinemaName,
            }));
          });
        }

        // Fallback to legacy screenings endpoint when cinema service has no data for this movie.
        if (byMovie.length === 0) {
          const legacyRes = await axios.get(`${API_BASE}/screenings`);
          const legacyAll = Array.isArray(legacyRes.data) ? legacyRes.data : [];
          let legacyByMovie = Number.isFinite(targetMovieId)
            ? legacyAll.filter((s) => Number(s.movieId) === targetMovieId)
            : [];

          if (legacyByMovie.length === 0 && Number.isFinite(targetMovieId) && state?.movieTitle) {
            const templates = [0, 1, 2, 3, 4].flatMap((dayOffset) => ([
              { dayOffset, hour: 14, minute: 0, price: 1 },
              { dayOffset, hour: 19, minute: 0, price: 1 },
            ]));

            await Promise.all(
              templates.map((t, idx) =>
                axios.post(`${API_BASE}/screenings`, {
                  movieId: targetMovieId,
                  movieTitle: state.movieTitle,
                  posterPath: state?.posterPath || '',
                  theater: `HALL ${String.fromCharCode(65 + idx)}`,
                  showtime: buildAutoShowtimeIso(t.dayOffset, t.hour, t.minute),
                  price: t.price,
                  rows: 8,
                  seatsPerRow: 12,
                }),
              ),
            );

            const refreshRes = await axios.get(`${API_BASE}/screenings`);
            const refreshedAll = Array.isArray(refreshRes.data) ? refreshRes.data : [];
            legacyByMovie = refreshedAll.filter((s) => Number(s.movieId) === targetMovieId);
          }

          byMovie = legacyByMovie.map((s) => ({
            ...s,
            price: TICKET_PRICE_THB,
            cinemaId: '',
            cinemaName: '',
          }));
        }

        if (byMovie.length === 0) throw new Error('No screenings');

        if (!mounted) return;
        setScreenings(byMovie);
      } catch {
        if (!mounted) return;
        setError(isThai ? 'ไม่พบรอบฉายสำหรับหนังเรื่องนี้' : 'No screenings found for this movie.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [navigate, state?.movieId]);

  useEffect(() => {
    if (!bookingDeadlineAt) {
      setRemainingSeconds(null);
      return undefined;
    }
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.parse(bookingDeadlineAt) - Date.now()) / 1000));
      setRemainingSeconds(sec);
      if (sec <= 0) {
        setSeatError(isThai ? 'หมดเวลาการจอง กรุณาเลือกรอบและที่นั่งใหม่' : 'Booking time expired. Please select screening and seats again.');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bookingDeadlineAt, isThai]);

  useEffect(() => {
    const prev = prevStepRef.current;
    if (currentStep === prev) return;
    setStepTransitionDirection(currentStep > prev ? 1 : -1);
    prevStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds > 0) {
      expiredReleaseRef.current = false;
      return;
    }
    if (expiredReleaseRef.current) return;
    expiredReleaseRef.current = true;

    const expireBooking = async () => {
      const uid = auth.currentUser?.uid;
      if (uid && bookingScreeningId && heldSeats.length > 0) {
        try {
          await axios.post(`${API_BASE}/bookings/release`, {
            screeningId: bookingScreeningId,
            seats: heldSeats,
            userId: uid,
          });
        } catch {
          // best effort release only
        }
      }

      const cache = getPromoOrderCache();
      delete cache[promoOrderKey];
      setPromoOrderCache(cache);
      setPromoCounts({});
      setSelectedSeats([]);
      setHeldSeats([]);
      setSeatRows([]);
      setBookingScreeningId('');
      setCurrentStep(1);
      setSeatError(isThai ? 'หมดเวลาการจอง ระบบยกเลิกออเดอร์นี้แล้ว' : 'Booking expired. This order has been cancelled.');
    };

    expireBooking();
  }, [remainingSeconds, bookingScreeningId, heldSeats, promoOrderKey, isThai]);

  useEffect(() => {
    document.body.style.overflow = (placeModalOpen || promoModalOpen) ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [placeModalOpen, promoModalOpen]);

  useEffect(() => () => {
    const uid = auth.currentUser?.uid;
    const screeningId = bookingScreeningIdRef.current;
    const seats = normalizeSeatList(heldSeatsRef.current);
    if (!uid || !screeningId || seats.length === 0) return;
    axios.post(`${API_BASE}/bookings/release`, {
      screeningId,
      seats,
      userId: uid,
    }).catch(() => {
      // best effort release only
    });
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target)) {
        setShowPlaceSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (placeModalOpen) {
      setShowPlaceSuggestions(false);
    }
  }, [placeModalOpen]);

  const hasCinemaName = useMemo(
    () => screenings.some((s) => String(s.cinemaName || '').trim().length > 0),
    [screenings],
  );
  const screeningsByTheater = useMemo(
    () => (selectedCinema && hasCinemaName ? screenings.filter((s) => String(s.cinemaName || '') === String(selectedCinema)) : screenings),
    [screenings, selectedCinema, hasCinemaName],
  );
  const dateOptions = useMemo(() => {
    const unique = new Map();
    for (const s of screeningsByTheater) {
      const key = toDateKey(s.showtime);
      if (!unique.has(key)) unique.set(key, new Date(s.showtime));
    }
    return [...unique.entries()].map(([key, dt]) => ({ key, dt }));
  }, [screeningsByTheater]);

  useEffect(() => {
    setSelectedDateKey((prev) => (dateOptions.some((d) => d.key === prev) ? prev : ''));
  }, [dateOptions]);

  useEffect(() => {
    if (hasCinemaName && !selectedCinema) {
      setSelectedDateKey('');
      setSelectedScreeningId('');
    }
  }, [hasCinemaName, selectedCinema]);

  // Restore timeOptions useMemo
  const timeOptions = useMemo(() => {
    if (!selectedDateKey) return [];
    const byDate = screeningsByTheater.filter((s) => toDateKey(s.showtime) === selectedDateKey);
    const uniqueTimes = new Map();
    for (const screening of byDate) {
      const timeKey = toTimeKey(screening.showtime);
      if (!uniqueTimes.has(timeKey)) uniqueTimes.set(timeKey, screening);
    }
    return [...uniqueTimes.values()];
  }, [screeningsByTheater, selectedDateKey]);

  // Keep selected time only when it is still valid for the selected date.
  const effectiveScreeningId = useMemo(() => {
    const stillValid = timeOptions.some((s) => s._id === selectedScreeningId);
    return stillValid ? selectedScreeningId : '';
  }, [timeOptions, selectedScreeningId]);

  const selectedScreening = useMemo(
    () => screenings.find((s) => s._id === effectiveScreeningId) || null,
    [screenings, effectiveScreeningId],
  );
  const countdownText = useMemo(() => {
    if (currentStep < 2 || remainingSeconds === null) return '';
    const sec = Math.max(0, Number(remainingSeconds) || 0);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [currentStep, remainingSeconds]);
  const countdownExpired = remainingSeconds !== null && remainingSeconds <= 0;

  const pageTitle = 'Theater';
  const chosenTitle = state?.movieTitle || selectedScreening?.movieTitle || 'Movie';
  const chosenPosterPath = state?.posterPath || selectedScreening?.posterPath || '';
  const chosenMovieId = Number(state?.movieId || selectedScreening?.movieId);

  useEffect(() => {
    let mounted = true;
    const fetchRuntime = async () => {
      if (!Number.isFinite(chosenMovieId)) {
        setMovieRuntimeMin(null);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/movies/${chosenMovieId}`);
        const runtime = Number(res?.data?.runtime);
        if (!mounted) return;
        setMovieRuntimeMin(Number.isFinite(runtime) && runtime > 0 ? runtime : null);
      } catch {
        if (mounted) setMovieRuntimeMin(null);
      }
    };
    fetchRuntime();
    return () => {
      mounted = false;
    };
  }, [chosenMovieId]);

  const searchNearbyCinemas = async (opts = {}, config = { keepSearchingOnEmpty: false }) => {
    let notFoundTimer = null;
    let keepWaitingForTimeout = false;
    let nextResults = [];
    try {
      setPlaceModalOpen(true);
      setPlaceLoading(true);
      setPlaceError('');
      setSearchNotFound(false);
      // Clear previous result set so stale data does not hide "Not found"
      setPlaceResults([]);
      if (!config.keepSearchingOnEmpty) {
        notFoundTimer = setTimeout(() => {
          setSearchNotFound(true);
          setPlaceLoading(false);
        }, 10000);
      }
      const params = {};
      if (opts.lat && opts.lon) {
        params.lat = opts.lat;
        params.lon = opts.lon;
      }
      if (opts.query) params.query = String(opts.query).trim();
      const res = await axios.get(`${API_BASE}/places/cinemas`, { params });
      nextResults = Array.isArray(res.data) ? res.data : [];
      setPlaceResults(nextResults);
      if (nextResults.length > 0) {
        if (notFoundTimer) clearTimeout(notFoundTimer);
        setSearchNotFound(false);
        setPlaceLoading(false);
      } else {
        if (config.keepSearchingOnEmpty) {
          // For "Use My Location", keep showing "Searching..." until data appears.
          keepWaitingForTimeout = true;
        } else {
          // Keep showing "Searching..." until timeout reaches 10s.
          keepWaitingForTimeout = true;
        }
      }
      setLocationSearchCache({
        query: String(opts.query || placeQuery || '').trim(),
        coords: opts.lat && opts.lon ? { lat: opts.lat, lon: opts.lon } : coords,
        results: nextResults,
      });
    } catch (err) {
      if (notFoundTimer) clearTimeout(notFoundTimer);
      const apiMessage = err?.response?.data?.message;
      setPlaceError(typeof apiMessage === 'string' ? apiMessage : (isThai ? 'ค้นหาโรงหนังไม่สำเร็จ' : 'Failed to search cinemas.'));
      setPlaceLoading(false);
    } finally {
      if (!keepWaitingForTimeout && notFoundTimer) clearTimeout(notFoundTimer);
      if (!keepWaitingForTimeout) setPlaceLoading(false);
      if (config.keepSearchingOnEmpty && nextResults.length === 0) {
        setSearchNotFound(false);
        setPlaceLoading(true);
      }
    }
  };

  useEffect(() => {
    const q = placeQuery.trim();
    if (!q) {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const params = { query: q };
        if (coords?.lat && coords?.lon) {
          params.lat = coords.lat;
          params.lon = coords.lon;
        }
        const res = await axios.get(`${API_BASE}/places/cinemas`, { params });
        const list = Array.isArray(res.data) ? res.data : [];
        setPlaceSuggestions(list.slice(0, 6));
        setShowPlaceSuggestions(true);
      } catch {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [placeQuery, coords]);

  const handleUseMyLocation = () => {
    setKeepSearchingMode(true);
    setPendingCinema(selectedCinema || '');
    setPlaceModalOpen(true);
    if (!navigator.geolocation) {
      setPlaceError(isThai ? 'เบราว์เซอร์ไม่รองรับตำแหน่ง' : 'Your browser does not support geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(next);
        setLocationSearchCache({
          query: placeQuery.trim(),
          coords: next,
          results: placeResults,
        });
        searchNearbyCinemas(next, { keepSearchingOnEmpty: true });
      },
      () => setPlaceError(isThai ? 'ไม่สามารถดึงตำแหน่งปัจจุบันได้' : 'Unable to get your current location.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const executePlaceSearch = (queryOverride) => {
    setKeepSearchingMode(false);
    const q = String(queryOverride ?? placeQuery).trim();
    setShowPlaceSuggestions(false);
    setLocationSearchCache({
      query: q,
      coords,
      results: placeResults,
    });
    setPendingCinema(selectedCinema || '');
    setPlaceModalOpen(true);
    searchNearbyCinemas({ ...(coords || {}), query: q || (isThai ? 'โรงภาพยนตร์' : 'cinema') }, { keepSearchingOnEmpty: false });
  };

  const handleSearch = () => {
    setKeepSearchingMode(false);
    setPendingCinema(selectedCinema || '');
    setPlaceError('');
    setSearchNotFound(false);
    setShowPlaceSuggestions(false);
    setPlaceModalOpen(true);
  };

  const ensureBookingScreeningId = async (selected) => {
    const listRes = await axios.get(`${API_BASE}/screenings`);
    const all = Array.isArray(listRes.data) ? listRes.data : [];
    const selectedIso = new Date(selected.showtime).toISOString();
    const matched = all.find((s) =>
      Number(s.movieId) === Number(selected.movieId)
      && String(s.theater) === String(selected.theater)
      && Number(s.price) === TICKET_PRICE_THB
      && new Date(s.showtime).toISOString() === selectedIso);
    if (matched?._id) return matched._id;

    const createRes = await axios.post(`${API_BASE}/screenings`, {
      movieId: Number(selected.movieId),
      movieTitle: selected.movieTitle || chosenTitle,
      posterPath: selected.posterPath || chosenPosterPath,
      theater: selected.theater || 'HALL A',
      showtime: new Date(selected.showtime).toISOString(),
      price: TICKET_PRICE_THB,
      rows: 8,
      seatsPerRow: 12,
    });
    const createdId = createRes?.data?._id;
    if (!createdId) throw new Error('Create screening failed');
    return createdId;
  };

  const loadSeatMap = async (screeningId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      navigate('/login');
      return;
    }
    setSeatLoading(true);
    setSeatError('');
    try {
      const seatMapRes = await axios.get(`${API_BASE}/screenings/${screeningId}/seat-map`, { params: { userId: uid } });
      const nextRows = Array.isArray(seatMapRes.data?.seats) ? seatMapRes.data.seats : [];
      setSeatRows(nextRows);
      const heldByMe = nextRows
        .flatMap((row) => (Array.isArray(row) ? row : []))
        .filter((seat) => seat?.status === 'held' && seat?.heldByCurrentUser)
        .map((seat) => seat.label);
      setHeldSeats(normalizeSeatList(heldByMe));
    } catch {
      setSeatError(isThai ? 'โหลดที่นั่งไม่สำเร็จ' : 'Failed to load seat map.');
    } finally {
      setSeatLoading(false);
    }
  };

  function normalizeSeatList(seats) {
    return [...new Set((Array.isArray(seats) ? seats : []).map((s) => String(s).trim()).filter(Boolean))].sort();
  }

  const releaseHeldSeats = async (seatsToRelease = heldSeatsRef.current) => {
    const uid = auth.currentUser?.uid;
    const screeningId = bookingScreeningIdRef.current;
    const seats = normalizeSeatList(seatsToRelease);
    if (!uid || !screeningId || seats.length === 0) return;
    await axios.post(`${API_BASE}/bookings/release`, {
      screeningId,
      seats,
      userId: uid,
    });
  };

  const syncSeatHold = async (targetSeats = selectedSeats) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      navigate('/login');
      return false;
    }
    if (!bookingScreeningId) return false;

    const desired = normalizeSeatList(targetSeats);
    if (desired.length === 0) {
      setSeatError(isThai ? 'กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง' : 'Please select at least one seat.');
      return false;
    }

    const currentlyHeld = normalizeSeatList(heldSeatsRef.current);
    const desiredSet = new Set(desired);
    const heldSet = new Set(currentlyHeld);
    const toRelease = currentlyHeld.filter((s) => !desiredSet.has(s));
    const toHold = desired.filter((s) => !heldSet.has(s));

    try {
      if (toRelease.length > 0) {
        await axios.post(`${API_BASE}/bookings/release`, {
          screeningId: bookingScreeningId,
          seats: toRelease,
          userId: uid,
        });
      }

      if (toHold.length > 0) {
        const holdRes = await axios.post(`${API_BASE}/bookings/hold`, {
          screeningId: bookingScreeningId,
          seats: toHold,
          userId: uid,
        });
        const expireAt = holdRes?.data?.expireAt;
        if (expireAt) {
          const parsed = Date.parse(String(expireAt));
          if (!Number.isNaN(parsed)) {
            setBookingDeadlineAt(new Date(parsed).toISOString());
          }
        }
      }

      setHeldSeats(desired);
      setSeatError('');
      await loadSeatMap(bookingScreeningId);
      return true;
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setSeatError(
        typeof apiMessage === 'string'
          ? apiMessage
          : (isThai ? 'ไม่สามารถ hold ที่นั่งได้ กรุณาลองใหม่' : 'Unable to hold seats. Please try again.'),
      );
      await loadSeatMap(bookingScreeningId);
      return false;
    }
  };

  const goToSeatSelection = async () => {
    if (hasCinemaName && !selectedCinema) return;
    if (!effectiveScreeningId || proceeding) return;
    const selected = screenings.find((s) => String(s._id) === String(effectiveScreeningId));
    if (!selected) return;
    try {
      setProceeding(true);
      const bookingScreeningId = await ensureBookingScreeningId(selected);
      setBookingScreeningId(bookingScreeningId);
      setSelectedSeats([]);
      setHeldSeats([]);
      setBookingDeadlineAt(new Date(Date.now() + BOOKING_WINDOW_MS).toISOString());
      await loadSeatMap(bookingScreeningId);
      setCurrentStep(2);
    } catch {
      setError(isThai ? 'เตรียมรอบฉายไม่สำเร็จ' : 'Unable to prepare screening for booking.');
    } finally {
      setProceeding(false);
    }
  };

  const toggleSeat = (seat) => {
    if (!seat) return;
    const blocked = seat.status === 'booked' || (seat.status === 'held' && !seat.heldByCurrentUser);
    if (blocked) return;
    const label = seat.label;
    setSelectedSeats((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
  };

  const continueToPromotion = async () => {
    if (!bookingScreeningId || selectedSeats.length === 0 || !selectedScreening || (remainingSeconds !== null && remainingSeconds <= 0)) return;
    const synced = await syncSeatHold(selectedSeats);
    if (!synced) return;
    setCurrentStep(3);
  };

  const changePromoQty = (promoId, delta) => {
    setPromoCounts((prev) => {
      const current = Number(prev[promoId] || 0);
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [promoId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [promoId]: next };
    });
  };

  const continueToPayment = () => {
    setCurrentStep(4);
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        try {
          await releaseHeldSeats();
        } catch {
          // best effort release only
        }
        setHeldSeats([]);
        setSelectedSeats([]);
        setSeatRows([]);
        setBookingScreeningId('');
        setBookingDeadlineAt('');
        setSeatError('');
      }
      setCurrentStep((prev) => Math.max(1, prev - 1));
      return;
    }
    navigate(-1);
  };

  const handleConfirmPayment = async () => {
    try {
      if (!bookingScreeningId || !auth.currentUser?.uid) return;
      if (!paymentVerified) {
        setSeatError(isThai ? 'กรุณายืนยันการชำระเงินก่อน' : 'Please verify payment first.');
        return;
      }
      if (remainingSeconds !== null && remainingSeconds <= 0) {
        setSeatError(isThai ? 'หมดเวลาการจอง กรุณาเลือกที่นั่งใหม่' : 'Booking time expired. Please select seats again.');
        return;
      }
      setPaying(true);
      const res = await axios.post(`${API_BASE}/bookings/checkout`, {
        screeningId: bookingScreeningId,
        userId: auth.currentUser.uid,
        selectedCinema: effectiveCinemaName || undefined,
        selectedPromotions,
        paymentMethod: paymentTab === 'bank' ? 'bank_transfer' : 'promptpay',
      });
      const created = res.data;
      const cache = getPromoOrderCache();
      delete cache[promoOrderKey];
      setPromoOrderCache(cache);
      setHeldSeats([]);
      const ticket = {
        bookingId: created?._id || `NST-${Date.now()}`,
        date: summaryDate ? summaryDate.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        title: chosenTitle,
        seats: created?.seats || selectedSeats,
        time: selectedScreening ? new Date(selectedScreening.showtime).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' }) : '-',
        cinema: created?.selectedCinema || effectiveCinemaName || '-',
        duration: runtimeLabel,
      };
      setPendingTicket(ticket);
      setPaymentSuccessPopup(true);
    } catch {
      setSeatError(isThai ? 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่' : 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (!paymentSuccessPopup || !pendingTicket) return undefined;
    const timer = setTimeout(() => {
      setPaymentSuccessPopup(false);
      navigate('/ticket-detail', { state: { ticket: pendingTicket } });
    }, 1200);
    return () => clearTimeout(timer);
  }, [paymentSuccessPopup, pendingTicket, navigate]);

  const handleGenerateQR = async () => {
    try {
      if (!bookingScreeningId) return;
      setLoadingQR(true);
      let orderId = String(paymentOrderId || '').trim();
      if (!orderId) {
        const user = auth.currentUser;
        const payload = {
          userId: user?.uid || undefined,
          customerName: user?.displayName || user?.email || 'Guest',
          customerEmail: user?.email || undefined,
          customerPhone: user?.phoneNumber || '-',
          items: [
            {
              productId: String(bookingScreeningId),
              name: `${chosenTitle} (${selectedSeats.join(', ') || 'Seat'})`,
              price: Number(grandTotal || 0),
              quantity: 1,
            },
          ],
          shippingInfo: {
            name: user?.displayName || user?.email || 'Guest',
            phone: user?.phoneNumber || '-',
            address: 'Movie Ticket',
            city: 'Bangkok',
            postalCode: '00000',
          },
          paymentMethod: paymentTab === 'bank' ? 'transfer' : 'promptpay',
          subtotal: Number(grandTotal || 0),
          shippingFee: 0,
          total: Number(grandTotal || 0),
          notes: `screening:${bookingScreeningId}`,
        };
        const orderResp = await paymentApi.createOrder(payload);
        const createdOrderId = orderResp?.data?.orderId;
        if (!orderResp?.success || !createdOrderId) {
          throw new Error(orderResp?.message || 'Unable to create payment order');
        }
        orderId = String(createdOrderId);
        setPaymentOrderId(orderId);
      }

      const response = await paymentApi.generateQR(orderId, grandTotal);
      if (!response?.success || !response?.data?.qrCodeDataURL) {
        throw new Error(response?.message || 'Unable to generate QR');
      }
      setQrCode(response.data);
    } catch (error) {
      const message = String(
        error?.message
        || error?.response?.data?.message
        || (isThai ? 'สร้าง QR ไม่สำเร็จ' : 'Failed to generate QR code.'),
      );
      setSeatError(message);
    } finally {
      setLoadingQR(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const restoreSeatStep = async () => {
      if (Number(state?.resumeStep) !== 2) return;
      if (!state?.resumeScreeningId) return;
      setBookingScreeningId(String(state.resumeScreeningId));
      setCurrentStep(2);
      setSelectedSeats(Array.isArray(state?.resumeSelectedSeats) ? state.resumeSelectedSeats : []);
      if (state?.resumeBookingDeadlineAt) {
        setBookingDeadlineAt(String(state.resumeBookingDeadlineAt));
      } else {
        setBookingDeadlineAt(new Date(Date.now() + BOOKING_WINDOW_MS).toISOString());
      }
      setSeatLoading(true);
      setSeatError('');
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const seatMapRes = await axios.get(`${API_BASE}/screenings/${state.resumeScreeningId}/seat-map`, { params: { userId: uid } });
        if (!mounted) return;
        const nextRows = Array.isArray(seatMapRes.data?.seats) ? seatMapRes.data.seats : [];
        setSeatRows(nextRows);
        const heldByMe = nextRows
          .flatMap((row) => (Array.isArray(row) ? row : []))
          .filter((seat) => seat?.status === 'held' && seat?.heldByCurrentUser)
          .map((seat) => seat.label);
        setHeldSeats(normalizeSeatList(heldByMe));
      } catch {
        if (mounted) setSeatError(isThai ? 'โหลดที่นั่งไม่สำเร็จ' : 'Failed to load seat map.');
      } finally {
        if (mounted) setSeatLoading(false);
      }
    };
    restoreSeatStep();
    return () => {
      mounted = false;
    };
  }, [state?.resumeStep, state?.resumeScreeningId, state?.resumeSelectedSeats, state?.resumeBookingDeadlineAt, isThai]);

  useEffect(() => {
    const cache = getPromoOrderCache();
    const cachedCounts = cache?.[promoOrderKey];
    if (cachedCounts && typeof cachedCounts === 'object') {
      setPromoCounts(cachedCounts);
      setPromoCacheReady(true);
      return;
    }
    setPromoCounts({});
    setPromoCacheReady(true);
  }, [promoOrderKey]);

  useEffect(() => {
    if (!promoCacheReady) return;
    const cache = getPromoOrderCache();
    if (!promoOrderKey) return;
    if (Object.keys(promoCounts).length === 0) {
      delete cache[promoOrderKey];
      setPromoOrderCache(cache);
      return;
    }
    cache[promoOrderKey] = promoCounts;
    setPromoOrderCache(cache);
  }, [promoCacheReady, promoOrderKey, promoCounts]);

  const summaryDate = selectedScreening
    ? new Date(selectedScreening.showtime)
    : (selectedDateKey ? new Date(`${selectedDateKey}T00:00:00`) : null);
  const summaryDateParts = summaryDate
    ? {
      day: summaryDate.getDate(),
      monthText: summaryDate.toLocaleDateString(dateLocale, { month: 'long' }),
      year: summaryDate.getFullYear(),
    }
    : null;
  const summaryTimeParts = selectedScreening
    ? {
      hour12: new Date(selectedScreening.showtime).getHours() % 12 || 12,
      minute: new Date(selectedScreening.showtime).getMinutes(),
      meridiem: new Date(selectedScreening.showtime).getHours() >= 12 ? 'PM' : 'AM',
    }
    : null;
  const effectiveCinemaName = selectedCinema || '';
  const selectedCinemaLogo = resolveCinemaLogo(effectiveCinemaName);
  const canProceed = Boolean(effectiveScreeningId) && !proceeding && (!hasCinemaName || Boolean(selectedCinema));
  const canPickSchedule = !hasCinemaName || Boolean(selectedCinema);
  const runtimeLabel = formatRuntimeLabel(movieRuntimeMin, isThai);
  const selectedSeatCount = selectedSeats.length;
  const totalSeatPrice = selectedSeatCount * TICKET_PRICE_THB;
  const displaySeatRows = [...seatRows].reverse();
  const selectedPromotions = useMemo(
    () =>
      PROMOS
        .map((p) => ({ ...p, qty: Number(promoCounts[p.id] || 0) }))
        .filter((p) => p.qty > 0),
    [promoCounts],
  );
  const promoTotal = selectedPromotions.reduce((sum, p) => sum + (p.price * p.qty), 0);
  const grandTotal = totalSeatPrice + promoTotal;
  const promoMoneyPlaces = useMemo(() => {
    const integerPart = Math.floor(Math.max(0, Number(promoTotal) || 0));
    const digitCount = Math.max(1, String(integerPart).length);
    const places = [];
    for (let i = digitCount - 1; i >= 0; i -= 1) {
      places.push(10 ** i);
    }
    return [...places, '.', 0.1, 0.01];
  }, [promoTotal]);
  const promoSummaryText = selectedPromotions.length > 0
    ? selectedPromotions.map((p) => `${p.name} x${p.qty}`).join(', ')
    : (isThai ? 'ยังไม่เลือก' : 'Not selected');
  const promoDetailLines = selectedPromotions.map((p) => `${p.name} x${p.qty}`);
  useEffect(() => {
    setPaymentVerified(false);
    setQrCode(null);
    setPaymentOrderId('');
  }, [bookingScreeningId, grandTotal]);
  const searchingTextStyle = { color: '#bbb', margin: 0, animation: 'nsSearchingBlink 1s ease-in-out infinite' };
  const sectionCardStyle = {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.28)',
    padding: '12px 14px',
  };
  const stepPageVariants = {
    enter: (dir) => ({
      x: dir >= 0 ? 48 : -48,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir >= 0 ? -48 : 48,
      opacity: 0,
    }),
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050505', color: '#fff' }}>{isThai ? 'กำลังโหลดรอบฉาย...' : 'Loading screenings...'}</div>;
  if (error) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050505', color: '#fff' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100dvh', overflowY: 'auto', overflowX: 'hidden', background: 'radial-gradient(ellipse at 15% 90%, #6e2800 0%, #200b00 30%, #040808 60%)', color: '#fff', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes nsSearchingBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes nsSearchOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nsSearchModalPopIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nsFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nsCinemaPickPulse {
          0% { transform: scale(1); }
          55% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        @media (max-width: 780px) {
          .screening-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <MainNavbar active="home" />

      {/* ── Page wrapper ── */}
      <div className="screening-layout-root" style={{ maxWidth: 1100, margin: '72px auto 0', padding: '12px 24px 16px', display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }}>

        {/* ── Top row: back + stepper (sticky) ── */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderBottom: 'none',
          padding: '10px 24px',
          margin: '0 -24px',
        }}>
          <button
            onClick={handleBack}
            className="ss-back-btn"
            style={{ background: 'transparent', border: '1px solid #3a3a3a', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 4 }}
          >
            ← {isThai ? 'กลับ' : 'Back'}
          </button>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <Stepper
              className="booking-inline-stepper"
              currentStep={currentStep}
              initialStep={currentStep}
              disableStepIndicators
              stepCircleContainerClassName="booking-stepper-shell"
              stepContainerClassName="booking-stepper-row"
              contentClassName="booking-stepper-content"
              footerClassName="booking-stepper-footer"
              renderStepIndicator={({ step }) => {
                const isActive = step === currentStep;
                const isComplete = step < currentStep;
                return (
                  <div className="booking-stepper-item">
                    <div className={`booking-stepper-circle${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`}>{step}</div>
                    <span className={`booking-stepper-label${isActive ? ' active' : ''}`}>{BOOKING_FLOW_STEPS[step - 1]}</span>
                  </div>
                );
              }}
            >
              {BOOKING_FLOW_STEPS.map((label) => (
                <Step key={label}>
                  <div className="booking-stepper-copy">
                    <p className="booking-stepper-copy-step">{label}</p>
                    <p className="booking-stepper-copy-meta">
                      {label === 'Screening Selection' && 'Choose cinema location and showtime'}
                      {label === 'Seat Selection' && 'Choose your seats'}
                      {label === 'Add Promotion (Optional)' && 'Select add-on promotion'}
                      {label === 'Checkout' && 'Review and complete payment'}
                    </p>
                  </div>
                </Step>
              ))}
            </Stepper>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={stepTransitionDirection}>
          <motion.div
            key={`flow-step-${currentStep}`}
            custom={stepTransitionDirection}
            variants={stepPageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: 'easeOut' }}
          >
        {currentStep === 1 ? (
          <>
            {/* ── Two-column main grid ── */}
            <div
              className="screening-main-grid"
              style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start', overflow: 'hidden' }}
            >
          {/* ── LEFT: Location / Date / Time ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Location search */}
            <section
              className="ss-card"
              style={{
                ...sectionCardStyle,
                position: 'relative',
                zIndex: 30,
              }}
            >
              <h2 className="ss-page-title" style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px', letterSpacing: 0.3 }}>{pageTitle}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleUseMyLocation}
                  className="ss-loc-btn"
                  style={{ border: '1px solid #3f3f3f', background: 'transparent', color: '#ddd', borderRadius: 999, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
                >
                  {isThai ? ' ใช้ตำแหน่งของฉัน' : ' Use My Location'}
                </button>
                <div ref={searchBoxRef} style={{ flex: '1 1 160px', minWidth: 160, position: 'relative', zIndex: 2000 }}>
                  <input
                    className="screening-search-input"
                    value={placeQuery}
                    onChange={(e) => {
                      setPlaceQuery(e.target.value);
                      setShowPlaceSuggestions(true);
                    }}
                    onFocus={() => {
                      if (placeSuggestions.length > 0) setShowPlaceSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder={isThai ? 'ค้นหาโรงหนัง...' : 'Search cinema...'}
                    style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #2f2f2f', borderRadius: 999, padding: '8px 14px', fontSize: 13, outline: 'none' }}
                  />
                  {showPlaceSuggestions && placeSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        zIndex: 2200,
                        border: '1px solid #2a2a2a',
                        borderRadius: 12,
                        background: '#111317',
                        boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                        overflow: 'hidden',
                      }}
                    >
                      {placeSuggestions.map((p, idx) => {
                        const label = String(p?.name || '').trim();
                        const address = String(p?.address || '').trim();
                        return (
                          <button
                            key={`${label}-${idx}`}
                            onClick={() => {
                              setPlaceQuery(label);
                              setShowPlaceSuggestions(false);
                              executePlaceSearch(label);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              borderBottom: idx < placeSuggestions.length - 1 ? '1px solid #24262b' : 'none',
                              background: '#111317',
                              color: '#fff',
                              cursor: 'pointer',
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                            {address && <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 2 }}>{address}</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleSearch();
                  }}
                  className="ss-search-btn"
                  style={{ background: '#f06a00', border: 'none', color: '#fff', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                  {isThai ? 'ค้นหา' : 'Search'}
                </button>
              </div>
            </section>

            {/* Date */}
            <section className="ss-card" style={{ ...sectionCardStyle, position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: '#777', margin: '0 0 12px' }}>
                {isThai ? 'วันที่' : 'Date'}
              </h3>
              {!canPickSchedule && (
                <p style={{ margin: '0 0 10px', color: '#8a8a8a', fontSize: 12 }}>
                  {isThai ? 'กรุณาเลือกโรงหนังก่อน' : 'Please select a cinema first'}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dateOptions.map((d) => {
                  const active = selectedDateKey === d.key;
                  return (
                    <button
                      key={d.key}
                      className={`ss-date-btn${active ? ' active' : ''}`}
                      onClick={() => {
                        if (!canPickSchedule) return;
                        setSelectedDateKey(d.key);
                        setSelectedScreeningId('');
                      }}
                      disabled={!canPickSchedule}
                      style={{
                        minWidth: 66,
                        border: `1px solid ${active ? '#ff8a1f' : '#333'}`,
                        background: active ? 'rgba(255,122,0,0.15)' : 'rgba(255,255,255,0.03)',
                        color: !canPickSchedule ? '#666' : (active ? '#ffb870' : '#bbb'),
                        opacity: canPickSchedule ? 1 : 0.45,
                        borderRadius: 10,
                        padding: '9px 6px',
                        cursor: canPickSchedule ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span style={{ fontSize: 10, color: active ? '#ffb870' : '#777' }}>
                        {d.dt.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {d.dt.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Time */}
            <section className="ss-card" style={{ ...sectionCardStyle, position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: '#777', margin: '0 0 12px' }}>
                {isThai ? 'เวลา' : 'Time'}
              </h3>
              <div key={selectedDateKey} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', animation: 'nsFadeIn 0.15s ease-out' }}>
                {timeOptions.map((s) => {
                  const active = effectiveScreeningId === s._id;
                  return (
                    <button
                      key={s._id}
                      className={`ss-time-btn${active ? ' active' : ''}`}
                      onClick={() => {
                        if (!canPickSchedule) return;
                        setSelectedScreeningId(s._id);
                      }}
                      disabled={!canPickSchedule}
                      style={{
                        border: `1px solid ${active ? '#ff8a1f' : '#333'}`,
                        background: active ? 'rgba(255,122,0,0.15)' : 'rgba(255,255,255,0.03)',
                        color: !canPickSchedule ? '#666' : (active ? '#ffb870' : '#bbb'),
                        opacity: canPickSchedule ? 1 : 0.45,
                        borderRadius: 999,
                        padding: '9px 20px',
                        cursor: canPickSchedule ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        fontWeight: active ? 700 : 400,
                      }}
                    >
                      {new Date(s.showtime).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ── RIGHT: Movie info + Booking summary ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Movie poster + title */}
            <div className="ss-card" style={{ ...sectionCardStyle, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <img
                src={resolvePosterUrl(chosenPosterPath) || 'https://via.placeholder.com/260x390?text=No+Poster'}
                alt={chosenTitle || 'poster'}
                className="ss-movie-poster"
                style={{ width: 96, height: 144, objectFit: 'cover', borderRadius: 10, flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}
              />
              <div style={{ minWidth: 0, paddingTop: 2 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, lineHeight: 1.35, fontWeight: 700 }}>{chosenTitle}</h4>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🕐</span>
                  <span>{isThai ? `ความยาว: ${runtimeLabel}` : `Duration: ${runtimeLabel}`}</span>
                </div>
              </div>
            </div>

            {/* Booking summary */}
            <div className="ss-card" style={sectionCardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: '#777', margin: '0 0 14px' }}>
                {isThai ? 'สรุปการจอง' : 'Summary'}
              </h3>

              {/* Cinema */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                {selectedCinemaLogo && (
                  <img
                    src={selectedCinemaLogo}
                    alt="cinema chain logo"
                    style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
                  />
                )}
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {effectiveCinemaName || (isThai ? 'ยังไม่เลือกโรงหนัง' : 'No cinema selected')}
                </span>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />

              {/* Date row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#666', fontSize: 12, minWidth: 44 }}>{isThai ? 'วันที่' : 'Date'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ddd' }}>
                  {summaryDateParts ? (
                    <>
                      <Counter
                        value={summaryDateParts.day}
                        places={[10, 1]}
                        fontSize={18}
                        padding={2}
                        gap={1}
                        horizontalPadding={0}
                        borderRadius={0}
                        textColor="#fff"
                        fontWeight={700}
                        gradientHeight={6}
                        gradientFrom="rgba(0,0,0,0.28)"
                        gradientTo="transparent"
                      />
                      <span style={{ fontSize: 14 }}>{summaryDateParts.monthText}</span>
                      <Counter
                        value={summaryDateParts.year}
                        places={[1000, 100, 10, 1]}
                        fontSize={18}
                        padding={2}
                        gap={1}
                        horizontalPadding={0}
                        borderRadius={0}
                        textColor="#fff"
                        fontWeight={700}
                        gradientHeight={6}
                        gradientFrom="rgba(0,0,0,0.28)"
                        gradientTo="transparent"
                      />
                    </>
                  ) : <span style={{ color: '#444' }}>—</span>}
                </div>
              </div>

              {/* Time row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ color: '#666', fontSize: 12, minWidth: 44 }}>{isThai ? 'เวลา' : 'Time'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ddd' }}>
                  {summaryTimeParts ? (
                    <>
                      <Counter
                        value={summaryTimeParts.hour12}
                        places={[10, 1]}
                        fontSize={18}
                        padding={2}
                        gap={1}
                        horizontalPadding={0}
                        borderRadius={0}
                        textColor="#fff"
                        fontWeight={700}
                        gradientHeight={6}
                        gradientFrom="rgba(0,0,0,0.28)"
                        gradientTo="transparent"
                      />
                      <span style={{ fontSize: 14 }}>:</span>
                      <Counter
                        value={summaryTimeParts.minute}
                        places={[10, 1]}
                        fontSize={18}
                        padding={2}
                        gap={1}
                        horizontalPadding={0}
                        borderRadius={0}
                        textColor="#fff"
                        fontWeight={700}
                        gradientHeight={6}
                        gradientFrom="rgba(0,0,0,0.28)"
                        gradientTo="transparent"
                      />
                      <span style={{ fontSize: 13, marginLeft: 3, color: '#ffb870', fontWeight: 600 }}>{summaryTimeParts.meridiem}</span>
                    </>
                  ) : <span style={{ color: '#444' }}>—</span>}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />

              <p style={{ margin: '0 0 12px', color: '#555', fontSize: 11 }}>
                *{isThai ? 'เลือกที่นั่งในขั้นตอนถัดไป' : 'Seat selection in the next step'}
              </p>
              <button
                onClick={goToSeatSelection}
                disabled={!canProceed}
                className="ss-proceed-btn"
                style={{
                  width: '100%',
                  background: canProceed ? '#f06a00' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: canProceed ? '#fff' : '#444',
                  borderRadius: 10,
                  padding: '12px',
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: 0.3,
                }}
              >
                {proceeding
                  ? (isThai ? 'กำลังดำเนินการ...' : 'Processing...')
                  : (isThai ? 'ดำเนินการต่อ →' : 'Proceed →')}
              </button>
            </div>
          </div>
            </div>
          </>
        ) : currentStep === 2 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, minHeight: 0, overflow: 'hidden' }}>
            <section className="ss-card" style={{ ...sectionCardStyle, display: 'flex', flexDirection: 'column', minHeight: 0, alignItems: 'center' }}>
              {/* Curved screen indicator */}
              <div style={{ width: '100%', textAlign: 'center', marginBottom: 16, paddingTop: 2 }}>
                <svg width="100%" height="28" viewBox="0 0 400 28" preserveAspectRatio="none" style={{ display: 'block', marginBottom: 4 }}>
                  <defs>
                    <linearGradient id="screenLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(240,106,0,0)" />
                      <stop offset="20%" stopColor="#f06a00" />
                      <stop offset="50%" stopColor="#ffb870" />
                      <stop offset="80%" stopColor="#f06a00" />
                      <stop offset="100%" stopColor="rgba(240,106,0,0)" />
                    </linearGradient>
                    <filter id="screenGlow" x="-20%" y="-100%" width="140%" height="400%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <path d="M 10 24 Q 200 4 390 24" stroke="url(#screenLineGrad)" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#screenGlow)" />
                </svg>
                <span style={{ fontSize: 11, letterSpacing: 5, color: '#ffb870', fontWeight: 600, textTransform: 'uppercase', opacity: 0.85 }}>SCREEN</span>
              </div>

              {seatLoading ? (
                <p style={{ margin: 0, color: '#999' }}>{isThai ? 'กำลังโหลดที่นั่ง...' : 'Loading seats...'}</p>
              ) : seatError ? (
                <p style={{ margin: 0, color: '#ff9b9b' }}>{seatError}</p>
              ) : (
                <div className="ss-seat-scroll" style={{ overflowY: 'auto', paddingRight: 4, width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    {displaySeatRows.map((row, idx) => {
                      const rowLabel = row[0]?.row || '-';
                      const isCouple = rowLabel.length > 1;
                      const isVIP = ['A', 'B'].includes(rowLabel);
                      const seatW = isCouple ? 50 : isVIP ? 28 : 22;
                      const seatH = isCouple ? 22 : isVIP ? 24 : 20;
                      const backH = isCouple ? 11 : isVIP ? 13 : 10;
                      const armW = isCouple ? 5 : 4;
                      const armY = isCouple ? 7 : isVIP ? 9 : 7;
                      const armH = isCouple ? 12 : isVIP ? 12 : 10;
                      const cushH = isCouple ? 9 : isVIP ? 9 : 8;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 26, textAlign: 'center', fontSize: 13, color: '#aaa', fontWeight: 600, flexShrink: 0 }}>{rowLabel}</span>
                          <div style={{ display: 'flex', gap: isCouple ? 6 : 5, alignItems: 'center' }}>
                            {row.map((seat, seatIdx) => {
                              const selected = selectedSeats.includes(seat.label);
                              const blocked = seat.status === 'booked' || (seat.status === 'held' && !seat.heldByCurrentUser);
                              const seatColor = blocked ? '#3b3b3b' : selected ? '#ff8a1f' : '#bf1d00';
                              const seatStroke = blocked ? '#4a4a4a' : selected ? '#ffaa5c' : '#d42200';
                              const isAisleBreak = (seatIdx + 1) % 2 === 0 && seatIdx !== row.length - 1;
                              return (
                                <button
                                  key={seat.label}
                                  className="ss-seat-btn"
                                  onClick={() => toggleSeat(seat)}
                                  title={seat.label}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: blocked ? 'not-allowed' : 'pointer',
                                    opacity: blocked ? 0.45 : 1,
                                    padding: 0,
                                    display: 'block',
                                    marginRight: isAisleBreak ? 12 : 0,
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg width={seatW} height={seatH} viewBox={`0 0 ${seatW} ${seatH}`} style={{ display: 'block' }}>
                                    {/* Backrest */}
                                    <rect x={armW} y={1} width={seatW - armW * 2} height={backH} rx={3} fill={seatColor} stroke={seatStroke} strokeWidth={0.5} />
                                    {/* Left armrest */}
                                    <rect x={0} y={armY} width={armW} height={armH} rx={2} fill={seatColor} />
                                    {/* Right armrest */}
                                    <rect x={seatW - armW} y={armY} width={armW} height={armH} rx={2} fill={seatColor} />
                                    {/* Seat cushion */}
                                    <rect x={armW - 1} y={backH + 2} width={seatW - (armW - 1) * 2} height={cushH} rx={2} fill={seatColor} opacity={0.7} />
                                    {/* Selected check mark */}
                                    {selected && !blocked && (
                                      <>
                                        <circle cx={seatW / 2} cy={seatH / 2} r={5.5} fill="#14b85a" />
                                        <polyline
                                          points={`${seatW/2 - 3},${seatH/2 + 0.5} ${seatW/2 - 0.5},${seatH/2 + 3} ${seatW/2 + 3.5},${seatH/2 - 2.5}`}
                                          fill="none"
                                          stroke="#fff"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </>
                                    )}
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                          <span style={{ width: 26, textAlign: 'center', fontSize: 13, color: '#aaa', fontWeight: 600, flexShrink: 0 }}>{rowLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: '#aaa', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 6 }}>
                    {[
                      { color: '#bf1d00', stroke: '#d42200', label: isThai ? 'ว่าง' : 'Available' },
                      { color: '#ff8a1f', stroke: '#ffaa5c', label: isThai ? 'เลือกแล้ว' : 'Selected', mark: '✓' },
                      { color: '#3b3b3b', stroke: '#4a4a4a', label: isThai ? 'จองแล้ว' : 'Occupied' },
                    ].map(({ color, stroke, label, mark }) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="18" height="15" viewBox="0 0 22 20" style={{ display: 'block' }}>
                          <rect x={4} y={1} width={14} height={10} rx={3} fill={color} stroke={stroke} strokeWidth={0.5} />
                          <rect x={0} y={7} width={4} height={10} rx={2} fill={color} />
                          <rect x={18} y={7} width={4} height={10} rx={2} fill={color} />
                          <rect x={3} y={11} width={16} height={8} rx={2} fill={color} opacity={0.7} />
                        </svg>
                        <span>{label}</span>
                        {mark && <span style={{ color: '#ffb870', fontWeight: 800 }}>{mark}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="ss-card" style={{ ...sectionCardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: '#ddd' }}>{isThai ? 'สรุปที่นั่ง' : 'Seat Summary'}</h3>
              {countdownText && (
                <div style={{ border: `1px solid ${countdownExpired ? '#6a2a2a' : '#3a2a12'}`, borderRadius: 10, padding: 10, background: countdownExpired ? 'rgba(120,30,30,0.18)' : 'rgba(240,106,0,0.12)' }}>
                  <div style={{ color: '#bdbdbd', fontSize: 12 }}>{isThai ? 'เวลาที่เหลือในการจอง' : 'Booking time left'}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, letterSpacing: 1, color: countdownExpired ? '#ff9b9b' : '#ffb870' }}>{countdownText}</div>
                </div>
              )}
              <div style={{ fontSize: 13, color: '#aaa' }}>
                <div>{isThai ? 'ที่นั่งที่เลือก' : 'Selected Seats'}: {selectedSeats.length > 0 ? selectedSeats.join(', ') : '-'}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{isThai ? 'จำนวน' : 'Count'}:</span>
                  <Counter value={selectedSeatCount} fontSize={18} padding={2} gap={1} horizontalPadding={2} borderRadius={4} textColor="#fff" fontWeight={700} gradientHeight={8} gradientFrom="rgba(0,0,0,0.35)" gradientTo="transparent" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Total THB</span>
                  <Counter value={totalSeatPrice} fontSize={20} padding={2} gap={1} horizontalPadding={2} borderRadius={4} textColor="#fff" fontWeight={800} gradientHeight={8} gradientFrom="rgba(0,0,0,0.35)" gradientTo="transparent" />
                </div>
              </div>

              <button
                onClick={continueToPromotion}
                disabled={selectedSeatCount === 0 || !bookingScreeningId || (remainingSeconds !== null && remainingSeconds <= 0)}
                className="ss-proceed-btn"
                style={{
                  marginTop: 'auto',
                  width: '100%',
                  background: selectedSeatCount > 0 && (remainingSeconds === null || remainingSeconds > 0) ? '#f06a00' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: selectedSeatCount > 0 && (remainingSeconds === null || remainingSeconds > 0) ? '#fff' : '#444',
                  borderRadius: 10,
                  padding: '12px',
                  cursor: selectedSeatCount > 0 && (remainingSeconds === null || remainingSeconds > 0) ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {isThai ? 'ไปขั้นตอนถัดไป →' : 'Continue →'}
              </button>
            </section>
          </div>
        ) : currentStep === 3 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16, minHeight: 0, overflow: 'hidden' }}>
            <section className="ss-card" style={{ ...sectionCardStyle, minHeight: 0, overflow: 'auto' }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'ที่นั่งที่เลือก' : 'Selected seats'}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedSeats.join(', ') || '-'}</div>
              </div>
              <div style={{ marginTop: 10, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'โปรโมชันที่เลือก' : 'Selected promotions'}</div>
                <div style={{ marginTop: 6, fontSize: 13 }}>{promoSummaryText}</div>
              </div>
              <h3 style={{ margin: '16px 0 0', fontSize: 18, color: '#fff' }}>{isThai ? 'เพิ่มโปรโมชัน (ไม่บังคับ)' : 'Add Promotion (Optional)'}</h3>
              <p style={{ margin: '8px 0 14px', color: '#adadad', fontSize: 13 }}>
                {isThai ? 'เลือกโปรโมชันเพิ่มได้ หรือข้ามไปหน้าชำระเงิน' : 'Add combos if needed, or continue to payment.'}
              </p>
              <button
                onClick={() => setPromoModalOpen(true)}
                className="ss-add-promo-btn"
                style={{ background: 'transparent', border: '1px solid #e8650a', color: '#ffab6f', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}
              >
                {isThai ? 'เพิ่ม Promotion' : 'Add Promotion'}
              </button>
            </section>
            <section className="ss-card" style={{ ...sectionCardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: '#ddd' }}>{isThai ? 'สรุปราคา' : 'Price Summary'}</h3>
              {countdownText && (
                <div style={{ border: `1px solid ${countdownExpired ? '#6a2a2a' : '#3a2a12'}`, borderRadius: 10, padding: 10, background: countdownExpired ? 'rgba(120,30,30,0.18)' : 'rgba(240,106,0,0.12)' }}>
                  <div style={{ color: '#bdbdbd', fontSize: 12 }}>{isThai ? 'เวลาที่เหลือในการจอง' : 'Booking time left'}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, letterSpacing: 1, color: countdownExpired ? '#ff9b9b' : '#ffb870' }}>{countdownText}</div>
                </div>
              )}
              <div style={{ fontSize: 13, color: '#aaa' }}>
                <div>{isThai ? 'ค่าที่นั่ง' : 'Seat total'}: THB {totalSeatPrice.toFixed(2)}</div>
                <div style={{ marginTop: 6 }}>{isThai ? 'โปรโมชัน' : 'Promotion'}: THB {promoTotal.toFixed(2)}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#ffb870', fontWeight: 700 }}>{isThai ? 'รวมทั้งหมด' : 'Grand Total'}:</span>
                  <Counter value={grandTotal} fontSize={20} padding={2} gap={1} horizontalPadding={2} borderRadius={4} textColor="#ffb870" fontWeight={800} gradientHeight={8} gradientFrom="rgba(0,0,0,0.35)" gradientTo="transparent" />
                </div>
              </div>
              <button
                onClick={continueToPayment}
                disabled={!bookingScreeningId || selectedSeatCount === 0}
                className="ss-proceed-btn"
                style={{
                  marginTop: 'auto',
                  width: '100%',
                  background: bookingScreeningId && selectedSeatCount > 0 ? '#f06a00' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: bookingScreeningId && selectedSeatCount > 0 ? '#fff' : '#444',
                  borderRadius: 10,
                  padding: '12px',
                  cursor: bookingScreeningId && selectedSeatCount > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {isThai ? 'ไปขั้นตอนชำระเงิน →' : 'Continue to Payment →'}
              </button>
            </section>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16, minHeight: 0, overflow: 'hidden' }}>
            <section className="ss-card" style={{ ...sectionCardStyle, display: 'grid', gap: 10, alignContent: 'start' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{isThai ? 'ชำระเงิน' : 'Checkout & Payment'}</h3>
              <CheckoutPaymentSection
                paymentTab={paymentTab}
                onPaymentTabChange={(tab) => {
                  setPaymentTab(tab);
                  setPaymentVerified(false);
                  setSeatError('');
                }}
                qrCode={qrCode}
                loadingQR={loadingQR}
                total={grandTotal}
                orderId={paymentOrderId}
                paymentVerified={paymentVerified}
                onGenerateQR={handleGenerateQR}
                onPaymentVerified={() => {
                  setPaymentVerified(true);
                  setSeatError('');
                }}
              />
            </section>
            <section className="ss-card" style={{ ...sectionCardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: '#ddd' }}>{isThai ? 'รายละเอียดการจอง' : 'Checkout Detail'}</h3>
              {countdownText && (
                <div style={{ border: `1px solid ${countdownExpired ? '#6a2a2a' : '#3a2a12'}`, borderRadius: 10, padding: 10, background: countdownExpired ? 'rgba(120,30,30,0.18)' : 'rgba(240,106,0,0.12)' }}>
                  <div style={{ color: '#bdbdbd', fontSize: 12 }}>{isThai ? 'เวลาที่เหลือในการจอง' : 'Booking time left'}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, letterSpacing: 1, color: countdownExpired ? '#ff9b9b' : '#ffb870' }}>{countdownText}</div>
                </div>
              )}
              <div style={{ border: '1px solid #2e2e2e', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.26)' }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'หนัง' : 'Movie'}</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{chosenTitle}</div>
              </div>
              <div style={{ border: '1px solid #2e2e2e', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.26)' }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'โรง/เวลา' : 'Cinema/Time'}</div>
                <div style={{ marginTop: 4 }}>{effectiveCinemaName || '-'}</div>
                <div style={{ marginTop: 4 }}>{selectedScreening ? new Date(selectedScreening.showtime).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
              </div>
              <div style={{ border: '1px solid #2e2e2e', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.26)' }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'ที่นั่ง' : 'Seats'}</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedSeats.join(', ') || '-'}</div>
              </div>
              <div style={{ border: '1px solid #2e2e2e', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.26)' }}>
                <div style={{ color: '#a9a9a9', fontSize: 12 }}>{isThai ? 'โปรโมชั่น' : 'Promotion'}</div>
                {promoDetailLines.length === 0 ? (
                  <div style={{ marginTop: 4 }}>{isThai ? 'ยังไม่เลือก' : 'Not selected'}</div>
                ) : (
                  <div
                    style={{
                      marginTop: 4,
                      display: 'grid',
                      gap: 4,
                      maxHeight: promoDetailLines.length > 3 ? 84 : 'none',
                      overflowY: promoDetailLines.length > 3 ? 'auto' : 'visible',
                      paddingRight: promoDetailLines.length > 3 ? 4 : 0,
                    }}
                  >
                    {promoDetailLines.map((line, idx) => (
                      <div key={`${line}-${idx}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: 14, color: '#ddd' }}>{isThai ? 'ยอดชำระ' : 'Payment Total'}</h3>
              <div style={{ fontSize: 13, color: '#aaa' }}>
                <div>{isThai ? 'ค่าที่นั่ง' : 'Seats'}: THB {totalSeatPrice.toFixed(2)}</div>
                <div style={{ marginTop: 6 }}>{isThai ? 'โปรโมชัน' : 'Promotion'}: THB {promoTotal.toFixed(2)}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#ffb870', fontWeight: 700 }}>{isThai ? 'รวมทั้งหมด' : 'Grand Total'}:</span>
                  <Counter value={grandTotal} fontSize={20} padding={2} gap={1} horizontalPadding={2} borderRadius={4} textColor="#ffb870" fontWeight={800} gradientHeight={8} gradientFrom="rgba(0,0,0,0.35)" gradientTo="transparent" />
                </div>
              </div>
              {seatError && <div style={{ color: '#ff9b9b', fontSize: 13 }}>{seatError}</div>}
              <button
                onClick={handleConfirmPayment}
                disabled={paying || !!seatError || (remainingSeconds !== null && remainingSeconds <= 0) || !paymentVerified}
                className="ss-proceed-btn"
                style={{
                  marginTop: 'auto',
                  width: '100%',
                  background: !paying && !seatError && (remainingSeconds === null || remainingSeconds > 0) && paymentVerified ? '#f06a00' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: !paying && !seatError && (remainingSeconds === null || remainingSeconds > 0) && paymentVerified ? '#fff' : '#444',
                  borderRadius: 10,
                  padding: '12px',
                  cursor: !paying && !seatError && (remainingSeconds === null || remainingSeconds > 0) && paymentVerified ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {paying ? (isThai ? 'กำลังชำระเงิน...' : 'Processing payment...') : (isThai ? 'ยืนยันและชำระเงิน' : 'Confirm & Pay')}
              </button>
            </section>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {placeModalOpen && (
        <div onClick={() => setPlaceModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 1200, padding: 16, animation: 'nsSearchOverlayFadeIn 0.2s ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 96vw)', maxHeight: '78vh', background: '#131313', border: '1px solid #2c2c2c', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 70px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', animation: 'nsSearchModalPopIn 0.24s cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #2b2b2b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{isThai ? 'ผลการค้นหาโรงหนัง' : 'Cinema search results'}</strong>
              <button onClick={() => setPlaceModalOpen(false)} style={{ background: 'transparent', border: '1px solid #444', color: '#ddd', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>{isThai ? 'ปิด' : 'Close'}</button>
            </div>
            {!keepSearchingMode && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #2b2b2b', display: 'flex', gap: 8 }}>
                <input
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executePlaceSearch();
                    }
                  }}
                  placeholder={isThai ? 'ค้นหาโรงหนังใน popup...' : 'Search cinema in popup...'}
                  style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #2f2f2f', borderRadius: 999, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={() => executePlaceSearch()}
                  style={{ background: '#f06a00', border: 'none', color: '#fff', borderRadius: 999, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                  {isThai ? 'ค้นหา' : 'Search'}
                </button>
              </div>
            )}
            <div style={{ padding: 14, overflowY: 'auto' }}>
              {placeLoading && <p style={searchingTextStyle}>{isThai ? 'กำลังค้นหา...' : 'Searching...'}</p>}
              {placeError && <p style={{ color: '#ff9b9b', margin: 0 }}>{placeError}</p>}
              {!keepSearchingMode && !placeLoading && !placeError && searchNotFound && placeResults.length === 0 && (
                <p style={{ color: '#ffb3b3', margin: 0 }}>{isThai ? 'ไม่พบโรงภาพยนตร์' : 'Not found'}</p>
              )}
              {!placeLoading && !placeError && !searchNotFound && placeResults.length === 0 && <p style={{ ...searchingTextStyle, color: '#999' }}>{isThai ? 'กำลังค้นหา...' : 'Searching...'}</p>}
              {placeResults.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {placeResults.map((p, idx) => (
                    <button
                      key={`${p.id || p.name}_${idx}`}
                      className="ss-cinema-result-btn"
                      onClick={() => {
                        const name = p.name || '';
                        setPendingCinema((prev) => (prev === name ? '' : name));
                      }}
                      style={{
                        border: pendingCinema === (p.name || '') ? '1px solid #ff8a1f' : '1px solid #2a2a2a',
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: pendingCinema === (p.name || '') ? 'rgba(255,138,31,0.15)' : 'rgba(255,255,255,0.02)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#fff',
                        transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
                        transform: pendingCinema === (p.name || '') ? 'translateY(-1px)' : 'translateY(0)',
                        boxShadow: pendingCinema === (p.name || '') ? '0 10px 24px rgba(240,106,0,0.16)' : 'none',
                        animation: pendingCinema === (p.name || '') ? 'nsCinemaPickPulse 0.24s ease-out' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {resolveCinemaLogo(p) && (
                          <img
                            src={resolveCinemaLogo(p)}
                            alt="cinema chain logo"
                            style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.06)', padding: 4, flex: '0 0 auto' }}
                          />
                        )}
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                      </div>
                      <div style={{ color: '#aaa', marginTop: 4, fontSize: 13 }}>{p.address || '-'}</div>
                      {Number.isFinite(p.distance) && p.distance > 0 && (
                        <div style={{ color: '#e6a365', marginTop: 4, fontSize: 12 }}>{isThai ? `ระยะทางประมาณ ${(p.distance / 1000).toFixed(1)} กม.` : `About ${(p.distance / 1000).toFixed(1)} km`}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #2b2b2b', padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setPlaceModalOpen(false)} style={{ background: 'transparent', border: '1px solid #444', color: '#ddd', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setSelectedCinema((prev) => (prev === pendingCinema ? '' : pendingCinema));
                  setPlaceModalOpen(false);
                }}
                style={{ background: '#f06a00', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700 }}
              >
                {isThai ? 'ตกลง' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {promoModalOpen && (
          <div
            onClick={() => setPromoModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', zIndex: 1300, padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(760px, 96vw)', maxHeight: '80vh', background: '#131313', border: '1px solid #2c2c2c', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #2b2b2b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{isThai ? 'เลือกโปรโมชั่น' : 'Select promotion'}</strong>
                <button onClick={() => setPromoModalOpen(false)} style={{ background: 'transparent', border: '1px solid #444', color: '#ddd', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>{isThai ? 'ปิด' : 'Close'}</button>
              </div>
              <div style={{ padding: 14, overflowY: 'auto', display: 'grid', gap: 8 }}>
                {PROMOS.map((promo) => {
                  const qty = Number(promoCounts[promo.id] || 0);
                  const active = qty > 0;
                  return (
                    <div
                      key={promo.id}
                      style={{
                        border: active ? '1px solid #ff8a1f' : '1px solid #2a2a2a',
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: active ? 'rgba(255,138,31,0.15)' : 'rgba(255,255,255,0.02)',
                        color: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                          <img
                            src={resolvePromoImage(promo.image) || promo.image}
                            alt={promo.name}
                            style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{promo.name}</div>
                            <div style={{ marginTop: 2, fontSize: 12, color: '#bdbdbd' }}>{promo.detail}</div>
                            <div style={{ marginTop: 4, fontSize: 13, color: '#ffb870' }}>THB {promo.price}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="ss-qty-btn" onClick={() => changePromoQty(promo.id, -1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #444', background: '#191919', color: '#fff', cursor: 'pointer' }}>-</button>
                          <Counter value={qty} fontSize={18} padding={2} gap={1} horizontalPadding={2} borderRadius={4} textColor="#fff" fontWeight={700} gradientHeight={8} gradientFrom="rgba(0,0,0,0.35)" gradientTo="transparent" />
                          <button className="ss-qty-btn" onClick={() => changePromoQty(promo.id, 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #f06a00', background: 'rgba(240,106,0,0.14)', color: '#fff', cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: '1px solid #2b2b2b', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ color: '#ffb870', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span>{isThai ? 'รวมโปรโมชัน' : 'Promo Total'}: THB</span>
                  <Counter
                    value={promoTotal}
                    places={promoMoneyPlaces}
                    fontSize={24}
                    padding={2}
                    gap={1}
                    horizontalPadding={2}
                    borderRadius={4}
                    textColor="#ffb870"
                    fontWeight={800}
                    gradientHeight={8}
                    gradientFrom="rgba(0,0,0,0.35)"
                    gradientTo="transparent"
                  />
                </div>
                <button onClick={() => setPromoModalOpen(false)} style={{ background: '#f06a00', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700 }}>
                  {isThai ? 'เสร็จสิ้น' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentSuccessPopup && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.72)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1400,
              padding: 16,
            }}
          >
            <div
              style={{
                width: 'min(420px, 92vw)',
                background: '#151515',
                border: '1px solid #2e2e2e',
                borderRadius: 16,
                padding: '22px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ width: 54, height: 54, borderRadius: 999, margin: '0 auto 10px', background: '#18a957', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 }}>✓</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 20 }}>{isThai ? 'ชำระเงินสำเร็จ' : 'Payment Successful'}</h3>
              <p style={{ margin: 0, color: '#bdbdbd', fontSize: 13 }}>
                {isThai ? 'กำลังนำคุณไปยังหน้าตั๋ว...' : 'Redirecting to your ticket...'}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
