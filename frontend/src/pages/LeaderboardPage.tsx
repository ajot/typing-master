import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-do-orange';
      case 2:
        return 'text-retro-gray';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-white';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '♔';
      case 2:
        return '♕';
      case 3:
        return '♖';
      default:
        return rank.toString();
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="scanlines pointer-events-none" />

      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="retro-panel p-8 max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl text-do-orange text-glow mb-2">
              LEADERBOARD
            </h1>
            <p className="text-retro-cyan text-xs">ALL-TIME TOP SCORES</p>
            <p className="text-retro-gray text-xs mt-2">
              Auto-refreshes every 5 seconds
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="text-retro-cyan text-xl animate-pulse">
                LOADING...
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && entries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-retro-gray text-sm mb-2">NO SCORES YET!</p>
              <p className="text-retro-cyan text-xs">BE THE FIRST TO PLAY</p>
            </div>
          )}

          {/* Leaderboard Table */}
          {!isLoading && entries.length > 0 && (
            <div className="space-y-2">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 text-retro-gray text-xs px-4 py-2">
                <div className="col-span-1">RANK</div>
                <div className="col-span-4">PLAYER</div>
                <div className="col-span-2 text-right">WPM</div>
                <div className="col-span-2 text-right">ACC</div>
                <div className="col-span-3 text-right">SCORE</div>
              </div>

              {/* Entries */}
              {entries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`
                    grid grid-cols-12 gap-2 px-4 py-3 rounded
                    bg-black/30
                    ${entry.rank <= 3 ? 'border border-retro-gray/30' : ''}
                  `}
                >
                  <div
                    className={`col-span-1 text-lg ${getRankColor(entry.rank)}`}
                  >
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="col-span-4 text-white truncate">
                    {entry.nickname.toUpperCase()}
                  </div>
                  <div className="col-span-2 text-right text-retro-cyan">
                    {entry.wpm}
                  </div>
                  <div
                    className={`col-span-2 text-right ${
                      entry.accuracy >= 95
                        ? 'text-retro-green'
                        : entry.accuracy >= 80
                        ? 'text-do-orange'
                        : 'text-retro-red'
                    }`}
                  >
                    {entry.accuracy}%
                  </div>
                  <div
                    className={`col-span-3 text-right font-bold ${getRankColor(
                      entry.rank
                    )}`}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Last Updated */}
          <div className="text-center mt-6 text-retro-gray text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => navigate('/')}
              className="retro-button flex-1"
            >
              PLAY GAME
            </button>
            <button
              onClick={fetchLeaderboard}
              className="retro-button flex-1 bg-retro-cyan/20 hover:bg-retro-cyan/30"
            >
              REFRESH NOW
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-retro-gray text-xs">POWERED BY DIGITALOCEAN</p>
          </div>
        </div>
      </div>
    </div>
  );
}
