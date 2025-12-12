import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

type PlayerStats = {
  id: string;
  email: string;
  nickname: string;
  email_type: string | null;
  games_played: number;
  best_score: number;
  avg_wpm: number;
  avg_accuracy: number;
  created_at: string | null;
};

type AdminStats = {
  total_players: number;
  total_games: number;
  players_with_games: number;
  players: PlayerStats[];
};

type SortField = 'best_score' | 'avg_wpm' | 'avg_accuracy' | null;
type SortDirection = 'asc' | 'desc';

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [emailFilter, setEmailFilter] = useState('');
  const [doFilter, setDoFilter] = useState<'all' | 'only_do' | 'exclude_do'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchStats = async (filter: string = '', doFilterValue: string = 'all') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('email', filter);
      if (doFilterValue !== 'all') params.set('do_filter', doFilterValue);
      const url = params.toString()
        ? `${API_BASE}/api/admin/stats?${params.toString()}`
        : `${API_BASE}/api/admin/stats`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats('', doFilter);
  }, [doFilter]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(emailFilter, doFilter);
  };

  const clearFilter = () => {
    setEmailFilter('');
    fetchStats('', doFilter);
  };

  const exportCSV = () => {
    if (!stats || stats.players.length === 0) return;

    const headers = ['Nickname', 'Email', 'Type', 'Games Played', 'Best Score', 'Avg WPM', 'Avg Accuracy'];
    const rows = stats.players.map(p => [
      p.nickname,
      p.email,
      p.email_type === 'do_employee' ? 'Shark' : (p.email_type || ''),
      p.games_played,
      p.best_score,
      p.avg_wpm,
      `${p.avg_accuracy}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typing-master-players-${doFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // New field, default to desc
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedPlayers = () => {
    if (!stats || !sortField) return stats?.players || [];

    return [...stats.players].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (aVal - bVal) * multiplier;
    });
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'desc' ? ' ▼' : ' ▲';
  };

  const analyzeEmails = async (reanalyze: boolean = false) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/analyze-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reanalyze })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      // Refresh stats to show new verdicts
      fetchStats(emailFilter, doFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze emails');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl text-do-orange text-glow mb-1">ADMIN DASHBOARD</h1>
            <p className="text-retro-gray text-xs">Type the Cloud - Player Stats</p>
          </div>
          <Link to="/" className="text-retro-cyan text-xs hover:text-white">
            ← BACK TO GAME
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="retro-panel p-4 text-center">
              <p className="text-retro-gray text-xs mb-1">TOTAL PLAYERS</p>
              <p className="text-3xl text-do-orange text-glow">{stats.total_players}</p>
            </div>
            <div className="retro-panel p-4 text-center">
              <p className="text-retro-gray text-xs mb-1">TOTAL GAMES</p>
              <p className="text-3xl text-retro-cyan text-glow">{stats.total_games}</p>
            </div>
            <div className="retro-panel p-4 text-center">
              <p className="text-retro-gray text-xs mb-1">PLAYERS WITH GAMES</p>
              <p className="text-3xl text-retro-green text-glow">{stats.players_with_games}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="retro-panel p-4 mb-6">
          {/* DO Filter Buttons */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <label className="block text-retro-cyan text-xs mb-2">
                SHOW PLAYERS
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDoFilter('all')}
                  className={`retro-button text-xs px-4 py-2 ${
                    doFilter === 'all' ? 'bg-do-orange/30' : 'bg-transparent'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setDoFilter('only_do')}
                  className={`retro-button text-xs px-4 py-2 ${
                    doFilter === 'only_do' ? 'bg-do-orange/30' : 'bg-transparent'
                  }`}
                >
                  ONLY DO
                </button>
                <button
                  type="button"
                  onClick={() => setDoFilter('exclude_do')}
                  className={`retro-button text-xs px-4 py-2 ${
                    doFilter === 'exclude_do' ? 'bg-do-orange/30' : 'bg-transparent'
                  }`}
                >
                  EXCLUDE DO
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => analyzeEmails(false)}
                disabled={isAnalyzing}
                className="retro-button text-xs px-4 py-2 bg-do-orange/20 hover:bg-do-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'ANALYZING...' : 'ANALYZE EMAILS'}
              </button>
              <button
                type="button"
                onClick={exportCSV}
                disabled={!stats || stats.players.length === 0}
                className="retro-button text-xs px-4 py-2 bg-retro-cyan/20 hover:bg-retro-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                EXPORT CSV
              </button>
            </div>
          </div>

          {/* Email Filter */}
          <form onSubmit={handleFilter} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-retro-cyan text-xs mb-2">
                FILTER BY EMAIL
              </label>
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="retro-input w-full"
                placeholder="@example.com, user@test.com"
              />
            </div>
            <button type="submit" className="retro-button">
              FILTER
            </button>
            {emailFilter && (
              <button
                type="button"
                onClick={clearFilter}
                className="retro-button bg-retro-gray/20"
              >
                CLEAR
              </button>
            )}
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="retro-panel p-4 mb-6 border-retro-red">
            <p className="text-retro-red text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-retro-cyan text-xl animate-pulse">LOADING...</p>
          </div>
        )}

        {/* Players Table */}
        {!isLoading && stats && (
          <div className="retro-panel p-4">
            <h2 className="text-retro-cyan text-sm mb-4">
              PLAYERS ({stats.players.length})
            </h2>

            {stats.players.length === 0 ? (
              <p className="text-retro-gray text-center py-8">No players found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-retro-gray border-b border-retro-gray/30">
                      <th className="text-left py-2 px-2">NICKNAME</th>
                      <th className="text-left py-2 px-2">EMAIL</th>
                      <th className="text-center py-2 px-2">TYPE</th>
                      <th className="text-right py-2 px-2">GAMES</th>
                      <th
                        className="text-right py-2 px-2 cursor-pointer hover:text-do-orange select-none"
                        onClick={() => handleSort('best_score')}
                      >
                        BEST{getSortIndicator('best_score')}
                      </th>
                      <th
                        className="text-right py-2 px-2 cursor-pointer hover:text-do-orange select-none"
                        onClick={() => handleSort('avg_wpm')}
                      >
                        AVG WPM{getSortIndicator('avg_wpm')}
                      </th>
                      <th
                        className="text-right py-2 px-2 cursor-pointer hover:text-do-orange select-none"
                        onClick={() => handleSort('avg_accuracy')}
                      >
                        AVG ACC{getSortIndicator('avg_accuracy')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedPlayers().map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-retro-gray/10 hover:bg-white/5"
                      >
                        <td className="py-2 px-2 text-white">
                          {player.nickname.toUpperCase()}
                        </td>
                        <td className="py-2 px-2 text-retro-gray">
                          {player.email}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {player.email_type ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              player.email_type === 'do_employee' ? 'bg-retro-cyan/20 text-retro-cyan' :
                              player.email_type === 'company' ? 'bg-purple-500/20 text-purple-400' :
                              player.email_type === 'personal' ? 'bg-retro-green/20 text-retro-green' :
                              player.email_type === 'typo' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-retro-red/20 text-retro-red'
                            }`}>
                              {player.email_type === 'do_employee' ? '🦈 SHARK' : player.email_type.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-retro-gray">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-retro-cyan">
                          {player.games_played}
                        </td>
                        <td className="py-2 px-2 text-right text-do-orange">
                          {player.best_score.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right text-white">
                          {player.avg_wpm}
                        </td>
                        <td
                          className={`py-2 px-2 text-right ${
                            player.avg_accuracy >= 95
                              ? 'text-retro-green'
                              : player.avg_accuracy >= 80
                              ? 'text-do-orange'
                              : 'text-retro-red'
                          }`}
                        >
                          {player.avg_accuracy}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-retro-gray text-xs">POWERED BY DIGITALOCEAN</p>
        </div>
      </div>
    </div>
  );
}
