import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MainNavbar from '../../components/navigation/MainNavbar';
import { useAppLanguage } from '../../hooks/useAppLanguage';
import { MAIN_API_BASE } from '../../config/runtime';
import './NewPopularPage.css';

const API_BASE = MAIN_API_BASE;
const IMG_BASE = 'https://image.tmdb.org/t/p';

export default function NewPopularPage({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');
  const [loading, setLoading] = useState(true);
  const [newMovies, setNewMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const { lang, isThai } = useAppLanguage();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setLoading(true);
        const [newRes, trendingRes] = await Promise.all([
          axios.get(`${API_BASE}/movies/now-playing`, { params: { lang } }),
          axios.get(`${API_BASE}/movies/trending`, { params: { lang } }),
        ]);
        if (!mounted) return;
        setNewMovies(Array.isArray(newRes.data?.results) ? newRes.data.results : []);
        setTrendingMovies(Array.isArray(trendingRes.data?.results) ? trendingRes.data.results : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [lang]);

  const visibleMovies = useMemo(
    () => (activeTab === 'new' ? newMovies : trendingMovies),
    [activeTab, newMovies, trendingMovies],
  );

  return (
    <div className="new-popular-page">
      <MainNavbar user={user} active="popular" />

      <main className="new-popular-main">
        <div className="new-popular-head">
          <button className="new-popular-back" onClick={() => navigate('/home')}>← {isThai ? 'กลับ' : 'Back'}</button>
          <h1>{isThai ? 'มาใหม่และยอดนิยม' : 'New & Popular'}</h1>
          <p>{isThai ? 'ค้นพบหนังเข้าใหม่และหนังที่กำลังมาแรง' : 'Discover new releases and trending movies'}</p>
        </div>

        <div className="new-popular-tabs">
          <button
            className={`new-popular-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            {isThai ? 'มาใหม่' : 'New'}
          </button>
          <button
            className={`new-popular-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            {isThai ? 'กำลังมาแรง' : 'Trending'}
          </button>
        </div>

        {loading && <p className="new-popular-status">{isThai ? 'กำลังโหลด...' : 'Loading...'}</p>}
        {!loading && visibleMovies.length === 0 && <p className="new-popular-status">{isThai ? 'ไม่พบภาพยนตร์' : 'No movies found.'}</p>}

        {!loading && visibleMovies.length > 0 && (
          <div className="new-popular-grid">
            {visibleMovies.map((movie) => (
              <article key={movie.id} className="new-popular-card">
                <img
                  src={movie.poster_path ? `${IMG_BASE}/w300${movie.poster_path}` : 'https://via.placeholder.com/240x360?text=No+Image'}
                  alt={movie.title}
                />
                <div className="new-popular-card-body">
                  <h3 title={movie.title}>{movie.title}</h3>
                  <button
                    onClick={() =>
                      navigate('/screening-selection', {
                        state: {
                          movieId: movie.id,
                          movieTitle: movie.title || '',
                          posterPath: movie.poster_path || '',
                          lang,
                        },
                      })
                    }
                  >
                    {isThai ? 'จองตอนนี้' : 'Book Now'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
