import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventDetail = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  organizer_id: string;
  starts_at: string | null;
  ends_at: string | null;
  player_count: number;
  game_count: number;
  top_score: number;
  avg_wpm: number;
  created_at: string;
};

type Player = {
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  email: string;
  email_type: string | null;
  consented: boolean | null;
  games_played: number;
};

type LeaderboardEntry = {
  display_name: string;
  email: string;
  best_score: number;
  best_wpm: number;
  games_played: number;
};

type PromptItem = {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  times_used: number;
};

type Tab = 'leaderboard' | 'players' | 'prompts' | 'settings';

export default function DashboardEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [loading, setLoading] = useState(true);

  // Tab data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  // Settings form
  const [settingsName, setSettingsName] = useState('');
  const [settingsActive, setSettingsActive] = useState(true);
  const [settingsStartsAt, setSettingsStartsAt] = useState('');
  const [settingsEndsAt, setSettingsEndsAt] = useState('');
  const [consentEnabled, setConsentEnabled] = useState(false);
  const [consentLabel, setConsentLabel] = useState('');
  const [consentRequired, setConsentRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prompt form
  const [newPromptText, setNewPromptText] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  const fetchOpts = { credentials: 'include' as const };

  const fetchEvent = () => {
    fetch(`${API_BASE}/api/dashboard/events/${eventId}`, fetchOpts)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        setEvent(data);
        setSettingsName(data.name);
        setSettingsActive(data.is_active);
        setSettingsStartsAt(data.starts_at ? data.starts_at.slice(0, 16) : '');
        setSettingsEndsAt(data.ends_at ? data.ends_at.slice(0, 16) : '');
        const consent = (data.config?.consent as { enabled?: boolean; label?: string; required?: boolean }) || {};
        setConsentEnabled(consent.enabled || false);
        setConsentLabel(consent.label || 'I agree to receive emails');
        setConsentRequired(consent.required ?? true);
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvent(); }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    if (tab === 'leaderboard') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/leaderboard`, fetchOpts)
        .then(res => res.json())
        .then(data => setLeaderboard(data.leaderboard || []));
    } else if (tab === 'players') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/players`, fetchOpts)
        .then(res => res.json())
        .then(data => setPlayers(data.players || []));
    } else if (tab === 'prompts') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, fetchOpts)
        .then(res => res.json())
        .then(data => setPrompts(data));
    }
  }, [eventId, tab]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const config: Record<string, unknown> = { ...(event?.config || {}) };
    if (consentEnabled) {
      config.consent = { enabled: true, label: consentLabel, required: consentRequired };
    } else {
      delete config.consent;
    }

    await fetch(`${API_BASE}/api/dashboard/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settingsName,
        is_active: settingsActive,
        config,
        starts_at: settingsStartsAt || null,
        ends_at: settingsEndsAt || null,
      }),
      credentials: 'include',
    });
    fetchEvent();
    setSaving(false);
  };

  const handleExportCSV = async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/events/${eventId}/players/export`, {
      credentials: 'include',
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${event?.slug}-players.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim()) return;
    setCreatingPrompt(true);
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newPromptText.trim() }),
      credentials: 'include',
    });
    setNewPromptText('');
    setCreatingPrompt(false);
    // Refresh prompts
    fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, fetchOpts)
      .then(res => res.json())
      .then(data => setPrompts(data));
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Delete this prompt?')) return;
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts/${promptId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleDeleteEvent = async () => {
    if (!confirm('This will permanently delete the event and its consent records. Player scores will be preserved. This cannot be undone.')) return;
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    navigate('/dashboard');
  };

  if (loading || !event) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'players', label: 'Players' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">/{event.slug}</p>
        <h1 className="text-2xl font-semibold text-gray-900">{event.name}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Players', value: event.player_count },
          { label: 'Games', value: event.game_count },
          { label: 'Top Score', value: event.top_score.toLocaleString() },
          { label: 'Avg WPM', value: event.avg_wpm },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 ${
                tab === t.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'leaderboard' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {leaderboard.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No scores yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Best Score</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">WPM</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.display_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.email}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{entry.best_score.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{entry.best_wpm}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">{entry.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {players.length === 0 ? (
              <p className="p-8 text-center text-gray-400">No players yet</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Consent</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{player.display_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{player.email}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        {player.consented === true ? (
                          <span className="text-green-600">Yes</span>
                        ) : player.consented === false ? (
                          <span className="text-red-600">No</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{player.games_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'prompts' && (
        <div>
          <form onSubmit={handleCreatePrompt} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Custom Prompt</label>
            <textarea
              value={newPromptText}
              onChange={e => setNewPromptText(e.target.value)}
              placeholder="Enter the typing text that players will see..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creatingPrompt || !newPromptText.trim()}
              className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {creatingPrompt ? 'Adding...' : 'Add Prompt'}
            </button>
          </form>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {prompts.length === 0 ? (
              <p className="p-8 text-center text-gray-400">
                No custom prompts. Players will use the global prompt pool.
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Text</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map(prompt => (
                    <tr key={prompt.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{prompt.text}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{prompt.times_used}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={e => setSettingsName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={settingsActive}
                onChange={e => setSettingsActive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="active" className="text-sm text-gray-700">Event is active</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={settingsStartsAt}
                  onChange={e => setSettingsStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={settingsEndsAt}
                  onChange={e => setSettingsEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentEnabled}
                  onChange={e => setConsentEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="consent" className="text-sm font-medium text-gray-700">Enable consent checkbox</label>
              </div>
              {consentEnabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    value={consentLabel}
                    onChange={e => setConsentLabel(e.target.value)}
                    placeholder="Consent label text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consentRequired"
                      checked={consentRequired}
                      onChange={e => setConsentRequired(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="consentRequired" className="text-sm text-gray-700">Required</label>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-8 bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">
              Deleting this event will remove all consent records. Player scores will be preserved.
            </p>
            <button
              onClick={handleDeleteEvent}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Delete Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
