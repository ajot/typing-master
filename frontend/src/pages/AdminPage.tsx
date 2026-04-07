import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

type PlayerStats = {
  id: string;
  email: string;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
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

type EventPlayer = {
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  email: string;
  email_type: string | null;
  consented: boolean | null;
  ip_address: string | null;
  joined_event_at: string | null;
  games_played: number;
};

type EventPlayersData = {
  event_id: string;
  event_name: string;
  total_players: number;
  total_games: number;
  players: EventPlayer[];
};

type Tab = 'players' | 'prompts' | 'events';
type SortField = 'best_score' | 'avg_wpm' | 'avg_accuracy' | null;
type SortDirection = 'asc' | 'desc';

const CATEGORIES = ['droplets', 'kubernetes', 'app-platform', 'databases', 'spaces', 'gradient-ai', 'general'];

const fetchOpts: RequestInit = { credentials: 'include' };

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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Event players state
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventPlayersCache, setEventPlayersCache] = useState<Record<string, EventPlayersData>>({});
  const [eventPlayersLoading, setEventPlayersLoading] = useState(false);

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
      const res = await fetch(url, fetchOpts);
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
      const res = await fetch(`${API_BASE}/api/prompts`, fetchOpts);
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
      const res = await fetch(`${API_BASE}/api/events`, fetchOpts);
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

    const headers = ['Name', 'Email', 'Type', 'Games Played', 'Best Score', 'Avg WPM', 'Avg Accuracy'];
    const rows = stats.players.map(p => [
      p.display_name,
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
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
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
    return sortDirection === 'desc' ? ' \u25BC' : ' \u25B2';
  };

  const analyzeEmails = async (reanalyze: boolean = false) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/analyze-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reanalyze }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
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
        body: JSON.stringify({ is_active: !isActive }),
        credentials: 'include',
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
        method: 'DELETE',
        credentials: 'include',
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
        }),
        credentials: 'include',
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
        }),
        credentials: 'include',
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
  const buildEventConfig = (): EventData['config'] => {
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
    return config;
  };

  const clearEventEditor = () => {
    setEditingEventId(null);
    setNewEventSlug('');
    setNewEventName('');
    setNewEventSubtitle('');
    setNewEventConsentEnabled(false);
    setNewEventConsentLabel('I agree to receive emails from DigitalOcean');
    setNewEventConsentRequired(true);
    setNewEventLeaderboardTitle('');
    setEventsError(null);
  };

  const editEvent = (event: EventData) => {
    setEditingEventId(event.id);
    setNewEventSlug(event.slug);
    setNewEventName(event.name);
    setNewEventSubtitle(event.config?.subtitle || '');
    setNewEventConsentEnabled(event.config?.consent?.enabled || false);
    setNewEventConsentLabel(event.config?.consent?.label || 'I agree to receive emails from DigitalOcean');
    setNewEventConsentRequired(event.config?.consent?.required ?? true);
    setNewEventLeaderboardTitle(event.config?.leaderboard_title || '');
    setEventsError(null);
  };

  const saveEvent = async () => {
    if (!newEventSlug.trim() || !newEventName.trim()) {
      setEventsError('Slug and name are required');
      return;
    }
    setIsCreatingEvent(true);
    setEventsError(null);
    try {
      const config = buildEventConfig();
      const isEditing = editingEventId !== null;

      if (isEditing) {
        const res = await fetch(`${API_BASE}/api/events/${editingEventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newEventName.trim(), config }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update event');
        setEvents(events.map(e => e.id === editingEventId ? data : e));
      } else {
        const res = await fetch(`${API_BASE}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: newEventSlug.trim().toLowerCase(),
            name: newEventName.trim(),
            config,
          }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create event');
        setEvents([data, ...events]);
      }
      clearEventEditor();
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all consent records.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete event');
      setEvents(events.filter(e => e.id !== eventId));
      if (editingEventId === eventId) clearEventEditor();
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const fetchEventPlayers = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }
    setExpandedEventId(eventId);
    if (eventPlayersCache[eventId]) return;
    setEventPlayersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${eventId}/players`, fetchOpts);
      if (!res.ok) throw new Error('Failed to fetch event players');
      const data = await res.json();
      setEventPlayersCache(prev => ({ ...prev, [eventId]: data }));
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to fetch event players');
      setExpandedEventId(null);
    } finally {
      setEventPlayersLoading(false);
    }
  };

  const exportEventCSV = (eventId: string) => {
    const data = eventPlayersCache[eventId];
    if (!data || data.players.length === 0) return;

    const headers = ['First Name', 'Last Name', 'Email', 'Type', 'Consented', 'IP Address', 'Joined At', 'Games Played'];
    const rows = data.players.map(p => [
      p.first_name || '',
      p.last_name || '',
      p.email,
      p.email_type === 'do_employee' ? 'Shark' : (p.email_type || ''),
      p.consented === true ? 'Yes' : p.consented === false ? 'No' : 'N/A',
      p.ip_address || '',
      p.joined_event_at ? new Date(p.joined_event_at).toLocaleString() : '',
      p.games_played
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const eventSlug = events.find(e => e.id === eventId)?.slug || eventId;
    link.download = `event-${eventSlug}-players-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleEventActive = async (eventId: string, isActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update event');
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, is_active: !isActive } : e
      ));
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  const emailTypeBadge = (type: string | null) => {
    if (!type) return <span className="text-gray-400">-</span>;
    const styles: Record<string, string> = {
      do_employee: 'bg-blue-50 text-blue-700 border border-blue-200',
      company: 'bg-purple-50 text-purple-700 border border-purple-200',
      personal: 'bg-green-50 text-green-700 border border-green-200',
      typo: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      suspicious: 'bg-red-50 text-red-700 border border-red-200',
      fake: 'bg-red-50 text-red-700 border border-red-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
        {type === 'do_employee' ? 'Shark' : type}
      </span>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'players', label: 'Players' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'events', label: 'Events' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage players, prompts, and events</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-do-orange text-do-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Players Tab */}
      {activeTab === 'players' && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Total Players</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_players}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Total Games</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_games}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Players with Games</p>
                <p className="text-3xl font-bold text-gray-900">{stats.players_with_games}</p>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Players</label>
                <div className="flex gap-2">
                  {(['all', 'only_do', 'exclude_do'] as const).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDoFilter(val)}
                      className={`px-4 py-2 text-xs font-medium rounded-md border transition-colors ${
                        doFilter === val
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {val === 'all' ? 'All' : val === 'only_do' ? 'Only DO' : 'Exclude DO'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => analyzeEmails(false)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Emails'}
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  disabled={!stats || stats.players.length === 0}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <form onSubmit={handleFilter} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Email</label>
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                  placeholder="@example.com, user@test.com"
                />
              </div>
              <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800">
                Filter
              </button>
              {emailFilter && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-400 animate-pulse">Loading...</p>
            </div>
          )}

          {/* Players Table */}
          {!isLoading && stats && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Players ({stats.players.length})</h2>
              </div>

              {stats.players.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No players found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Email</th>
                        <th className="text-center py-3 px-4 font-medium">Type</th>
                        <th className="text-right py-3 px-4 font-medium">Games</th>
                        <th
                          className="text-right py-3 px-4 font-medium cursor-pointer hover:text-gray-700 select-none"
                          onClick={() => handleSort('best_score')}
                        >
                          Best{getSortIndicator('best_score')}
                        </th>
                        <th
                          className="text-right py-3 px-4 font-medium cursor-pointer hover:text-gray-700 select-none"
                          onClick={() => handleSort('avg_wpm')}
                        >
                          Avg WPM{getSortIndicator('avg_wpm')}
                        </th>
                        <th
                          className="text-right py-3 px-4 font-medium cursor-pointer hover:text-gray-700 select-none"
                          onClick={() => handleSort('avg_accuracy')}
                        >
                          Avg Acc{getSortIndicator('avg_accuracy')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getSortedPlayers().map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900 font-medium">{player.display_name}</td>
                          <td className="py-3 px-4 text-gray-500">{player.email}</td>
                          <td className="py-3 px-4 text-center">{emailTypeBadge(player.email_type)}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{player.games_played}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">{player.best_score.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{player.avg_wpm}</td>
                          <td className={`py-3 px-4 text-right ${
                            player.avg_accuracy >= 95 ? 'text-green-600' :
                            player.avg_accuracy >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
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
          {/* Editor Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6 sticky top-4 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingPromptId ? 'Edit Prompt' : 'Create New Prompt'}
              </h2>
              {editingPromptId && (
                <button onClick={clearEditor} className="text-gray-400 text-sm hover:text-gray-600">
                  Cancel
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newPromptCategory}
                onChange={(e) => setNewPromptCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Text
                <span className={`ml-2 text-xs font-normal ${
                  newPromptText.length < 150 ? 'text-red-500' :
                  newPromptText.length > 250 ? 'text-red-500' :
                  'text-green-600'
                }`}>
                  ({newPromptText.length}/150-250 chars)
                </span>
              </label>
              <textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                placeholder="Click a prompt below to edit, or type new text..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={generatePrompt}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
              <button
                onClick={savePrompt}
                disabled={isSaving || !newPromptText.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingPromptId ? 'Update Prompt' : 'Save Prompt'}
              </button>
            </div>
          </div>

          {/* Prompts Error */}
          {promptsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{promptsError}</p>
            </div>
          )}

          {/* Prompts Loading */}
          {promptsLoading && (
            <div className="text-center py-12">
              <p className="text-gray-400 animate-pulse">Loading prompts...</p>
            </div>
          )}

          {/* Prompts Table */}
          {!promptsLoading && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Prompts ({prompts.length})</h2>
              </div>

              {prompts.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No prompts found</p>
              ) : (
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="text-left py-3 px-4 font-medium">Text</th>
                        <th className="text-center py-3 px-4 font-medium">Category</th>
                        <th className="text-right py-3 px-4 font-medium">Used</th>
                        <th className="text-center py-3 px-4 font-medium">Created</th>
                        <th className="text-center py-3 px-4 font-medium">Active</th>
                        <th className="text-center py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prompts.map((prompt) => (
                        <tr
                          key={prompt.id}
                          onClick={() => editPrompt(prompt)}
                          className={`cursor-pointer transition-colors ${
                            editingPromptId === prompt.id
                              ? 'bg-orange-50 border-l-2 border-l-do-orange'
                              : 'hover:bg-gray-50'
                          } ${!prompt.is_active ? 'opacity-50' : ''}`}
                        >
                          <td className="py-3 px-4 text-gray-900 max-w-xs">
                            <span className="block truncate">
                              {prompt.text.length > 60 ? prompt.text.slice(0, 60) + '...' : prompt.text}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {prompt.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">{prompt.times_used}</td>
                          <td className="py-3 px-4 text-center text-gray-500">
                            {new Date(prompt.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePromptActive(prompt.id, prompt.is_active); }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                prompt.is_active
                                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                  : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                              }`}
                            >
                              {prompt.is_active ? 'On' : 'Off'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                              className="px-3 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete
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
          {/* Event Editor */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingEventId ? 'Edit Event' : 'Create New Event'}
              </h2>
              {editingEventId && (
                <button onClick={clearEventEditor} className="text-gray-400 text-sm hover:text-gray-600">
                  Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL path)</label>
                <input
                  type="text"
                  value={newEventSlug}
                  onChange={(e) => setNewEventSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="ai-summit-2026"
                  disabled={!!editingEventId}
                />
                {editingEventId && (
                  <p className="text-gray-400 text-xs mt-1">Slug cannot be changed after creation</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                  placeholder="AI Summit NYC 2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (optional)</label>
                <input
                  type="text"
                  value={newEventSubtitle}
                  onChange={(e) => setNewEventSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                  placeholder="AI SUMMIT EDITION"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leaderboard Title (optional)</label>
                <input
                  type="text"
                  value={newEventLeaderboardTitle}
                  onChange={(e) => setNewEventLeaderboardTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                  placeholder="AI SUMMIT LEADERBOARD"
                />
              </div>
            </div>

            {/* Consent Config */}
            <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={newEventConsentEnabled}
                  onChange={(e) => setNewEventConsentEnabled(e.target.checked)}
                  className="accent-do-orange"
                />
                <span className="text-sm text-gray-700">Enable consent checkbox</span>
              </label>

              {newEventConsentEnabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consent Label</label>
                    <input
                      type="text"
                      value={newEventConsentLabel}
                      onChange={(e) => setNewEventConsentLabel(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-do-orange/50 focus:border-do-orange"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEventConsentRequired}
                      onChange={(e) => setNewEventConsentRequired(e.target.checked)}
                      className="accent-do-orange"
                    />
                    <span className="text-sm text-gray-700">Required to play</span>
                  </label>
                </div>
              )}
            </div>

            <button
              onClick={saveEvent}
              disabled={isCreatingEvent || !newEventSlug.trim() || !newEventName.trim()}
              className="w-full px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isCreatingEvent ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
            </button>
          </div>

          {/* Events Error */}
          {eventsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{eventsError}</p>
            </div>
          )}

          {/* Events Loading */}
          {eventsLoading && (
            <div className="text-center py-12">
              <p className="text-gray-400 animate-pulse">Loading events...</p>
            </div>
          )}

          {/* Events List */}
          {!eventsLoading && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Events ({events.length})</h2>
              </div>

              {events.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No events created yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-5 transition-colors ${
                        editingEventId === event.id
                          ? 'bg-orange-50'
                          : event.is_active
                          ? ''
                          : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-gray-900">{event.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              event.is_active
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-blue-600 font-mono">/{event.slug}</span>
                            {event.config?.subtitle && (
                              <span className="text-gray-500">{event.config.subtitle}</span>
                            )}
                            {event.config?.consent?.enabled && (
                              <span className="text-orange-600">
                                Consent {event.config.consent.required ? '(required)' : '(optional)'}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            Created {new Date(event.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchEventPlayers(event.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              expandedEventId === event.id
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {expandedEventId === event.id ? 'Hide Players' : 'View Players'}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/${event.slug}`);
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            title="Copy event URL"
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={() => editEvent(event)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleEventActive(event.id, event.is_active)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          >
                            {event.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md text-red-600 border border-red-200 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Event Players Expansion */}
                      {expandedEventId === event.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {eventPlayersLoading && !eventPlayersCache[event.id] ? (
                            <p className="text-gray-400 text-sm animate-pulse text-center py-4">Loading players...</p>
                          ) : eventPlayersCache[event.id] ? (
                            <>
                              {/* Summary stats */}
                              <div className="flex items-center gap-6 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">Players:</span>
                                  <span className="text-sm font-semibold text-gray-900">{eventPlayersCache[event.id].total_players}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">Total Games:</span>
                                  <span className="text-sm font-semibold text-gray-900">{eventPlayersCache[event.id].total_games}</span>
                                </div>
                                <button
                                  onClick={() => exportEventCSV(event.id)}
                                  disabled={eventPlayersCache[event.id].players.length === 0}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 ml-auto"
                                >
                                  Export CSV
                                </button>
                              </div>

                              {/* Players table */}
                              {eventPlayersCache[event.id].players.length === 0 ? (
                                <p className="text-gray-400 text-center py-4 text-sm">No players registered for this event</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                        <th className="text-left py-2 px-3 font-medium">First Name</th>
                                        <th className="text-left py-2 px-3 font-medium">Last Name</th>
                                        <th className="text-left py-2 px-3 font-medium">Email</th>
                                        <th className="text-center py-2 px-3 font-medium">Type</th>
                                        <th className="text-center py-2 px-3 font-medium">Consented</th>
                                        <th className="text-left py-2 px-3 font-medium">IP</th>
                                        <th className="text-left py-2 px-3 font-medium">Joined At</th>
                                        <th className="text-right py-2 px-3 font-medium">Games</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {eventPlayersCache[event.id].players.map((player, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="py-2 px-3 text-gray-900">{player.first_name || '-'}</td>
                                          <td className="py-2 px-3 text-gray-900">{player.last_name || '-'}</td>
                                          <td className="py-2 px-3 text-gray-500">{player.email}</td>
                                          <td className="py-2 px-3 text-center">{emailTypeBadge(player.email_type)}</td>
                                          <td className="py-2 px-3 text-center">
                                            {player.consented === true ? (
                                              <span className="text-green-600">Yes</span>
                                            ) : player.consented === false ? (
                                              <span className="text-red-600">No</span>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-gray-400 text-xs">{player.ip_address || '-'}</td>
                                          <td className="py-2 px-3 text-gray-400 text-xs">
                                            {player.joined_event_at
                                              ? new Date(player.joined_event_at).toLocaleString()
                                              : '-'}
                                          </td>
                                          <td className="py-2 px-3 text-right text-gray-700">{player.games_played}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
