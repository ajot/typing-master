import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaderboard } from '../components/Leaderboard';
import type { LeaderboardEntry } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL = 5000; // Refresh every 5 seconds

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const navigate = useNavigate();

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/all-time`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="scanlines pointer-events-none" />
      <Leaderboard
        entries={entries}
        isLoading={isLoading}
        onBack={() => navigate('/')}
        showAutoRefresh={true}
        lastUpdated={lastUpdated}
        onRefresh={fetchLeaderboard}
      />
    </div>
  );
}
