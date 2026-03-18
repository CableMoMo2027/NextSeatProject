import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Stepper, { Step } from '../../components/ui/Stepper';
import BookingCountdownToast from '../../components/booking/BookingCountdownToast';
import { auth } from '../../firebase';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import { MAIN_API_BASE } from '../../config/runtime';

const API_BASE = MAIN_API_BASE;
const PROMO_ORDER_CACHE_KEY = 'nextseat_promo_order_cache';
const TICKET_PRICE_THB = 1;

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

function normalizeSeatLabel(seat) {
  if (!seat || typeof seat !== 'string') return '';
  const trimmed = seat.trim().toUpperCase();
  if (trimmed.includes('-')) return trimmed;
  const match = trimmed.match(/^([A-Z]+)(\d+)$/);
  if (!match) return trimmed;
  return `${match[1]}-${match[2]}`;
}

export default function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { lang: appLang, isThai } = useAppLanguage(state?.lang);
  const BOOKING_FLOW_STEPS = useMemo(
    () => (
      isThai
        ? ['เลือกรอบฉาย', 'เลือกที่นั่ง', 'เพิ่มโปรโมชัน (ไม่บังคับ)', 'ชำระเงิน']
        : ['Screening Selection', 'Seat Selection', 'Add Promotion (Optional)', 'Checkout']
    ),
    [isThai],
  );

  const [userId, setUserId] = useState('');
  const [screeningId, setScreeningId] = useState(String(state?.screeningId || ''));
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [holdExpireAt, setHoldExpireAt] = useState('');
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState(null);
  const [flowRemainingSeconds, setFlowRemainingSeconds] = useState(null);

  const releasedRef = useRef(false);
  const checkedOutRef = useRef(false);
  const seatsRef = useRef([]);
  const screeningRef = useRef('');
  const userRef = useRef('');

  const selectedPromotions = Array.isArray(state?.selectedPromotion) ? state.selectedPromotion : [];
  const promoTotal = Number(state?.promoTotal || 0);
  const seatTotal = TICKET_PRICE_THB * (Array.isArray(state?.selectedSeats) ? state.selectedSeats.length : 0);
  const grandTotal = Number(state?.grandTotal || seatTotal + promoTotal);
  const promoText = useMemo(() => {
    if (selectedPromotions.length === 0) return isThai ? 'ไม่มี' : 'None';
    return selectedPromotions.map((p) => `${p.name} x${p.qty}`).join(', ');
  }, [isThai, selectedPromotions]);
  const seatsKey = useMemo(
    () => (Array.isArray(state?.selectedSeats) ? [...state.selectedSeats].sort().join('|') : ''),
    [state?.selectedSeats],
  );
  const promoOrderKey = useMemo(
    () => `${String(state?.screeningId || 'na')}::${String(state?.movieId || 'na')}::${seatsKey}`,
    [state?.screeningId, state?.movieId, seatsKey],
  );

  const flowDeadlineAt = String(state?.bookingDeadlineAt || '');
  const remainingSeconds = useMemo(() => {
    const values = [flowRemainingSeconds, holdRemainingSeconds].filter((value) => value !== null);
    if (values.length === 0) return null;
    return Math.min(...values);
  }, [flowRemainingSeconds, holdRemainingSeconds]);

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
    } catch {
      // ignore release failures
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

        let sid = String(state?.screeningId || '');
        if (!sid) {
          const targetMovieId = Number(state?.movieId);
          if (Number.isFinite(targetMovieId)) {
            const listRes = await axios.get(`${API_BASE}/screenings`);
            const all = Array.isArray(listRes.data) ? listRes.data : [];
            const fallback = all.find((s) => Number(s.movieId) === targetMovieId);
            if (fallback?._id) sid = String(fallback._id);
          }
        }
        const requestedSeats = Array.isArray(state?.selectedSeats)
          ? state.selectedSeats.map(normalizeSeatLabel).filter(Boolean)
          : [];
        if (!sid || requestedSeats.length === 0) {
          throw new Error('MISSING_BOOKING_DATA');
        }
        if (!Number.isNaN(Date.parse(flowDeadlineAt)) && Date.now() >= Date.parse(flowDeadlineAt)) {
          throw new Error('BOOKING_TIME_EXPIRED');
        }

        const seatMapRes = await axios.get(`${API_BASE}/screenings/${sid}/seat-map`, {
          params: { userId: uid },
        });
        const seatRows = seatMapRes.data?.seats || [];
        const flatSeats = Array.isArray(seatRows) ? seatRows.flat() : [];
        const seatMap = new Map(flatSeats.map((seat) => [seat.label, seat]));
        const existingHoldExpiryCandidates = requestedSeats
          .map((label) => seatMap.get(label)?.holdExpireAt)
          .filter((value) => !Number.isNaN(Date.parse(String(value || ''))))
          .map((value) => new Date(String(value)).toISOString());
        const unavailableSeats = requestedSeats.filter((label) => {
          const seat = seatMap.get(label);
          if (!seat) return true;
          if (seat.status === 'booked') return true;
          if (seat.status === 'held' && !seat.heldByCurrentUser) return true;
          return false;
        });
        if (unavailableSeats.length > 0) {
          throw new Error('SELECTED_SEAT_UNAVAILABLE');
        }

        const seatsNeedHold = requestedSeats.filter((label) => {
          const seat = seatMap.get(label);
          return seat?.status === 'available';
        });

        if (seatsNeedHold.length > 0) {
          const holdRes = await axios.post(`${API_BASE}/bookings/hold`, {
            screeningId: sid,
            seats: seatsNeedHold,
            userId: uid,
          });
          const holdExpire = holdRes?.data?.expireAt;
          if (!Number.isNaN(Date.parse(String(holdExpire || '')))) {
            existingHoldExpiryCandidates.push(new Date(String(holdExpire)).toISOString());
          }
        }

        const nextExpireAt = existingHoldExpiryCandidates
          .slice()
          .sort((a, b) => Date.parse(a) - Date.parse(b))[0];

        if (!mounted) return;
        setUserId(uid);
        setScreeningId(sid);
        setSelectedSeats(requestedSeats);
        setHoldExpireAt(nextExpireAt || '');
      } catch (err) {
        if (!mounted) return;
        const apiMessage = err?.response?.data?.message;
        const msg = String(err?.message || '');
        if (msg === 'SELECTED_SEAT_UNAVAILABLE') {
          setError(isThai ? 'ที่นั่งที่เลือกไม่ว่างแล้ว กรุณาเลือกใหม่' : 'Selected seats are no longer available.');
        } else if (msg === 'BOOKING_TIME_EXPIRED') {
          setError(isThai ? 'หมดเวลาการจอง กรุณาเริ่มใหม่จากขั้นตอนเลือกที่นั่ง' : 'Booking time expired. Please restart from seat selection.');
        } else if (msg === 'MISSING_BOOKING_DATA') {
          setError(isThai ? 'ข้อมูลการจองไม่ครบ กรุณาเริ่มใหม่' : 'Missing booking data. Please restart checkout.');
        } else if (typeof apiMessage === 'string' && apiMessage.trim()) {
          setError(apiMessage);
        } else {
          setError(isThai ? 'ไม่สามารถเตรียมการชำระเงินได้' : 'Unable to prepare payment.');
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
  }, [flowDeadlineAt, isThai, navigate, releaseHolds, state?.screeningId, state?.selectedSeats]);

  useEffect(() => {
    if (!holdExpireAt) {
      setHoldRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const ms = Date.parse(holdExpireAt) - Date.now();
      const sec = Math.max(0, Math.floor(ms / 1000));
      setHoldRemainingSeconds(sec);
      if (sec <= 0 && !checkedOutRef.current) {
        setError((prev) => prev || (isThai ? 'หมดเวลาการจอง กรุณาเลือกที่นั่งใหม่' : 'Booking time expired. Please select seats again.'));
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [holdExpireAt, isThai]);

  useEffect(() => {
    if (Number.isNaN(Date.parse(flowDeadlineAt))) {
      setFlowRemainingSeconds(null);
      return;
    }
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.parse(flowDeadlineAt) - Date.now()) / 1000));
      setFlowRemainingSeconds(sec);
      if (sec <= 0 && !checkedOutRef.current) {
        setError((prev) => prev || (isThai ? 'หมดเวลาการจอง กรุณาเลือกที่นั่งใหม่' : 'Booking time expired. Please select seats again.'));
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [flowDeadlineAt, isThai]);

  const handlePayNow = async () => {
    try {
      if (remainingSeconds !== null && remainingSeconds <= 0) {
        setError(isThai ? 'หมดเวลาการจอง กรุณาเลือกที่นั่งใหม่' : 'Booking time expired. Please select seats again.');
        return;
      }
      setPaying(true);
      setError('');
      const res = await axios.post(`${API_BASE}/bookings/checkout`, {
        screeningId,
        userId,
        selectedCinema: state?.selectedCinema || undefined,
        selectedPromotions,
      });
      checkedOutRef.current = true;
      const created = res.data;
      const cache = getPromoOrderCache();
      delete cache[promoOrderKey];
      setPromoOrderCache(cache);
      const ticket = {
        bookingId: created?._id || `NST-${Date.now()}`,
        date: state?.showDateText || '-',
        title: state?.movieTitle || 'Movie',
        seats: created?.seats || selectedSeats,
        time: state?.showTimeText || '-',
        cinema: created?.selectedCinema || state?.selectedCinema || '-',
        duration: '-',
      };
      navigate('/ticket-detail', { state: { ticket } });
    } catch {
      setError(isThai ? 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#fff', background: '#101010' }}>{isThai ? 'กำลังเตรียมข้อมูลชำระเงิน...' : 'Preparing payment...'}</div>;
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse at 12% 90%, #6e2800 0%, #1d0a00 34%, #060707 60%)', color: '#fff', padding: '14px 18px', boxSizing: 'border-box' }}>
      <BookingCountdownToast remainingSeconds={remainingSeconds} isThai={isThai} />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Stepper
          className="booking-inline-stepper"
          initialStep={4}
          disableStepIndicators
          stepCircleContainerClassName="booking-stepper-shell"
          stepContainerClassName="booking-stepper-row"
          contentClassName="booking-stepper-content"
          footerClassName="booking-stepper-footer"
          renderStepIndicator={({ step }) => {
            const isActive = step === 4;
            const isComplete = step < 4;
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
                <p className="booking-stepper-copy-step">{isThai ? 'ชำระเงิน' : 'Checkout & Payment'}</p>
                <p className="booking-stepper-copy-meta">{isThai ? 'ตรวจสอบรายการและชำระเงินให้เสร็จสิ้น' : 'Review your order and complete payment'}</p>
              </div>
            </Step>
          ))}
        </Stepper>

        <div style={{ marginTop: 14, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, background: 'rgba(0,0,0,0.3)', padding: 20 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>{isThai ? 'ขั้นตอน 4: ชำระเงิน' : 'Step 4: Payment'}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid #2e2e2e', background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ color: '#a9a9a9', fontSize: 13 }}>{isThai ? 'ที่นั่ง' : 'Seats'}</div>
              <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedSeats.join(', ') || '-'}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid #2e2e2e', background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ color: '#a9a9a9', fontSize: 13 }}>{isThai ? 'โปรโมชั่น' : 'Promotions'}</div>
              <div style={{ marginTop: 4 }}>{promoText}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid #2e2e2e', background: 'rgba(0,0,0,0.3)' }}>
              <div>{isThai ? 'ค่าที่นั่ง' : 'Seats'}: THB {seatTotal.toFixed(2)}</div>
              <div style={{ marginTop: 4 }}>{isThai ? 'โปรโมชัน' : 'Promotion'}: THB {promoTotal.toFixed(2)}</div>
              <div style={{ marginTop: 10, color: '#ffb870', fontWeight: 800, fontSize: 20 }}>
                {isThai ? 'ยอดชำระทั้งหมด' : 'Grand Total'}: THB {grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, color: '#ff9b9b' }}>{error}</div>}

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                await releaseHolds();
                navigate('/add-promotion-checkout', { state: { ...state, lang: appLang } });
              }}
              disabled={paying}
              style={{ background: 'transparent', border: '1px solid #585858', color: '#fff', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}
            >
              {isThai ? 'ย้อนกลับ' : 'Back'}
            </button>
            <button
              onClick={handlePayNow}
              disabled={paying || !!error || (remainingSeconds !== null && remainingSeconds <= 0)}
              style={{ background: '#e8650a', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 16px', cursor: paying || error || (remainingSeconds !== null && remainingSeconds <= 0) ? 'not-allowed' : 'pointer', opacity: paying || error || (remainingSeconds !== null && remainingSeconds <= 0) ? 0.6 : 1, fontWeight: 700 }}
            >
              {paying ? (isThai ? 'กำลังชำระเงิน...' : 'Processing payment...') : (isThai ? 'ยืนยันและชำระเงิน' : 'Confirm & Pay')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
