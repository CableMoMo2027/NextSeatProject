import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { auth } from '../../firebase';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import Counter from '../../components/ui/Counter';
import Stepper, { Step } from '../../components/ui/Stepper';
import BookingCountdownToast from '../../components/booking/BookingCountdownToast';
import { MAIN_API_BASE } from '../../config/runtime';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const BOOKING_FLOW_STEPS = ['Screening Selection', 'Seat Selection', 'Add Promotion (Optional)', 'Checkout'];
const BOOKING_WINDOW_MS = 10 * 60 * 1000;
const TICKET_PRICE_THB = 1;

function resolvePosterUrl(path) {
  if (!path) return '';
  if (String(path).startsWith('http://') || String(path).startsWith('https://')) {
    return path;
  }
  return `${IMG_BASE}${path}`;
}

export default function SeatPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { lang: appLang, isThai } = useAppLanguage(state?.lang);
  const fromScreeningSelection = Boolean(state?.fromScreeningSelection);
  const dateLocale = isThai ? 'th-TH' : 'en-GB';
  const timeLocale = isThai ? 'th-TH' : 'en-US';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screening, setScreening] = useState(null);
  const [seatRows, setSeatRows] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [heldSeats, setHeldSeats] = useState([]);
  const [userId, setUserId] = useState('');
  const [bookingDeadlineAt, setBookingDeadlineAt] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const heldSeatsRef = useRef([]);
  const screeningIdRef = useRef('');

  useEffect(() => {
    const fromState = String(state?.bookingDeadlineAt || '');
    const parsed = Date.parse(fromState);
    const nextDeadline = Number.isNaN(parsed)
      ? new Date(Date.now() + BOOKING_WINDOW_MS).toISOString()
      : new Date(parsed).toISOString();
    setBookingDeadlineAt(nextDeadline);
  }, [state?.bookingDeadlineAt]);

  useEffect(() => {
    heldSeatsRef.current = heldSeats;
  }, [heldSeats]);

  useEffect(() => {
    screeningIdRef.current = screening?._id || '';
  }, [screening?._id]);

  useEffect(() => {
    if (!bookingDeadlineAt) return undefined;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.parse(bookingDeadlineAt) - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        setError(isThai ? 'หมดเวลาการจอง กรุณาเลือกรอบและที่นั่งใหม่' : 'Booking time expired. Please select screening and seats again.');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bookingDeadlineAt, isThai]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds > 0) return;
    const uid = auth.currentUser?.uid;
    const screeningId = screeningIdRef.current;
    const seats = normalizeSeatList(heldSeatsRef.current);
    if (!uid || !screeningId || seats.length === 0) return;
    axios.post(`${API_BASE}/bookings/release`, {
      screeningId,
      seats,
      userId: uid,
    }).catch(() => {
      // best effort release only
    });
    setHeldSeats([]);
  }, [remainingSeconds]);

  useEffect(() => () => {
    const uid = auth.currentUser?.uid;
    const screeningId = screeningIdRef.current;
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
    document.body.style.overflow = 'hidden';
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

        let screeningId = state?.screeningId;
        if (!screeningId) {
          const listRes = await axios.get(`${API_BASE}/screenings`);
          const all = Array.isArray(listRes.data) ? listRes.data : [];
          const targetMovieId = Number(state?.movieId);
          const byMovie = Number.isFinite(targetMovieId)
            ? all.filter((s) => Number(s.movieId) === targetMovieId)
            : [];
          const fallback = byMovie[0];
          if (!fallback) throw new Error('No screenings');
          screeningId = fallback._id;
        }

        const [screeningRes, seatMapRes] = await Promise.all([
          axios.get(`${API_BASE}/screenings/${screeningId}`),
          axios.get(`${API_BASE}/screenings/${screeningId}/seat-map`, { params: { userId: uid } }),
        ]);

        const expectedMovieId = Number(state?.movieId);
        const actualMovieId = Number(screeningRes.data?.movieId);
        if (Number.isFinite(expectedMovieId) && Number.isFinite(actualMovieId) && expectedMovieId !== actualMovieId) {
          throw new Error('Screening movie mismatch');
        }

        if (!mounted) return;
        setScreening(screeningRes.data ? { ...screeningRes.data, price: TICKET_PRICE_THB } : null);
        const nextRows = Array.isArray(seatMapRes.data?.seats) ? seatMapRes.data.seats : [];
        setSeatRows(nextRows);
        const heldByMe = nextRows
          .flatMap((row) => (Array.isArray(row) ? row : []))
          .filter((seat) => seat?.status === 'held' && seat?.heldByCurrentUser)
          .map((seat) => seat.label);
        setHeldSeats(normalizeSeatList(heldByMe));
      } catch (_err) {
        if (!mounted) return;
        setError(isThai ? 'โหลดที่นั่งไม่สำเร็จ' : 'Failed to load seat map.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
      document.body.style.overflow = 'auto';
    };
  }, [isThai, navigate, state?.movieId, state?.screeningId]);

  const toggleSeat = (seat) => {
    if (!seat) return;
    const blocked = seat.status === 'booked' || (seat.status === 'held' && !seat.heldByCurrentUser);
    if (blocked) return;

    const label = seat.label;
    setSelectedSeats((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
  };

  const normalizeSeatList = (seats) =>
    [...new Set((Array.isArray(seats) ? seats : []).map((s) => String(s).trim()).filter(Boolean))].sort();

  const syncSeatHold = async () => {
    if (!screening?._id || !userId) return false;
    const desired = normalizeSeatList(selectedSeats);
    if (desired.length === 0) {
      window.alert(isThai ? 'กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง' : 'Please select at least one seat.');
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
          screeningId: screening._id,
          seats: toRelease,
          userId,
        });
      }
      if (toHold.length > 0) {
        const holdRes = await axios.post(`${API_BASE}/bookings/hold`, {
          screeningId: screening._id,
          seats: toHold,
          userId,
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
      return true;
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      window.alert(
        typeof apiMessage === 'string'
          ? apiMessage
          : (isThai ? 'ไม่สามารถ hold ที่นั่งได้ กรุณาลองใหม่' : 'Unable to hold seats. Please try again.'),
      );
      try {
        const uid = auth.currentUser?.uid;
        if (uid && screening?._id) {
          const seatMapRes = await axios.get(`${API_BASE}/screenings/${screening._id}/seat-map`, { params: { userId: uid } });
          const nextRows = Array.isArray(seatMapRes.data?.seats) ? seatMapRes.data.seats : [];
          setSeatRows(nextRows);
          const heldByMe = nextRows
            .flatMap((row) => (Array.isArray(row) ? row : []))
            .filter((seat) => seat?.status === 'held' && seat?.heldByCurrentUser)
            .map((seat) => seat.label);
          setHeldSeats(normalizeSeatList(heldByMe));
        }
      } catch {
        // ignore refresh errors
      }
      return false;
    }
  };

  const selectedSeatCount = selectedSeats.length || 0;
  const totalPrice = useMemo(
    () => selectedSeatCount * TICKET_PRICE_THB,
    [selectedSeatCount],
  );

  const continueToSummary = async () => {
    if (!screening || selectedSeats.length === 0 || (remainingSeconds !== null && remainingSeconds <= 0)) return;
    const synced = await syncSeatHold();
    if (!synced) return;
    navigate('/booking-modal', {
      state: {
        screeningId: screening._id,
        movieId: screening.movieId,
        movieTitle: screening.movieTitle,
        selectedSeats,
        selectedCinema: state?.selectedCinema || '',
        posterPath: screening.posterPath || state?.posterPath || '',
        lang: appLang,
        bookingDeadlineAt,
      },
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0b0b', color: '#fff' }}>
        {isThai ? 'กำลังโหลดที่นั่ง...' : 'Loading seat map...'}
      </div>
    );
  }

  if (error || !screening) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0b0b', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error || (isThai ? 'ไม่พบข้อมูลรอบฉาย' : 'Screening not found.')}</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: 12, padding: '8px 14px', cursor: 'pointer' }}>{isThai ? 'กลับ' : 'Back'}</button>
        </div>
      </div>
    );
  }

  const dt = new Date(screening.showtime);
  const showtimeText = `${dt.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })} • ${dt.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}`;
  const chosenTitle = state?.movieTitle || screening.movieTitle;
  const chosenPosterPath = state?.posterPath || screening.posterPath || '';
  const displayRows = [...seatRows].reverse();

  return (
    <motion.div
      initial={fromScreeningSelection ? { x: 90, opacity: 0 } : { x: 0, opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{ height: '100dvh', overflow: 'hidden', background: '#020202', color: '#fff', padding: '14px 18px', boxSizing: 'border-box' }}
    >
      <BookingCountdownToast remainingSeconds={remainingSeconds} isThai={isThai} />
      <div style={{ maxWidth: 1280, height: '100%', margin: '0 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Stepper
          className="booking-inline-stepper"
          initialStep={2}
          disableStepIndicators
          stepCircleContainerClassName="booking-stepper-shell"
          stepContainerClassName="booking-stepper-row"
          contentClassName="booking-stepper-content"
          footerClassName="booking-stepper-footer"
          renderStepIndicator={({ step }) => {
            const isActive = step === 2;
            const isComplete = step < 2;
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
                <p className="booking-stepper-copy-step">Seat Selection</p>
                <p className="booking-stepper-copy-meta">Choose your seats before adding promotion</p>
              </div>
            </Step>
          ))}
        </Stepper>

        <button onClick={() => navigate(-1)} style={{ marginBottom: 12, background: 'transparent', border: '1px solid #333', color: '#ddd', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
          ← {isThai ? 'กลับ' : 'Back'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <img
            src={resolvePosterUrl(chosenPosterPath) || 'https://via.placeholder.com/80x120?text=No+Image'}
            alt={chosenTitle}
            style={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 8 }}
          />
          <div style={{ color: '#bbb' }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(20px, 2.8vw, 30px)', lineHeight: 1.1 }}>{chosenTitle}</h1>
            <div style={{ marginTop: 2 }}>{screening.theater}</div>
            <div style={{ marginTop: 1 }}>{showtimeText}</div>
            <div>{isThai ? 'เวลาหนัง' : 'Showtime'}: {new Date(screening.showtime).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#000', border: '1px solid #1f1f1f', borderRadius: 12, padding: '10px 10px 6px', overflow: 'hidden' }}>
          {/* Curved screen indicator */}
          <div style={{ width: '100%', textAlign: 'center', marginBottom: 16, paddingTop: 2 }}>
            <svg width="100%" height="28" viewBox="0 0 400 28" preserveAspectRatio="none" style={{ display: 'block', marginBottom: 4 }}>
              <defs>
                <linearGradient id="spScreenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(240,106,0,0)" />
                  <stop offset="20%" stopColor="#f06a00" />
                  <stop offset="50%" stopColor="#ffb870" />
                  <stop offset="80%" stopColor="#f06a00" />
                  <stop offset="100%" stopColor="rgba(240,106,0,0)" />
                </linearGradient>
                <filter id="spScreenGlow" x="-20%" y="-100%" width="140%" height="400%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M 10 24 Q 200 4 390 24" stroke="url(#spScreenGrad)" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#spScreenGlow)" />
            </svg>
            <span style={{ fontSize: 11, letterSpacing: 5, color: '#ffb870', fontWeight: 600, textTransform: 'uppercase', opacity: 0.85 }}>SCREEN</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, width: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              {displayRows.map((row, idx) => {
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
                { color: '#ff8a1f', stroke: '#ffaa5c', label: isThai ? 'เลือกแล้ว' : 'Selected' },
                { color: '#3b3b3b', stroke: '#4a4a4a', label: isThai ? 'จองแล้ว' : 'Occupied' },
              ].map(({ color, stroke, label }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="18" height="15" viewBox="0 0 22 20" style={{ display: 'block' }}>
                    <rect x={4} y={1} width={14} height={10} rx={3} fill={color} stroke={stroke} strokeWidth={0.5} />
                    <rect x={0} y={7} width={4} height={10} rx={2} fill={color} />
                    <rect x={18} y={7} width={4} height={10} rx={2} fill={color} />
                    <rect x={3} y={11} width={16} height={8} rx={2} fill={color} opacity={0.7} />
                  </svg>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.35)', border: '1px solid #282828', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>Selected Seats</div>
            <div style={{ marginTop: 4 }}>{selectedSeats.length > 0 ? selectedSeats.join(', ') : '-'}</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', fontSize: 12 }}>{isThai ? 'จำนวน' : 'Count'}</span>
              <Counter
                value={selectedSeatCount}
                fontSize={18}
                padding={2}
                gap={1}
                horizontalPadding={2}
                borderRadius={4}
                textColor="#fff"
                fontWeight={700}
                gradientHeight={8}
                gradientFrom="rgba(0,0,0,0.35)"
                gradientTo="transparent"
              />
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>Total</div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>THB</span>
              <Counter
                value={totalPrice}
                fontSize={20}
                padding={2}
                gap={1}
                horizontalPadding={2}
                borderRadius={4}
                textColor="#fff"
                fontWeight={800}
                gradientHeight={8}
                gradientFrom="rgba(0,0,0,0.35)"
                gradientTo="transparent"
              />
            </div>
          </div>
          <button
            onClick={async () => {
              const synced = await syncSeatHold();
              if (!synced) return;
              navigate('/add-promotion-checkout', {
                state: {
                  screeningId: screening._id,
                  movieId: screening.movieId,
                  movieTitle: screening.movieTitle,
                  selectedSeats,
                  selectedCinema: state?.selectedCinema || '',
                  posterPath: screening.posterPath || state?.posterPath || '',
                  lang: appLang,
                  bookingDeadlineAt,
                },
              });
            }}
            disabled={remainingSeconds !== null && remainingSeconds <= 0}
            style={{
              background: 'transparent',
              border: '1px solid #505050',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              cursor: remainingSeconds !== null && remainingSeconds <= 0 ? 'not-allowed' : 'pointer',
              opacity: remainingSeconds !== null && remainingSeconds <= 0 ? 0.5 : 1,
              fontWeight: 700,
            }}
          >
            Add Promotion
          </button>
          <button
            onClick={continueToSummary}
            disabled={selectedSeats.length === 0 || !userId || (remainingSeconds !== null && remainingSeconds <= 0)}
            style={{
              background: '#e8650a',
              border: 'none',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              cursor: selectedSeats.length > 0 && (remainingSeconds === null || remainingSeconds > 0) ? 'pointer' : 'not-allowed',
              opacity: selectedSeats.length > 0 && (remainingSeconds === null || remainingSeconds > 0) ? 1 : 0.5,
              fontWeight: 700,
            }}
          >
            Continue to Booking Summary
          </button>
        </div>
      </div>
    </motion.div>
  );
}
