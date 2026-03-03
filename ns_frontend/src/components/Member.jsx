import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Member.css';

const API_BASE = 'http://localhost:3000';

export default function Member({ user }) {
  const navigate = useNavigate();
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get(`${API_BASE}/users/${user.uid}`);
        if (isMounted) setDbUser(res.data);
      } catch (_err) {
        if (isMounted) setError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const avatarUrl = useMemo(() => {
    const url = dbUser?.photoURL || user?.photoURL;
    if (!url) return '';
    if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
    return url;
  }, [dbUser, user]);

  const coin = useMemo(() => {
    if (!dbUser) return 0;
    const value = dbUser.coin ?? dbUser.coins ?? dbUser.balance ?? 0;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }, [dbUser]);

  if (!user) {
    return (
      <div className="member-page">
        <div className="member-card">
          <h2>Member</h2>
          <p>กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
          <button className="member-btn" onClick={() => navigate('/login')}>
            ไปหน้า Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="member-page">
      <div className="member-card">
        <div className="member-header">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="member-avatar" />
          ) : (
            <div className="member-avatar member-avatar-fallback">U</div>
          )}
          <div>
            <h2 className="member-title">{dbUser?.displayName || user.displayName || 'User'}</h2>
            <p className="member-subtitle">{dbUser?.email || user.email || '-'}</p>
          </div>
        </div>

        {loading && <p className="member-status">กำลังโหลดข้อมูล...</p>}
        {error && <p className="member-status member-error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="member-coin-box">
              <span className="member-coin-label">Coin</span>
              <span className="member-coin-value">{coin.toLocaleString()}</span>
            </div>

            <div className="member-info">
              <div className="member-row">
                <span>Firebase UID</span>
                <strong>{dbUser?.firebaseUid || user.uid}</strong>
              </div>
              <div className="member-row">
                <span>Phone</span>
                <strong>{dbUser?.phone || '-'}</strong>
              </div>
              <div className="member-row">
                <span>Birthday</span>
                <strong>
                  {dbUser?.birthday ? new Date(dbUser.birthday).toLocaleDateString('th-TH') : '-'}
                </strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
