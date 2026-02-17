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

type Prompt = {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  times_used: number;
  created_at: string;
};

type EventData = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  config: {
    subtitle?: string;
    consent?: { enabled: boolean; label: string; required: boolean };
    leaderboard_title?: string;
  };
  created_at: string;
};

type Tab = 'players' | 'prompts' | 'events';
type SortField = 'best_score' | 'avg_wpm' | 'avg_accuracy' | null;
type SortDirection = 'asc' | 'desc';

const CATEGORIES = ['droplets', 'kubernetes', 'app-platform', 'databases', 'spaces', 'gradient-ai', 'general'];

export function AdminPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('players');

  // Players state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [emailFilter, setEmailFilter] = useState('');
  const [doFilter, setDoFilter] = useState<'all' | 'only_do' | 'exclude_do'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Events state
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [newEventSlug, setNewEventSlug] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventSubtitle, setNewEventSubtitle] = useState('');
  const [newEventConsentEnabled, setNewEventConsentEnabled] = useState(false);
  const [newEventConsentLabel, setNewEventConsentLabel] = useState('I agree to receive emails from DigitalOcean');
  const [newEventConsentRequired, setNewEventConsentRequired] = useState(true);
  const [newEventLeaderboardTitle, setNewEventLeaderboardTitle] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

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

  const fetchPrompts = async () => {
    setPromptsLoading(true);
    setPromptsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/prompts`);
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setPrompts(data);
    } catch (err) {
      setPromptsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPromptsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats('', doFilter);
  }, [doFilter]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'prompts') {
      fetchPrompts();
    } else if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab]);

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

  // Prompt management functions
  const togglePromptActive = async (promptId: string, isActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      if (!res.ok) throw new Error('Failed to update prompt');
      setPrompts(prompts.map(p =>
        p.id === promptId ? { ...p, is_active: !isActive } : p
      ));
    } catch (err) {
      setPromptsError(err instanceof Error ? err.message : 'Failed to update prompt');
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/prompts/${promptId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete prompt');
      setPrompts(prompts.filter(p => p.id !== promptId));
    } catch (err) {
      setPromptsError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const generatePrompt = async () => {
    setIsGenerating(true);
    setPromptsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newPromptCategory
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prompt');
      setNewPromptText(data.text);
    } catch (err) {
      setPromptsError(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const savePrompt = async () => {
    if (!newPromptText.trim()) {
      setPromptsError('Prompt text is required');
      return;
    }
    setIsSaving(true);
    setPromptsError(null);
    try {
      const isEditing = editingPromptId !== null;
      const url = isEditing
        ? `${API_BASE}/api/prompts/${editingPromptId}`
        : `${API_BASE}/api/prompts`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newPromptText.trim(),
          category: newPromptCategory,
          is_active: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save prompt');
      if (isEditing) {
        setPrompts(prompts.map(p => p.id === editingPromptId ? data : p));
      } else {
        setPrompts([data, ...prompts]);
      }
      clearEditor();
    } catch (err) {
      setPromptsError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const editPrompt = (prompt: Prompt) => {
    setEditingPromptId(prompt.id);
    setNewPromptText(prompt.text);
    setNewPromptCategory(prompt.category);
    setPromptsError(null);
  };

  const clearEditor = () => {
    setEditingPromptId(null);
    setNewPromptText('');
    setNewPromptCategory('general');
    setPromptsError(null);
  };

  // Event management functions
  const createEvent = async () => {
    if (!newEventSlug.trim() || !newEventName.trim()) {
      setEventsError('Slug and name are required');
      return;
    }
    setIsCreatingEvent(true);
    setEventsError(null);
    try {
      const config: EventData['config'] = {};
      if (newEventSubtitle.trim()) config.subtitle = newEventSubtitle.trim();
      if (newEventConsentEnabled) {
        config.consent = {
          enabled: true,
          label: newEventConsentLabel.trim(),
          required: newEventConsentRequired,
        };
      }
      if (newEventLeaderboardTitle.trim()) config.leaderboard_title = newEventLeaderboardTitle.trim();

      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newEventSlug.trim().toLowerCase(),
          name: newEventName.trim(),
          config,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event');

      setEvents([data, ...events]);
      setNewEventSlug('');
      setNewEventName('');
      setNewEventSubtitle('');
      setNewEventConsentEnabled(false);
      setNewEventConsentLabel('I agree to receive emails from DigitalOcean');
      setNewEventConsentRequired(true);
      setNewEventLeaderboardTitle('');
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const toggleEventActive = async (eventId: string, isActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error('Failed to update event');
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, is_active: !isActive } : e
      ));
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl text-do-orange text-glow mb-1">ADMIN DASHBOARD</h1>
            <p className="text-retro-gray text-xs">Type the Cloud - Management</p>
          </div>
          <Link to="/" className="text-retro-cyan text-xs hover:text-white">
            ← BACK TO GAME
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`retro-button text-sm px-6 py-2 ${
              activeTab === 'players' ? 'bg-do-orange/30 border-do-orange' : 'bg-transparent'
            }`}
          >
            PLAYERS
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`retro-button text-sm px-6 py-2 ${
              activeTab === 'prompts' ? 'bg-do-orange/30 border-do-orange' : 'bg-transparent'
            }`}
          >
            PROMPTS
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`retro-button text-sm px-6 py-2 ${
              activeTab === 'events' ? 'bg-do-orange/30 border-do-orange' : 'bg-transparent'
            }`}
          >
            EVENTS
          </button>
        </div>

        {/* Players Tab */}
        {activeTab === 'players' && (
          <>
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
          </>
        )}

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <>
            {/* Editor Panel - Sticky */}
            <div className="retro-panel p-4 mb-6 sticky top-4 z-10 bg-black">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-retro-cyan text-sm">
                  {editingPromptId ? 'EDIT PROMPT' : 'CREATE NEW PROMPT'}
                </h2>
                {editingPromptId && (
                  <button
                    onClick={clearEditor}
                    className="text-retro-gray text-xs hover:text-white"
                  >
                    ✕ CANCEL
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-retro-gray text-xs mb-2">CATEGORY</label>
                <select
                  value={newPromptCategory}
                  onChange={(e) => setNewPromptCategory(e.target.value)}
                  className="retro-input w-full"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-retro-gray text-xs mb-2">
                  PROMPT TEXT
                  <span className={`ml-2 ${
                    newPromptText.length < 150 ? 'text-retro-red' :
                    newPromptText.length > 250 ? 'text-retro-red' :
                    'text-retro-green'
                  }`}>
                    ({newPromptText.length}/150-250 chars)
                  </span>
                </label>
                <textarea
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  className="retro-input w-full h-24 resize-none"
                  placeholder="Click a prompt below to edit, or type new text..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={generatePrompt}
                  disabled={isGenerating}
                  className="retro-button flex-1 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'GENERATING...' : '✨ GENERATE WITH AI'}
                </button>
                <button
                  onClick={savePrompt}
                  disabled={isSaving || !newPromptText.trim()}
                  className="retro-button flex-1 bg-retro-green/20 hover:bg-retro-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'SAVING...' : editingPromptId ? 'UPDATE PROMPT' : 'SAVE PROMPT'}
                </button>
              </div>
            </div>

            {/* Prompts Error */}
            {promptsError && (
              <div className="retro-panel p-4 mb-6 border-retro-red">
                <p className="text-retro-red text-sm">{promptsError}</p>
              </div>
            )}

            {/* Prompts Loading */}
            {promptsLoading && (
              <div className="text-center py-12">
                <p className="text-retro-cyan text-xl animate-pulse">LOADING PROMPTS...</p>
              </div>
            )}

            {/* Prompts Table */}
            {!promptsLoading && (
              <div className="retro-panel p-4 overflow-visible">
                <h2 className="text-retro-cyan text-sm mb-4">
                  PROMPTS ({prompts.length})
                </h2>

                {prompts.length === 0 ? (
                  <p className="text-retro-gray text-center py-8">No prompts found</p>
                ) : (
                  <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-retro-gray border-b border-retro-gray/30">
                          <th className="text-left py-2 px-2">TEXT</th>
                          <th className="text-center py-2 px-2">CATEGORY</th>
                          <th className="text-right py-2 px-2">USED</th>
                          <th className="text-center py-2 px-2">CREATED</th>
                          <th className="text-center py-2 px-2">ACTIVE</th>
                          <th className="text-center py-2 px-2">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prompts.map((prompt) => (
                          <tr
                            key={prompt.id}
                            onClick={() => editPrompt(prompt)}
                            className={`border-b border-retro-gray/10 cursor-pointer transition-colors ${
                              editingPromptId === prompt.id
                                ? 'bg-do-orange/20 border-l-2 border-l-do-orange'
                                : 'hover:bg-white/5'
                            } ${!prompt.is_active ? 'opacity-50' : ''}`}
                          >
                            <td className="py-2 px-2 text-white max-w-xs">
                              <span className="block truncate">
                                {prompt.text.length > 60 ? prompt.text.slice(0, 60) + '...' : prompt.text}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-do-orange/20 text-do-orange">
                                {prompt.category.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right text-retro-cyan">
                              {prompt.times_used}
                            </td>
                            <td className="py-2 px-2 text-center text-retro-gray">
                              {new Date(prompt.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePromptActive(prompt.id, prompt.is_active); }}
                                className={`px-3 py-1 rounded text-[10px] transition-colors ${
                                  prompt.is_active
                                    ? 'bg-retro-green/30 text-retro-green hover:bg-retro-green/50'
                                    : 'bg-retro-gray/30 text-retro-gray hover:bg-retro-gray/50'
                                }`}
                              >
                                {prompt.is_active ? 'ON' : 'OFF'}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                                className="px-3 py-1 rounded text-[10px] bg-retro-red/20 text-retro-red hover:bg-retro-red/40 transition-colors"
                              >
                                DELETE
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <>
            {/* Create Event Form */}
            <div className="retro-panel p-4 mb-6">
              <h2 className="text-retro-cyan text-sm mb-4">CREATE NEW EVENT</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-retro-gray text-xs mb-2">SLUG (URL PATH)</label>
                  <input
                    type="text"
                    value={newEventSlug}
                    onChange={(e) => setNewEventSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="retro-input w-full"
                    placeholder="ai-summit-2026"
                  />
                </div>
                <div>
                  <label className="block text-retro-gray text-xs mb-2">EVENT NAME</label>
                  <input
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="retro-input w-full"
                    placeholder="AI Summit NYC 2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-retro-gray text-xs mb-2">SUBTITLE (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newEventSubtitle}
                    onChange={(e) => setNewEventSubtitle(e.target.value)}
                    className="retro-input w-full"
                    placeholder="AI SUMMIT EDITION"
                  />
                </div>
                <div>
                  <label className="block text-retro-gray text-xs mb-2">LEADERBOARD TITLE (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newEventLeaderboardTitle}
                    onChange={(e) => setNewEventLeaderboardTitle(e.target.value)}
                    className="retro-input w-full"
                    placeholder="AI SUMMIT LEADERBOARD"
                  />
                </div>
              </div>

              {/* Consent Config */}
              <div className="mb-4 p-3 bg-black/30 rounded">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={newEventConsentEnabled}
                    onChange={(e) => setNewEventConsentEnabled(e.target.checked)}
                    className="accent-do-orange"
                  />
                  <span className="text-retro-gray text-xs">ENABLE CONSENT CHECKBOX</span>
                </label>

                {newEventConsentEnabled && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="block text-retro-gray text-xs mb-2">CONSENT LABEL</label>
                      <input
                        type="text"
                        value={newEventConsentLabel}
                        onChange={(e) => setNewEventConsentLabel(e.target.value)}
                        className="retro-input w-full"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEventConsentRequired}
                        onChange={(e) => setNewEventConsentRequired(e.target.checked)}
                        className="accent-do-orange"
                      />
                      <span className="text-retro-gray text-xs">REQUIRED TO PLAY</span>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={createEvent}
                disabled={isCreatingEvent || !newEventSlug.trim() || !newEventName.trim()}
                className="retro-button w-full bg-retro-green/20 hover:bg-retro-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingEvent ? 'CREATING...' : 'CREATE EVENT'}
              </button>
            </div>

            {/* Events Error */}
            {eventsError && (
              <div className="retro-panel p-4 mb-6 border-retro-red">
                <p className="text-retro-red text-sm">{eventsError}</p>
              </div>
            )}

            {/* Events Loading */}
            {eventsLoading && (
              <div className="text-center py-12">
                <p className="text-retro-cyan text-xl animate-pulse">LOADING EVENTS...</p>
              </div>
            )}

            {/* Events List */}
            {!eventsLoading && (
              <div className="retro-panel p-4">
                <h2 className="text-retro-cyan text-sm mb-4">
                  EVENTS ({events.length})
                </h2>

                {events.length === 0 ? (
                  <p className="text-retro-gray text-center py-8">No events created yet</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={`p-4 rounded border ${
                          event.is_active
                            ? 'border-retro-gray/30 bg-black/30'
                            : 'border-retro-gray/10 bg-black/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-white text-sm">{event.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                event.is_active
                                  ? 'bg-retro-green/20 text-retro-green'
                                  : 'bg-retro-gray/20 text-retro-gray'
                              }`}>
                                {event.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-retro-cyan">/{event.slug}</span>
                              {event.config?.subtitle && (
                                <span className="text-retro-gray">{event.config.subtitle}</span>
                              )}
                              {event.config?.consent?.enabled && (
                                <span className="text-do-orange">
                                  CONSENT {event.config.consent.required ? '(REQUIRED)' : '(OPTIONAL)'}
                                </span>
                              )}
                            </div>
                            <div className="text-retro-gray text-[10px] mt-1">
                              Created {new Date(event.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/${event.slug}`);
                              }}
                              className="retro-button text-xs px-3 py-1 bg-retro-cyan/20 hover:bg-retro-cyan/30"
                              title="Copy event URL"
                            >
                              COPY URL
                            </button>
                            <button
                              onClick={() => toggleEventActive(event.id, event.is_active)}
                              className={`retro-button text-xs px-3 py-1 ${
                                event.is_active
                                  ? 'bg-retro-red/20 hover:bg-retro-red/30'
                                  : 'bg-retro-green/20 hover:bg-retro-green/30'
                              }`}
                            >
                              {event.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-retro-gray text-xs">POWERED BY DIGITALOCEAN</p>
        </div>
      </div>
    </div>
  );
}
