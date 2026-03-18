export default function BookingCountdownToast({ remainingSeconds, isThai = false }) {
  if (remainingSeconds === null || remainingSeconds === undefined) return null;

  const safe = Math.max(0, Number(remainingSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const urgent = safe <= 120;

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        right: 16,
        zIndex: 2000,
        minWidth: 220,
        maxWidth: 'calc(100vw - 24px)',
        borderRadius: 12,
        border: `1px solid ${urgent ? '#8f3a3a' : '#3b2b1d'}`,
        background: urgent ? 'rgba(160,40,40,0.9)' : 'rgba(25,20,12,0.92)',
        color: '#fff',
        boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
        padding: '10px 12px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.9 }}>
        {isThai ? 'เวลาคงเหลือในการจอง' : 'Booking time left'}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 22,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: 0.6,
          color: urgent ? '#ffd2d2' : '#ffd28f',
        }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, opacity: 0.88 }}>
        {isThai ? 'หมดเวลาแล้วที่นั่งจะถูกปล่อยอัตโนมัติ' : 'Seats are auto-released when time expires'}
      </div>
    </div>
  );
}
