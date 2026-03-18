import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BookingModal from '../../components/booking/BookingModal';
import { auth } from '../../firebase';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import { MAIN_API_BASE } from '../../config/runtime';

const API_BASE = MAIN_API_BASE;

function normalizeSeatLabel(seat) {
  if (!seat || typeof seat !== 'string') return '';
  const trimmed = seat.trim().toUpperCase();
  if (trimmed.includes('-')) return trimmed;
  const match = trimmed.match(/^([A-Z]+)(\d+)$/);
  if (!match) return trimmed;
  return `${match[1]}-${match[2]}`;
}

export default function BookingModalPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { lang: appLang, isThai } = useAppLanguage(state?.lang);
  const dateLocale = isThai ? 'th-TH' : 'en-GB';
  const timeLocale = isThai ? 'th-TH' : 'en-US';
  const [booking, setBooking] = useState({
    theater: 'NextSeat Cinema',
    dateIndex: 0,
    time: '19:00',
    movieTitle: state?.movieTitle || 'Movie',
    dateText: '-',
    posterPath: state?.posterPath || '',
  });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [total, setTotal] = useState('0.00');
  const [screeningId, setScreeningId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCinema, setSelectedCinema] = useState(state?.selectedCinema || '');

  const releasedRef = useRef(false);
  const checkedOutRef = useRef(false);
  const seatsRef = useRef([]);
  const screeningRef = useRef('');
  const userRef = useRef('');

  useEffect(() => {
    seatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    screeningRef.current = screeningId;
  }, [screeningId]);

  useEffect(() => {
    userRef.current = userId;
  }, [userId]);

  const releaseHolds = useCallback(async () => {
    if (releasedRef.current || checkedOutRef.current) return;
    if (!screeningRef.current || !userRef.current || seatsRef.current.length === 0) return;
    releasedRef.current = true;
    try {
      await axios.post(`${API_BASE}/bookings/release`, {
        screeningId: screeningRef.current,
        seats: seatsRef.current,
        userId: userRef.current,
      });
    } catch (_err) {
      // ignore release failures on leave
    }
  }, []);

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
        if (!mounted) return;
        setUserId(uid);

        const screeningsRes = await axios.get(`${API_BASE}/screenings`);
        const screenings = Array.isArray(screeningsRes.data) ? screeningsRes.data : [];
        if (screenings.length === 0) {
          throw new Error('No screenings available');
        }

        const targetMovieId = Number(state?.movieId);
        const selectedScreening = screenings.find((s) => s._id === state?.screeningId)
          || (Number.isFinite(targetMovieId)
            ? screenings.find((s) => Number(s.movieId) === targetMovieId)
            : undefined)
          || null;

        if (!selectedScreening) {
          throw new Error('No matching screening');
        }

        if (Number.isFinite(targetMovieId) && Number(selectedScreening.movieId) !== targetMovieId) {
          throw new Error('Screening movie mismatch');
        }

        const sid = selectedScreening._id;
        if (!mounted) return;
        setScreeningId(sid);

        const seatMapRes = await axios.get(`${API_BASE}/screenings/${sid}/seat-map`, {
          params: { userId: uid },
        });

        const seatRows = seatMapRes.data?.seats || [];
        const requestedSeats = Array.isArray(state?.selectedSeats)
          ? state.selectedSeats.map(normalizeSeatLabel).filter(Boolean)
          : [];

        const availableSet = new Set(
          seatRows.flat().filter((seat) => seat.status === 'available').map((seat) => seat.label),
        );

        if (requestedSeats.length === 0) {
          throw new Error('No selected seats');
        }

        const seatsToHold = requestedSeats.filter((seat) => availableSet.has(seat));
        if (seatsToHold.length !== requestedSeats.length) {
          throw new Error('Selected seats unavailable');
        }

        try {
          await axios.post(`${API_BASE}/bookings/hold`, {
            screeningId: sid,
            seats: seatsToHold,
            userId: uid,
          });
        } catch (_conflict) {
          throw new Error('Selected seats unavailable');
        }

        const showtime = new Date(selectedScreening.showtime);
        const time = showtime.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });
        const dateText = showtime.toLocaleDateString(dateLocale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const totalPrice = (seatsToHold.length * Number(selectedScreening.price || 0)).toFixed(2);

        if (!mounted) return;
        setSelectedSeats(seatsToHold);
        setTotal(totalPrice);
        setBooking({
          theater: selectedCinema || selectedScreening.theater,
          dateIndex: 0,
          time,
          movieTitle: state?.movieTitle || selectedScreening.movieTitle || 'Movie',
          dateText,
          posterPath: state?.posterPath || selectedScreening.posterPath || '',
        });
      } catch (err) {
        if (!mounted) return;
        const msg = String(err?.message || '');
        if (msg === 'Selected seats unavailable') {
          setError(isThai ? 'ที่นั่งที่เลือกไม่ว่างแล้ว กรุณากลับไปเลือกใหม่' : 'Your selected seats are no longer available. Please go back and choose again.');
        } else if (msg === 'No selected seats') {
          setError(isThai ? 'ไม่พบที่นั่งที่เลือก กรุณากลับไปเลือกที่นั่ง' : 'No selected seats found. Please go back and select seats.');
        } else {
          setError(isThai ? 'ไม่สามารถเริ่มการจองได้ กรุณาลองใหม่' : 'Unable to start booking. Please try again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      releaseHolds();
    };
  }, [dateLocale, isThai, navigate, releaseHolds, state, timeLocale]);

  const handleClose = async () => {
    await releaseHolds();
    navigate('/add-promotion-checkout', {
      state: {
        ...state,
        lang: appLang,
      },
    });
  };

  const handleConfirm = async () => {
    try {
      const res = await axios.post(`${API_BASE}/bookings/checkout`, {
        screeningId,
        userId,
        selectedCinema: selectedCinema || undefined,
      });
      checkedOutRef.current = true;

      const created = res.data;
      const ticket = {
        bookingId: created?._id || `NST-${Date.now()}`,
        date: booking.dateText,
        title: booking.movieTitle,
        seats: created?.seats || selectedSeats,
        time: booking.time,
        cinema: created?.selectedCinema || booking.theater,
        duration: '-',
      };

      navigate('/ticket-detail', { state: { ticket } });
    } catch (_err) {
      setError(isThai ? 'ชำระเงินหรือยืนยันการจองไม่สำเร็จ' : 'Payment or booking confirmation failed.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#eee' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          {isThai ? 'กำลังเตรียมการจอง...' : 'Preparing your booking...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#eee' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p>{error}</p>
            <button
              onClick={() =>
                navigate('/add-promotion-checkout', {
                  state: {
                    ...state,
                    lang: appLang,
                  },
                })
              }
              style={{ marginTop: 10, padding: '8px 14px', cursor: 'pointer' }}
            >
              {isThai ? 'กลับ' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BookingModal
      booking={booking}
      selectedSeats={selectedSeats}
      total={total}
      lang={appLang}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  );
}
