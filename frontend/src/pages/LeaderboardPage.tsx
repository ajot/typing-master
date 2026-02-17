import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Leaderboard } from '../components/Leaderboard';
import type { LeaderboardEntry, EventConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL = 5000; // Refresh every 5 seconds

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { eventSlug } = useParams<{ eventSlug?: string }>();

  // Fetch event data if slug is present
  useEffect(() => {
    if (!eventSlug) return;

    fetch(`${API_BASE}/api/events/${eventSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then((data) => setEvent(data))
      .catch((err) => setEventError(err.message));
  }, [eventSlug]);

  const fetchLeaderboard = async (eventId?: string) => {
    try {
      const url = eventId
        ? `${API_BASE}/api/leaderboard/all-time?event_id=${eventId}`
        : `${API_BASE}/api/leaderboard/all-time`;
      const res = await fetch(url);
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

  // Initial fetch and auto-refresh — depends on event being loaded for event pages
  useEffect(() => {
    if (eventSlug && !event) return; // Wait for event to load

    const eventId = event?.id;
    fetchLeaderboard(eventId);
    const interval = setInterval(() => fetchLeaderboard(eventId), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [event, eventSlug]);

  if (eventError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="scanlines pointer-events-none" />
        <div className="retro-panel p-8 text-center">
          <h1 className="text-2xl text-retro-red mb-4">EVENT NOT FOUND</h1>
          <p className="text-retro-gray text-xs mb-4">This event doesn't exist or is no longer active.</p>
          <a href="/" className="retro-button inline-block">GO HOME</a>
        </div>
      </div>
    );
  }

  const basePath = eventSlug ? `/${eventSlug}` : '/';

  return (
    <div className="min-h-screen bg-black">
      <div className="scanlines pointer-events-none" />
      <Leaderboard
        entries={entries}
        isLoading={isLoading}
        onBack={() => navigate(basePath)}
        onNewPlayer={() => navigate(basePath)}
        showAutoRefresh={true}
        lastUpdated={lastUpdated}
        onRefresh={() => fetchLeaderboard(event?.id)}
        title={event?.config?.leaderboard_title}
      />
    </div>
  );
}
