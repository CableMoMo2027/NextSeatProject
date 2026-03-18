import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebase';
import MainNavbar from '../../components/navigation/MainNavbar';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import { MAIN_API_BASE } from '../../config/runtime';

const API_BASE = MAIN_API_BASE;
const UPCOMING_GRACE_MS = 10 * 60 * 1000;

function formatDateTime(showtime, isThai) {
  const dt = new Date(showtime);
  return {
    date: dt.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString(isThai ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function TicketCard({ ticket, index, onViewDetail, isThai }) {
  return (
    <div
      style={{
        background: 'linear-gradient(145deg,#1a1a1a,#111)',
        border: '1px solid #2a2a2a',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animation: 'fadeSlideUp 0.4s ease both',
        animationDelay: `${index * 0.08}s`,
        cursor: 'pointer',
      }}
      onClick={() => onViewDetail(ticket)}
    >
      <div>
        <p style={{ color: '#666', fontSize: 11, margin: '0 0 4px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{isThai ? 'วันที่' : 'Date'}</p>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>{ticket.date}</p>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(to right,#ff6a00,transparent)' }} />

      <div>
        <p style={{ color: '#666', fontSize: 11, margin: '0 0 4px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{isThai ? 'ชื่อภาพยนตร์' : 'Movie Title'}</p>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '0.04em', margin: 0 }}>{ticket.title}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 4px', fontFamily: 'monospace' }}>{isThai ? `ที่นั่ง (${ticket.seats.length})` : `Ticket (${ticket.seats.length})`}</p>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>{ticket.seats.join(', ')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 4px', fontFamily: 'monospace' }}>{isThai ? 'เวลา' : 'Hours'}</p>
          <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{ticket.time}</p>
        </div>
      </div>

      <div style={{ color: '#b3b3b3', fontSize: 13 }}>{ticket.cinema}</div>
      {ticket.status === 'cancelled' && (
        <div style={{ color: '#ff9999', fontSize: 12, fontWeight: 700 }}>{isThai ? 'ยกเลิกแล้ว' : 'CANCELLED'}</div>
      )}
    </div>
  );
}

export default function MyTicket({ user }) {
  const navigate = useNavigate();
  const { isThai } = useAppLanguage();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 15 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTickets = async () => {
      try {
        setLoading(true);
        setError('');
        const uid = user?.uid || auth.currentUser?.uid;
        if (!uid) {
          if (mounted) {
            setTickets([]);
            setLoading(false);
          }
          return;
        }

        const res = await axios.get(`${API_BASE}/bookings/my/${uid}`);
        const raw = Array.isArray(res.data) ? res.data : [];
        const mapped = raw.map((b) => {
          const screening = b.screeningId || {};
          const { date, time } = formatDateTime(screening.showtime || b.createdAt, isThai);
          return {
            id: b._id,
            bookingId: b._id,
            date,
            time,
            title: screening.movieTitle || 'Movie',
            cinema: b.selectedCinema || screening.theater || '-',
            seats: b.seats || [],
            duration: '-',
            status: b.status,
            showtime: screening.showtime,
            createdAt: b.createdAt,
          };
        });

        if (mounted) setTickets(mapped);
      } catch (_err) {
        if (mounted) setError(isThai ? 'โหลดรายการตั๋วไม่สำเร็จ' : 'Unable to load tickets.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTickets();
    return () => {
      mounted = false;
    };
  }, [user, isThai]);

  const grouped = useMemo(() => {
    const now = nowTs;
    const upcoming = [];
    const history = [];

    for (const t of tickets) {
      const bookedAtMs = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
      const withinUpcomingWindow =
        Number.isFinite(bookedAtMs) && (now - bookedAtMs) < UPCOMING_GRACE_MS;
      const isUpcoming = t.status === 'confirmed' && withinUpcomingWindow;
      if (isUpcoming) upcoming.push(t);
      else history.push(t);
    }

    return { upcoming, history };
  }, [tickets, nowTs]);

  const currentTickets = grouped[activeTab];

  const handleViewDetail = (ticket) => {
    navigate('/ticket-detail', { state: { ticket } });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 80% 80%, #3a1200 0%, #1c0900 45%, #080808 100%)', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mt-back-btn:hover { background: rgba(255,255,255,.07) !important; border-color: #ff6a00 !important; }
      `}</style>

      <MainNavbar user={user} active="home" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 64px' }}>
        <button
          className="mt-back-btn"
          onClick={() => navigate('/home')}
          style={{
            marginBottom: 24,
            padding: '10px 22px',
            background: 'transparent',
            border: '2px solid #333',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.18s, border-color 0.18s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&larr;</span>
          {isThai ? 'กลับหน้าแรก' : 'Back to Home'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', background: '#0d0d0d', borderRadius: 999, padding: 4, border: '1px solid #252525' }}>
            {['upcoming', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 32px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  background: activeTab === tab ? 'linear-gradient(135deg,#ff6a00,#ff9500)' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#555',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'upcoming' ? (isThai ? 'กำลังจะมาถึง' : 'Upcoming') : (isThai ? 'ประวัติ' : 'History')}
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: '#bbb', textAlign: 'center' }}>{isThai ? 'กำลังโหลดตั๋ว...' : 'Loading tickets...'}</p>}
        {error && <p style={{ color: '#ff9b9b', textAlign: 'center' }}>{error}</p>}
        {!loading && !error && currentTickets.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center' }}>{isThai ? 'ไม่พบตั๋ว' : 'No tickets found.'}</p>
        )}

        {!loading && !error && currentTickets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {currentTickets.map((ticket, i) => (
              <TicketCard key={ticket.id} ticket={ticket} index={i} onViewDetail={handleViewDetail} isThai={isThai} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
