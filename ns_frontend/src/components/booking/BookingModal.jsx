import { DATES } from "../../constants";
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

function resolvePosterUrl(path) {
  if (!path) return '';
  if (String(path).startsWith('http://') || String(path).startsWith('https://')) {
    return path;
  }
  return `${IMG_BASE}${path}`;
}

export default function BookingModal({ booking, selectedSeats, total, lang = 'en-US', onClose, onConfirm }) {
  const isThai = lang === 'th-TH';
  const { theater, dateIndex, time, movieTitle, dateText, posterPath } = booking;
  const displayDate = dateText || `${DATES[dateIndex]?.day || "-"} 2026`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          background: 'linear-gradient(160deg, #1c1c1c 0%, #141414 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Hero: poster + title ── */}
        <div style={{ position: 'relative', background: 'rgba(0,0,0,0.3)' }}>
          {/* blurred poster bg */}
          {resolvePosterUrl(posterPath) && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${resolvePosterUrl(posterPath)})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(24px) brightness(0.25)',
              transform: 'scale(1.1)',
            }} />
          )}
          <div style={{ position: 'relative', display: 'flex', gap: 16, padding: '24px 24px 20px', alignItems: 'flex-end' }}>
            <img
              src={resolvePosterUrl(posterPath) || 'https://via.placeholder.com/80x120?text=No+Image'}
              alt={movieTitle || 'Movie'}
              style={{ width: 72, height: 108, objectFit: 'cover', borderRadius: 10, flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: '#f06a00', marginBottom: 6, textTransform: 'uppercase' }}>
                {isThai ? 'สรุปการจอง' : 'Booking Summary'}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{movieTitle || 'Movie'}</h3>
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: isThai ? 'โรง' : 'Theater', value: theater },
              { label: isThai ? 'เวลา' : 'Time', value: time },
              { label: isThai ? 'วันที่' : 'Date', value: displayDate },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.4, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, letterSpacing: 1.4, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                {isThai ? 'ที่นั่ง' : 'Seats'} ({selectedSeats.length})
              </div>
              <div style={{ fontSize: 13, color: '#f06a00', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedSeats.join(', ')}
              </div>
            </div>
          </div>

          {/* ── Total ── */}
          <div style={{
            margin: '14px 0 0',
            background: 'rgba(240,106,0,0.08)',
            border: '1px solid rgba(240,106,0,0.2)',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>{isThai ? 'ยอดรวม' : 'Total'}</span>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#aaa', marginRight: 4 }}>THB</span>
              {total}
            </span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px 24px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)',
              color: '#aaa', borderRadius: 12, padding: '13px', cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            {isThai ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 2, background: 'linear-gradient(135deg, #f06a00 0%, #d45500 100%)',
              border: 'none', color: '#fff', borderRadius: 12, padding: '13px',
              cursor: 'pointer', fontWeight: 700, fontSize: 14,
              boxShadow: '0 4px 20px rgba(240,106,0,0.35)',
            }}
          >
            {isThai ? 'ยืนยันการจอง' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
