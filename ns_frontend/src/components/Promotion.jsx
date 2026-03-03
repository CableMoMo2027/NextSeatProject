import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import logo from '../assets/logo/NextSeat.png';
import './Promotion.css';

const PROMOS = [
  { id: 1, category: 'imax', badge: 'IMAX', badgeType: 'imax', image: '/images/promo-imax-detail.png', name: 'IMAX Combo Set', items: ['🍿 1 bucket of 157 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks'], price: '299 ฿' },
  { id: 2, category: 'special', badge: 'HOT', badgeType: 'hot', featured: true, image: '/images/promo-pepsi.png', name: 'Pepsi Magic Tumbler Combo Set', items: ['🧊 Pepsi Magic Tumbler 54 oz.', '🍿 1 bucket of 130 oz. popcorn'], price: '299 ฿' },
  { id: 3, category: 'collector', badge: 'TINTUB', badgeType: 'new', image: '/images/promo-spongebob.png', name: 'SpongeBob Tintub Set', items: ['🍿 1 bucket of 130 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill included'], price: '399 ฿' },
  { id: 4, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/images/promo-badguys.png', name: 'The Bad Guys 2 – Supersize Set', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (set 430 ฿)', '🔄 Happy Refill included'], price: '340 ฿' },
  { id: 5, category: 'collector', badge: 'LIMITED', badgeType: 'hot', featured: true, image: '/images/promo-pokemon.png', name: 'Pokémon Movie Set', items: ['🔴 Poké Ball 160 oz. + Pikachu box', '🍿 1 ziplock bag of 85 oz. popcorn', '🥤 1 cup of 44 oz. soft drink', '🔄 Happy Refill included'], price: '590 ฿' },
  { id: 6, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/images/promo-paddington.png', name: 'Paddington in Peru – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (set 410 ฿)', '🔄 Happy Refill included'], price: '320 ฿' },
  { id: 7, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/images/promo-sapheroe2.png', name: 'Sapheroe 2 – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '📍 Available at cinema / Delivery / Event & Kiosk'], price: '390 ฿' },
  { id: 8, category: 'supersize', badge: 'SUPERSIZE', badgeType: 'super', image: '/images/promo-raki.png', name: 'Raki – Supersize', items: ['🍿 1 supersize bucket of 355 oz. popcorn', '📍 Available at cinema / Delivery / Event & Kiosk'], price: '330 ฿' },
  { id: 9, category: 'special', badge: 'VALENTINE', badgeType: 'hot', featured: true, image: '/images/promo-pepsi-valentine.png', name: "Pepsi Treats Valentine's Combo Set", items: ['🍿 1 box of 85 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks (refillable)', "🍓 Pepsi Strawberries 'n' Cream 325ml x 1 can"], price: '370 ฿' },
  { id: 10, category: 'special', badge: 'COUPLE', badgeType: 'new', image: '/images/promo-yearend-couple.png', name: 'Year-End Finale Couple Set', items: ['🍿 2 boxes of 85 oz. popcorn', '🥤 2 cups of 32 oz. soft drinks', '🌭 FREE 1 serving of sausages (any flavor)'], price: '350 ฿' },
  { id: 11, category: 'collector', badge: 'TINTUB', badgeType: 'new', featured: true, image: '/images/promo-zootopia2.png', name: 'Zootopia 2 – Tintub Set', items: ['🦊 Zootopia 2 tin bucket with 130 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill (free 44 oz. soft drink)'], price: '650 ฿' },
  { id: 12, category: 'special', badge: 'HOT', badgeType: 'hot', image: '/images/promo-7up.png', name: '7Up Strawberry Lemon Surprise Set', items: ['🍿 2 boxes of 64 oz. popcorn', '🥤 2 cups of 44 oz. soft drinks (refillable)', '🟢 7Up Zero Sugar 325ml x 2 cans', '🎁 FREE 7Up glow-in-the-dark cup + KFC coupon'], price: '400 ฿' },
  { id: 13, category: 'collector', badge: 'EXCLUSIVE', badgeType: 'imax', image: '/images/promo-predator.png', name: 'Predator: Badlands – Double Wall Cup Set', items: ['🖤 Double-wall movie cup "Predator: Badlands" + 24 oz. soft drink', '🍿 1 box of 64 oz. popcorn', '🔄 Happy Refill included'], price: '390 ฿' },
  { id: 14, category: 'collector', badge: 'LIMITED', badgeType: 'hot', featured: true, image: '/images/promo-tron.png', name: 'Tron: Ares – Totem Bucket Set', items: ['⚡ Tron Ares light-up totem bucket with 130 oz. popcorn (light-up + movable motorcycle figure)', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill (free 44 oz. soft drink)'], price: '590 ฿' },
  { id: 15, category: 'collector', badge: 'LIMITED', badgeType: 'hot', featured: true, image: '/images/promo-doraemon.png', name: 'Doraemon The Movie – Bucket Set', items: ['💙 Doraemon collectible bucket 64 oz. x 1 (packaging only)', '🍿 1 box of 64 oz. popcorn', '🥤 1 cup of 32 oz. soft drink', '🔄 Happy Refill included'], price: '690 ฿' },
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
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [addedIds, setAddedIds] = useState({});
  const [toast, setToast] = useState({ show: false, name: '' });
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = () => setProfileOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [profileOpen]);

  const handleAddCombo = (id, name) => {
    setAddedIds((prev) => ({ ...prev, [id]: true }));
    setToast({ show: true, name });
    setTimeout(() => setToast({ show: false, name: '' }), 3000);
    setTimeout(() => setAddedIds((prev) => ({ ...prev, [id]: false })), 2500);
  };

  const filtered = activeFilter === 'all' ? PROMOS : PROMOS.filter((p) => p.category === activeFilter);
  const avatarUrl = user?.photoURL || null;

  return (
    <div className="promo-page">

      {/* Navbar */}
      <nav className={`promo-navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="promo-navbar-brand">
          <img src={logo} alt="NextSeat" className="promo-navbar-logo" onClick={() => navigate('/home')} />
          <button className="promo-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <ul className={`promo-navbar-links${mobileMenuOpen ? ' mobile-open' : ''}`}>
            <li><a href="#" onClick={() => { navigate('/home'); setMobileMenuOpen(false); }}>Home</a></li>
            <li><a href="#" onClick={() => setMobileMenuOpen(false)}>Movies</a></li>
            <li><a href="#" onClick={() => setMobileMenuOpen(false)}>Series</a></li>
            <li><a href="#" onClick={() => setMobileMenuOpen(false)}>New &amp; Popular</a></li>
            <li><a href="#" className="active" onClick={() => setMobileMenuOpen(false)}>Promotions</a></li>
          </ul>
        </div>

        <div className="promo-navbar-right" onClick={(e) => e.stopPropagation()}>
          <div className="promo-profile-wrap">
            <button className="promo-profile-btn" onClick={() => setProfileOpen((p) => !p)}>
              {avatarUrl
                ? <img src={avatarUrl} alt="profile" className="promo-avatar" />
                : <div className="promo-avatar-guest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              }
              <span className={`promo-profile-arrow${profileOpen ? ' open' : ''}`}>▾</span>
            </button>

            {profileOpen && (
              <>
                <div className="promo-dropdown-overlay" onClick={() => setProfileOpen(false)} />
                <div className="promo-dropdown">
                  {user ? (
                    <>
                      <div className="promo-dropdown-header">
                        {avatarUrl
                          ? <img src={avatarUrl} alt="" className="promo-dropdown-avatar" />
                          : <div className="promo-dropdown-avatar-guest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                        }
                        <div className="promo-dropdown-info">
                          <span className="promo-dropdown-name">{user.displayName || 'User'}</span>
                          <span className="promo-dropdown-email">{user.email}</span>
                        </div>
                      </div>
                      <div className="promo-dropdown-divider" />
                      <button className="promo-dropdown-item" onClick={() => { navigate('/member-detail'); setProfileOpen(false); }}>Member Detail</button>
                      <button className="promo-dropdown-item" onClick={() => { navigate('/my-ticket'); setProfileOpen(false); }}>My Ticket</button>
                      <div className="promo-dropdown-divider" />
                      <button className="promo-dropdown-item signout" onClick={() => { auth.signOut(); setProfileOpen(false); }}>Sign Out</button>
                    </>
                  ) : (
                    <>
                      <div className="promo-dropdown-header">
                        <div className="promo-dropdown-avatar-guest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                        <div className="promo-dropdown-info">
                          <span className="promo-dropdown-name">Guest</span>
                          <span className="promo-dropdown-email">Not signed in</span>
                        </div>
                      </div>
                      <div className="promo-dropdown-divider" />
                      <button className="promo-dropdown-item" onClick={() => { navigate('/login'); setProfileOpen(false); }}>Login</button>
                      <button className="promo-dropdown-item" onClick={() => { navigate('/signup'); setProfileOpen(false); }}>Sign Up</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="promo-hero">
        <div className="promo-hero-bg" />
        <div className="promo-hero-content">
          <p className="promo-hero-label">🍿 Exclusive Deals</p>
          <h1 className="promo-hero-title">COMBO <span>PROMOTIONS</span></h1>
          <p className="promo-hero-sub">Upgrade your cinema experience with our special food &amp; drink sets</p>
        </div>
      </section>

      {/* Content */}
      <section className="promo-section">
        <div className="promo-section-header">
          <h2 className="promo-section-title">Promotions</h2>
          <p className="promo-section-sub">Add a combo set to your order and save big</p>
        </div>

        <div className="promo-filter-tabs">
          {FILTERS.map((f) => (
            <button key={f.key} className={`promo-filter-btn${activeFilter === f.key ? ' active' : ''}`} onClick={() => setActiveFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="promo-grid">
          {filtered.map((promo, i) => (
            <div key={promo.id} className={`promo-card${promo.featured ? ' featured' : ''}`} style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="promo-img-wrap">
                <img src={promo.image} alt={promo.name} loading="lazy" />
                <span className={`promo-badge badge-${promo.badgeType}`}>{promo.badge}</span>
              </div>
              <div className="promo-card-body">
                <h3 className="promo-card-name">{promo.name}</h3>
                <ul className="promo-card-items">
                  {promo.items.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
                <div className="promo-card-footer">
                  <div className="promo-price-wrap">
                    <span className="promo-price-label">Price</span>
                    <span className="promo-price-amount">{promo.price}</span>
                  </div>
                  <button
                    className={`promo-add-btn${addedIds[promo.id] ? ' added' : ''}`}
                    onClick={() => handleAddCombo(promo.id, promo.name)}
                    disabled={addedIds[promo.id]}
                  >
                    {addedIds[promo.id] ? '✓ Added!' : <><span className="promo-add-icon">+</span> Add Combo</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="promo-footer">
        © 2026 NextSeat — Powered by TMDB
      </footer>

      {/* Toast */}
      <div className={`promo-toast${toast.show ? ' show' : ''}`}>
        <span>🍿</span>
        <span>"{toast.name}" added to your order!</span>
      </div>
    </div>
  );
}
