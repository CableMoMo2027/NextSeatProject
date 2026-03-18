import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper, { Step } from '../../components/ui/Stepper';
import Counter from '../../components/ui/Counter';
import BookingCountdownToast from '../../components/booking/BookingCountdownToast';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import { auth } from '../../firebase';
import { MAIN_API_BASE } from '../../config/runtime';

const BOOKING_FLOW_STEPS = ['Screening Selection', 'Seat Selection', 'Add Promotion (Optional)', 'Checkout'];
const API_BASE = MAIN_API_BASE;
const PROMO_ORDER_CACHE_KEY = 'nextseat_promo_order_cache';
const TICKET_PRICE_THB = 1;
const PROMO_IMAGE_MAP = import.meta.glob('../../assets/promotion/*', { eager: true, import: 'default' });

function resolvePromoImage(pathLike) {
  const fileName = String(pathLike || '').split('/').pop();
  if (!fileName) return '';
  const exactKey = `../../assets/promotion/${fileName}`;
  return PROMO_IMAGE_MAP[exactKey] || '';
}

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

const PROMOS = [
  { id: 1, name: 'IMAX Combo Set', detail: 'Popcorn + 2 Drinks', price: 299, image: '/promotion/promo-imax-detail.png' },
  { id: 2, name: 'Pepsi Magic Tumbler', detail: 'Tumbler + Popcorn', price: 299, image: '/promotion/promo-pepsi.png' },
  { id: 3, name: 'SpongeBob Tintub Set', detail: 'Tintub + Drink', price: 399, image: '/promotion/promo-spongebob.png' },
  { id: 4, name: 'Supersize Set', detail: 'Large Popcorn + 2 Drinks', price: 340, image: '/promotion/promo-badguys.png' },
  { id: 5, name: 'Pokémon Movie Set', detail: 'Poké Ball Set', price: 590, image: '/promotion/promo-pokemon.png' },
  { id: 6, name: 'Year-End Couple Set', detail: '2 Popcorn + 2 Drinks', price: 350, image: '/promotion/promo-yearend-couple.png' },
];

export default function AddPromotionCheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { lang: appLang, isThai } = useAppLanguage(state?.lang);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoCounts, setPromoCounts] = useState({});
  const [promoCacheReady, setPromoCacheReady] = useState(false);
  const [seatUnitPrice, setSeatUnitPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const expiredReleaseRef = useRef(false);
  const seatsKey = useMemo(
    () => (Array.isArray(state?.selectedSeats) ? [...state.selectedSeats].sort().join('|') : ''),
    [state?.selectedSeats],
  );
  const orderCacheKey = useMemo(
    () => `${String(state?.screeningId || 'na')}::${String(state?.movieId || 'na')}::${seatsKey}`,
    [state?.screeningId, state?.movieId, seatsKey],
  );

  const canContinue = useMemo(
    () => Boolean(state?.screeningId && Array.isArray(state?.selectedSeats) && state.selectedSeats.length > 0),
    [state],
  );
  const seatCount = Array.isArray(state?.selectedSeats) ? state.selectedSeats.length : 0;
  const seatTotal = seatCount * seatUnitPrice;
  const selectedPromotions = useMemo(
    () =>
      PROMOS
        .map((p) => ({ ...p, qty: Number(promoCounts[p.id] || 0) }))
        .filter((p) => p.qty > 0),
    [promoCounts],
  );
  const promoTotal = selectedPromotions.reduce((sum, p) => sum + (p.price * p.qty), 0);
  const grandTotal = seatTotal + promoTotal;
  const promoSummaryText = selectedPromotions.length > 0
    ? selectedPromotions.map((p) => `${p.name} x${p.qty}`).join(', ')
    : (isThai ? 'ยังไม่เลือก' : 'Not selected');

  useEffect(() => {
    const cache = getPromoOrderCache();
    const cachedCounts = cache?.[orderCacheKey];
    if (cachedCounts && typeof cachedCounts === 'object') {
      setPromoCounts(cachedCounts);
      setPromoCacheReady(true);
      return;
    }

    if (Array.isArray(state?.selectedPromotion) && state.selectedPromotion.length > 0) {
      const restored = state.selectedPromotion.reduce((acc, p) => {
        const id = Number(p?.id);
        const qty = Number(p?.qty || 0);
        if (Number.isFinite(id) && qty > 0) acc[id] = qty;
        return acc;
      }, {});
      setPromoCounts(restored);
    } else {
      setPromoCounts({});
    }
    setPromoCacheReady(true);
  }, [orderCacheKey, state?.selectedPromotion]);

  useEffect(() => {
    if (!promoCacheReady) return;
    const cache = getPromoOrderCache();
    if (Object.keys(promoCounts).length === 0) {
      delete cache[orderCacheKey];
    } else {
      cache[orderCacheKey] = promoCounts;
    }
    setPromoOrderCache(cache);
  }, [orderCacheKey, promoCounts, promoCacheReady]);

  useEffect(() => {
    const deadline = String(state?.bookingDeadlineAt || '');
    if (!deadline) {
      setRemainingSeconds(null);
      return undefined;
    }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.parse(deadline) - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state?.bookingDeadlineAt]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds > 0) {
      expiredReleaseRef.current = false;
      return;
    }
    if (expiredReleaseRef.current) return;
    expiredReleaseRef.current = true;

    const expireBooking = async () => {
      const uid = auth.currentUser?.uid;
      const screeningId = String(state?.screeningId || '');
      const seats = Array.isArray(state?.selectedSeats) ? state.selectedSeats : [];
      if (uid && screeningId && seats.length > 0) {
        try {
          await axios.post(`${API_BASE}/bookings/release`, {
            screeningId,
            seats,
            userId: uid,
          });
        } catch {
          // best effort release only
        }
      }

      const cache = getPromoOrderCache();
      delete cache[orderCacheKey];
      setPromoOrderCache(cache);
      setPromoCounts({});
      navigate('/screening-selection', {
        state: {
          ...state,
          lang: appLang,
          resumeStep: 1,
          bookingExpired: true,
        },
      });
    };

    expireBooking();
  }, [remainingSeconds, orderCacheKey, navigate, state, appLang]);

  useEffect(() => {
    let mounted = true;
    const loadPrice = async () => {
      if (!state?.screeningId) return;
      try {
        setPriceLoading(true);
        if (!mounted) return;
        setSeatUnitPrice(TICKET_PRICE_THB);
      } finally {
        if (mounted) setPriceLoading(false);
      }
    };
    loadPrice();
    return () => {
      mounted = false;
    };
  }, [state?.screeningId]);

  const continueToCheckout = () => {
    if (!canContinue || (remainingSeconds !== null && remainingSeconds <= 0)) return;
    navigate('/checkout-payment', {
      state: {
        ...state,
        selectedPromotion: selectedPromotions,
        seatUnitPrice,
        promoTotal,
        grandTotal,
        bookingDeadlineAt: state?.bookingDeadlineAt,
        fromStep: 3,
        currentStep: 4,
      },
    });
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

  return (
    <div style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse at 15% 90%, #6e2800 0%, #200b00 30%, #040808 60%)', color: '#fff', padding: '14px 18px', boxSizing: 'border-box' }}>
      <BookingCountdownToast remainingSeconds={remainingSeconds} isThai={isThai} />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Stepper
          className="booking-inline-stepper"
          initialStep={3}
          disableStepIndicators
          stepCircleContainerClassName="booking-stepper-shell"
          stepContainerClassName="booking-stepper-row"
          contentClassName="booking-stepper-content"
          footerClassName="booking-stepper-footer"
          renderStepIndicator={({ step }) => {
            const isActive = step === 3;
            const isComplete = step < 3;
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
                <p className="booking-stepper-copy-step">Add Promotion (Optional)</p>
                <p className="booking-stepper-copy-meta">Choose extra combos, or skip and continue to checkout</p>
              </div>
            </Step>
          ))}
        </Stepper>

        <div style={{ marginTop: 14, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, background: 'rgba(0,0,0,0.3)', padding: 20 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>{isThai ? 'เพิ่มโปรโมชัน (ไม่บังคับ)' : 'Add Promotion (Optional)'}</h2>
          <p style={{ margin: 0, color: '#cfcfcf' }}>
            {isThai ? 'คุณสามารถเลือกโปรโมชันเพิ่มเติมได้ หรือข้ามไปขั้นตอนชำระเงิน' : 'You can add promotion combos, or skip directly to checkout.'}
          </p>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, border: '1px solid #303030', background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 13, color: '#9f9f9f' }}>{isThai ? 'ที่นั่งที่เลือก' : 'Selected seats'}</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{Array.isArray(state?.selectedSeats) && state.selectedSeats.length > 0 ? state.selectedSeats.join(', ') : '-'}</div>
          </div>

          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #303030', background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 13, color: '#9f9f9f' }}>{isThai ? 'รายละเอียดราคา' : 'Price detail'}</div>
            <div style={{ marginTop: 6, fontSize: 14, color: '#ddd' }}>
              <div>{isThai ? 'ค่าที่นั่ง' : 'Seats'}: {seatCount} x THB {seatUnitPrice} = THB {seatTotal}</div>
              <div style={{ marginTop: 4 }}>
                {isThai ? 'โปรโมชัน' : 'Promotion'}: {promoSummaryText}
              </div>
              <div style={{ marginTop: 8, fontWeight: 700, color: '#ffb870' }}>
                {isThai ? 'รวมทั้งหมด' : 'Grand Total'}: THB{' '}
                <Counter
                  value={grandTotal}
                  fontSize={18}
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
              {priceLoading && <div style={{ marginTop: 6, color: '#8f8f8f', fontSize: 12 }}>{isThai ? 'กำลังโหลดราคา...' : 'Loading price...'}</div>}
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() =>
                navigate('/screening-selection', {
                  state: {
                    ...state,
                    lang: appLang,
                    resumeStep: 2,
                    resumeScreeningId: state?.screeningId,
                    resumeSelectedSeats: Array.isArray(state?.selectedSeats) ? state.selectedSeats : [],
                    resumeBookingDeadlineAt: state?.bookingDeadlineAt,
                  },
                })
              }
              style={{ background: 'transparent', border: '1px solid #585858', color: '#fff', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}
            >
              {isThai ? 'กลับ' : 'Back'}
            </button>
            <button
              onClick={() => setPromoModalOpen(true)}
              style={{ background: 'transparent', border: '1px solid #e8650a', color: '#ffab6f', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}
            >
              {isThai ? 'เพิ่ม Promotion' : 'Add Promotion'}
            </button>
            <button
              onClick={continueToCheckout}
              disabled={!canContinue || (remainingSeconds !== null && remainingSeconds <= 0)}
              style={{ background: '#e8650a', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 16px', cursor: canContinue && (remainingSeconds === null || remainingSeconds > 0) ? 'pointer' : 'not-allowed', opacity: canContinue && (remainingSeconds === null || remainingSeconds > 0) ? 1 : 0.5, fontWeight: 700 }}
            >
              {isThai ? 'ไปขั้นตอน 4: ชำระเงิน' : 'Go to Step 4: Payment'}
            </button>
          </div>
        </div>
      </div>

      {promoModalOpen && (
        <div onClick={() => setPromoModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 1200, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 96vw)', maxHeight: '80vh', background: '#131313', border: '1px solid #2c2c2c', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                      textAlign: 'left',
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
                          <div style={{ color: '#aaa', marginTop: 4, fontSize: 13 }}>{promo.detail}</div>
                          <div style={{ color: '#e6a365', marginTop: 4, fontSize: 13 }}>THB {promo.price}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          whileHover={{ scale: 1.06 }}
                          onClick={() => changePromoQty(promo.id, -1)}
                          disabled={qty === 0}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            border: '1px solid #444',
                            background: qty === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                            color: qty === 0 ? '#555' : '#fff',
                            cursor: qty === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          -
                        </motion.button>

                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={`qty-${promo.id}-${qty}`}
                            initial={{ y: -6, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 6, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}
                          >
                            {qty}
                          </motion.div>
                        </AnimatePresence>

                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          whileHover={{ scale: 1.06 }}
                          onClick={() => changePromoQty(promo.id, 1)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            border: '1px solid #ff8a1f',
                            background: 'rgba(255,138,31,0.18)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          +
                        </motion.button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid #2b2b2b', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#ddd' }}>
                {isThai ? 'รวมสุทธิ' : 'Grand Total'}:{' '}
                <strong style={{ color: '#ffb870', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  THB
                  <Counter
                    value={grandTotal}
                    fontSize={16}
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
                </strong>
              </div>
              <button onClick={() => setPromoModalOpen(false)} style={{ background: '#f06a00', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700 }}>
                {isThai ? 'ตกลง' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
