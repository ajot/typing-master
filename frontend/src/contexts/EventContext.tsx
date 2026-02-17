import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { EventConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventContextType = {
  event: EventConfig | null;
  isLoading: boolean;
  error: string | null;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ eventSlug, children }: { eventSlug?: string; children: ReactNode }) {
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [isLoading, setIsLoading] = useState(!!eventSlug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventSlug) return;

    let cancelled = false;
    setIsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- standard data-fetching pattern
    setError(null);

    fetch(`${API_BASE}/api/events/${eventSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEvent(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventSlug]);

  return (
    <EventContext.Provider value={{ event, isLoading, error }}>
      {children}
    </EventContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
