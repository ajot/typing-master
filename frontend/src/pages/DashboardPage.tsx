import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventSummary = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  player_count: number;
  game_count: number;
  created_at: string;
};

const RESERVED_SLUGS = new Set([
  'admin', 'dashboard', 'login', 'signup', 'host', 'leaderboard',
  'api', 'static', 'health', 'about', 'terms', 'privacy', 'vibe', 'play'
]);

export default function DashboardPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEvents = () => {
    fetch(`${API_BASE}/api/dashboard/events`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setNewSlug(slug);
    if (RESERVED_SLUGS.has(slug)) {
      setSlugError('This slug is reserved');
    } else {
      setSlugError('');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim() || slugError) return;
    setCreating(true);

    const res = await fetch(`${API_BASE}/api/dashboard/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      credentials: 'include',
    });

    if (res.ok) {
      setNewName('');
      setNewSlug('');
      setShowCreate(false);
      fetchEvents();
    } else {
      const data = await res.json();
      setSlugError(data.error || 'Failed to create event');
    }
    setCreating(false);
  };

  if (loading) {
    return <div className="text-gray-400">Loading events...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
        >
          Create Event
        </button>
      </div>

      {/* Create event form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="GTC 2026"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="gtc-2026"
                required
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${slugError ? 'border-red-300' : 'border-gray-300'}`}
              />
              {slugError && <p className="text-red-600 text-xs mt-1">{slugError}</p>}
              {newSlug && !slugError && (
                <p className="text-gray-400 text-xs mt-1">Players will visit: /{newSlug}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={creating || !newName.trim() || !newSlug.trim() || !!slugError}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-2">No events yet</p>
          <p className="text-gray-400 text-sm">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Players</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/events/${event.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">/{event.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{event.player_count}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{event.game_count}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">
                    {new Date(event.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
