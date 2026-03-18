import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedContent from '../../components/animation/Animated_Content';
import { getSavedLanguage } from '../../services/homeCache';
import './Promotion.css';

const PROMO_IMAGE_MAP = import.meta.glob('../../assets/promotion/*', { eager: true, import: 'default' });

function resolvePromoImage(pathLike) {
  const fileName = String(pathLike || '').split('/').pop();
  if (!fileName) return '';
  const exactKey = `../../assets/promotion/${fileName}`;
  return PROMO_IMAGE_MAP[exactKey] || '';
}

const PROMOS = [
  { id: 1, category: 'imax', badge: 'IMAX', badgeType: 'imax', image: '/promotion/promo-imax-detail.png', name: 'IMAX Combo Set', items: ['🍿 1 bucket of 157 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks'], price: '299 ฿' },
  { id: 2, category: 'special', badge: 'HOT', badgeType: 'hot', featured: true, image: '/promotion/promo-pepsi.png', name: 'Pepsi Magic Tumbler Combo Set', items: ['🧊 Pepsi Magic Tumbler 54 oz.', '🍿 1 bucket of 130 oz. popcorn'], price: '299 ฿' },
  { id: 3, category: 'collector', badge: 'TINTUB', badgeType: 'new', image: '/promotion/promo-spongebob.png', name: 'SpongeBob Tintub Set', items: ['🍿 1 bucket of 130 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill included'], price: '399 ฿' },
  { id: 4, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/promotion/promo-badguys.png', name: 'The Bad Guys 2 – Supersize Set', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (set 430 ฿)', '🔄 Happy Refill included'], price: '340 ฿' },
  { id: 5, category: 'collector', badge: 'LIMITED', badgeType: 'hot', featured: true, image: '/promotion/promo-pokemon.png', name: 'Pokémon Movie Set', items: ['🔴 Poké Ball 160 oz. + Pikachu box', '🍿 1 ziplock bag of 85 oz. popcorn', '🥤 1 cup of 44 oz. soft drink', '🔄 Happy Refill included'], price: '590 ฿' },
  { id: 6, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/promotion/promo-paddington.png', name: 'Paddington in Peru – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (set 410 ฿)', '🔄 Happy Refill included'], price: '320 ฿' },
  { id: 7, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/promotion/promo-sapheroe2.png', name: 'Sapheroe 2 – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '📍 Available at cinema / Delivery / Event & Kiosk'], price: '390 ฿' },
  { id: 8, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/promotion/promo-raki.png', name: 'Raki – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '📍 Available at cinema / Delivery / Event & Kiosk'], price: '330 ฿' },
  { id: 9, category: 'special', badge: 'VALENTINE', badgeType: 'hot', featured: true, image: '/promotion/promo-pepsi-valentine.png', name: "Pepsi Treats Valentine's Combo Set", items: ['🍿 1 box of 85 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (refillable)', "🍓 Pepsi Strawberries 'n' Cream 325ml x 1 can"], price: '370 ฿' },
  { id: 10, category: 'special', badge: 'COUPLE', badgeType: 'new', image: '/promotion/promo-yearend-couple.png', name: 'Year-End Finale Couple Set', items: ['🍿 2 boxes of 85 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks', '🌭 FREE 1 serving of sausages (any flavor)'], price: '350 ฿' },
  { id: 11, category: 'collector', badge: 'TINTUB', badgeType: 'new', featured: true, image: '/promotion/promo-zootopia2.png', name: 'Zootopia 2 – Tintub Set', items: ['🦊 Zootopia 2 tin bucket with 130 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill (free 44 oz. soft drink)'], price: '650 ฿' },
  { id: 12, category: 'special', badge: 'HOT', badgeType: 'hot', image: '/promotion/promo-7up.png', name: '7Up Strawberry Lemon Surprise Set', items: ['🍿 2 boxes of 64 oz. popcorn', '🥤 2 cups of 44 oz. soft drinks (refillable)', '🟢 7Up Zero Sugar 325ml x 2 cans', '🎁 FREE 7Up glow-in-the-dark cup + KFC coupon'], price: '400 ฿' },
  { id: 13, category: 'collector', badge: 'EXCLUSIVE', badgeType: 'imax', image: '/promotion/promo-predator.png', name: 'Predator: Badlands – Double Wall Cup Set', items: ['🖤 Double-wall movie cup "Predator: Badlands" + 24 oz. soft drink', '🍿 1 box of 64 oz. popcorn', '🔄 Happy Refill included'], price: '390 ฿' },
  { id: 15, category: 'collector', badge: 'LIMITED', badgeType: 'hot', featured: true, image: '/promotion/promo-doraemon.png', name: 'Doraemon The Movie – Bucket Set', items: ['💙 Doraemon collectible bucket 64 oz. x 1 (packaging only)', '🍿 1 box of 64 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill included'], price: '690 ฿' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'imax', label: 'IMAX' },
  { key: 'supersize', label: 'Supersize' },
  { key: 'special', label: 'Special Set' },
  { key: 'collector', label: 'Collector' },
];

export default function Promotion({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState(() => getSavedLanguage());
  const isThai = lang === 'th-TH';
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPromo, setSelectedPromo] = useState(null);
  const fromBookingFlow = Boolean(location.state?.fromBookingFlow);
  const bookingFlowState = location.state?.bookingFlowState || null;

  const filtered = activeFilter === 'all' ? PROMOS : PROMOS.filter((p) => p.category === activeFilter);

  useEffect(() => {
    const onLangChanged = (event) => {
      const nextLang = event?.detail?.lang || getSavedLanguage();
      setLang(nextLang);
    };
    window.addEventListener('nextseat:lang-changed', onLangChanged);
    return () => window.removeEventListener('nextseat:lang-changed', onLangChanged);
  }, []);

  return (
    <div className="promo-page">
      {/* Hero */}
      <AnimatedContent key={`promo_hero_${lang}`} distance={42} duration={0.55} ease="power3.out">
        <section className="promo-hero">
          <div className="promo-hero-bg" />
          <div className="promo-hero-content">
            <h1 className="promo-hero-title">
              {isThai ? (
                <>ชุดคอมโบ <span>โปรโมชั่น</span></>
              ) : (
                <>COMBO <span>PROMOTIONS</span></>
              )}
            </h1>
            <p className="promo-hero-sub">{isThai ? 'อัปเกรดประสบการณ์ดูหนังของคุณด้วยชุดอาหารและเครื่องดื่มสุดพิเศษ' : 'Upgrade your cinema experience with our special food & drink sets'}</p>
          </div>
        </section>
      </AnimatedContent>

      {/* Content */}
      <section className="promo-section">
        <AnimatedContent key={`promo_section_head_${lang}`} distance={34} duration={0.5} ease="power3.out" delay={0.04}>
          <div className="promo-section-header">
            <div>
              <h2 className="promo-section-title">{isThai ? 'โปรโมชั่น' : 'Promotions'}</h2>
              <p className="promo-section-sub">{isThai ? 'เพิ่มชุดคอมโบในออเดอร์ของคุณและคุ้มค่ากว่าเดิม' : 'Add a combo set to your order and save big'}</p>
            </div>
            {fromBookingFlow && bookingFlowState && (
              <div className="promo-flow-actions">
                <button
                  className="promo-btn-skip"
                  onClick={() => navigate('/booking-modal', { state: bookingFlowState })}
                >
                  {isThai ? 'ข้ามโปรโมชั่น' : 'Skip Promotion'}
                </button>
                <button
                  className="promo-btn-continue"
                  onClick={() => navigate('/booking-modal', { state: bookingFlowState })}
                >
                  {isThai ? 'ไปหน้าชำระเงิน →' : 'Continue to Checkout →'}
                </button>
              </div>
            )}
          </div>
        </AnimatedContent>

        <AnimatedContent key={`promo_filters_${lang}`} distance={28} duration={0.45} ease="power3.out" delay={0.08}>
          <div className="promo-filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`promo-filter-btn${activeFilter === f.key ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </AnimatedContent>

        <div className="promo-grid">
          {filtered.map((promo, i) => (
            <AnimatedContent
              key={`${promo.id}_${lang}`}
              distance={36}
              duration={0.45}
              ease="power3.out"
              delay={Math.min(i * 0.03, 0.28)}
            >
              <div
                className={`promo-card${promo.featured ? ' featured' : ''}`}
                style={{ animationDelay: `${i * 0.06}s` }}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${promo.name}`}
                onClick={() => setSelectedPromo(promo)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPromo(promo);
                  }
                }}
              >
                <div className="promo-img-wrap">
                  <img
                    src={resolvePromoImage(promo.image) || promo.image}
                    alt={promo.name}
                    loading={i < 4 ? 'eager' : 'lazy'}
                  />
                  <span className={`promo-badge badge-${promo.badgeType}`}>{promo.badge}</span>
                </div>
                <div className="promo-card-body">
                  <h3 className="promo-card-name">{promo.name}</h3>
                  <ul className="promo-card-items">
                    {promo.items.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                  <div className="promo-card-footer">
                  <div className="promo-price-wrap">
                      <span className="promo-price-label">{isThai ? 'ราคา' : 'Price'}</span>
                      <span className="promo-price-amount">{promo.price}</span>
                    </div>
                    <span className="promo-view-hint">{isThai ? 'ดูรายละเอียด →' : 'View details →'}</span>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="promo-footer">
        © 2026 NextSeat — Powered by TMDB
      </footer>

      <AnimatePresence>
        {selectedPromo && (
          <motion.div
            className="promo-detail-backdrop"
            onClick={() => setSelectedPromo(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="promo-detail-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              <button className="promo-detail-close" onClick={() => setSelectedPromo(null)} aria-label="Close details">
                ✕
              </button>
              <img
                className="promo-detail-image"
                src={resolvePromoImage(selectedPromo.image) || selectedPromo.image}
                alt={selectedPromo.name}
              />
              <div className="promo-detail-body">
                <span className={`promo-badge badge-${selectedPromo.badgeType}`}>{selectedPromo.badge}</span>
                <h3 className="promo-detail-title">{selectedPromo.name}</h3>
                <p className="promo-detail-price">{isThai ? 'ราคา' : 'Price'}: {selectedPromo.price}</p>
                <ul className="promo-detail-items">
                  {selectedPromo.items.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
