import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { WelcomeScreen } from './components/WelcomeScreen';
import { TextReveal } from './components/TextReveal';
import { Countdown } from './components/Countdown';
import { TypingGame } from './components/TypingGame';
import { ResultsScreen } from './components/ResultsScreen';
import { Leaderboard } from './components/Leaderboard';
import { useSound } from './hooks/useSound';
import { EventProvider, useEvent } from './contexts/EventContext';
import type {
  GameState,
  GameStats,
  Player,
  Prompt,
  LeaderboardEntry,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function AppContent() {
  const [gameState, setGameState] = useState<GameState>('welcome');
  const [player, setPlayer] = useState<Player | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const { play } = useSound();
  const { event, isLoading: isEventLoading, error: eventError } = useEvent();

  // Handle countdown tick
  const handleCountdownTick = useCallback(
    (count: number) => {
      if (count > 0) {
        play('countdown');
      }
    },
    [play]
  );

  // Handle key press during game
  const handleKeyPress = useCallback(
    (isCorrect: boolean) => {
      if (isCorrect) {
        play('keypress');
      } else {
        play('error');
      }
    },
    [play]
  );

  // Fetch leaderboard (all-time for easier testing)
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const url = event
        ? `${API_BASE}/api/leaderboard/all-time?event_id=${event.id}`
        : `${API_BASE}/api/leaderboard/all-time`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [event]);

  // Fetch leaderboard when viewing results
  useEffect(() => {
    if (gameState === 'results') {
      fetchLeaderboard();
    }
  }, [gameState, fetchLeaderboard]);

  // Show event loading/error states
  if (isEventLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-retro-cyan text-xl animate-pulse">LOADING EVENT...</div>
      </div>
    );
  }

  if (eventError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="retro-panel p-8 text-center">
          <h1 className="text-2xl text-retro-red mb-4">EVENT NOT FOUND</h1>
          <p className="text-retro-gray text-xs mb-4">This event doesn't exist or is no longer active.</p>
          <a href="/" className="retro-button inline-block">GO HOME</a>
        </div>
      </div>
    );
  }

  // Register player and fetch prompt
  const handleStart = async (nickname: string, email: string, consented?: boolean) => {
    try {
      setError(null);

      // Register or get existing player
      const playerRes = await fetch(`${API_BASE}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email }),
      });

      if (!playerRes.ok) {
        throw new Error('Failed to register player');
      }

      const playerData = await playerRes.json();
      setPlayer(playerData);

      // Record consent for event games
      if (event) {
        try {
          await fetch(`${API_BASE}/api/events/${event.id}/consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player_id: playerData.id,
              consented: consented ?? null,
            }),
          });
        } catch (err) {
          console.error('Failed to record consent:', err);
        }
      }

      // Capture started_at timestamp
      setStartedAt(new Date().toISOString());

      // Fetch random prompt
      const promptRes = await fetch(`${API_BASE}/api/prompts/random`);
      if (!promptRes.ok) {
        throw new Error('Failed to fetch prompt');
      }

      const promptData = await promptRes.json();
      setPrompt(promptData);

      // Move to get ready state
      setGameState('getReady');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  // Handle text reveal complete
  const handleTextRevealComplete = () => {
    setGameState('countdown');
  };

  // Handle countdown complete
  const handleCountdownComplete = () => {
    setGameState('playing');
  };

  // Handle game complete
  const handleGameComplete = async (stats: GameStats) => {
    setFinalStats(stats);
    play('gameOver');

    // Submit score to API
    if (player && prompt) {
      try {
        const res = await fetch(`${API_BASE}/api/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: player.id,
            prompt_id: prompt.id,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            event_id: event?.id,
            started_at: startedAt,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Score submission failed:', res.status, errorData);
        } else {
          console.log('Score submitted successfully');
        }
      } catch (err) {
        console.error('Failed to submit score:', err);
      }
    } else {
      console.error('Cannot submit score: player or prompt is missing', { player, prompt });
    }

    setGameState('results');
  };

  // Handle view leaderboard
  const handleViewLeaderboard = () => {
    fetchLeaderboard();
    setGameState('leaderboard');
  };

  // Handle play again
  const handlePlayAgain = async () => {
    // Fetch new prompt
    try {
      const promptRes = await fetch(`${API_BASE}/api/prompts/random`);
      if (promptRes.ok) {
        const promptData = await promptRes.json();
        setPrompt(promptData);
      }
    } catch (err) {
      console.error('Failed to fetch prompt:', err);
    }

    setFinalStats(null);
    setStartedAt(new Date().toISOString());
    setGameState('getReady');
  };

  // Handle back to welcome
  const handleBackToWelcome = () => {
    setPlayer(null);
    setPrompt(null);
    setFinalStats(null);
    setGameState('welcome');
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Scanline overlay */}
      <div className="scanlines pointer-events-none" />

      {/* Error display */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="retro-panel p-4 bg-retro-red/20 border-retro-red">
            <p className="text-retro-red text-xs">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-retro-gray text-xs mt-2 hover:text-white"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Game States */}
      {gameState === 'welcome' && <WelcomeScreen onStart={handleStart} />}

      {gameState === 'getReady' && prompt && (
        <TextReveal text={prompt.text} onComplete={handleTextRevealComplete} />
      )}

      {gameState === 'countdown' && (
        <Countdown
          onComplete={handleCountdownComplete}
          onTick={handleCountdownTick}
        />
      )}

      {gameState === 'playing' && prompt && (
        <TypingGame
          text={prompt.text}
          onComplete={handleGameComplete}
          onKeyPress={handleKeyPress}
          duration={60}
        />
      )}

      {gameState === 'results' && finalStats && player && (
        <ResultsScreen
          stats={finalStats}
          nickname={player.nickname}
          onPlayAgain={handlePlayAgain}
          onViewLeaderboard={handleViewLeaderboard}
          onNewPlayer={handleBackToWelcome}
        />
      )}

      {gameState === 'leaderboard' && (
        <Leaderboard
          entries={leaderboard}
          currentPlayerScore={finalStats?.score}
          onBack={() => setGameState(finalStats ? 'results' : 'welcome')}
          onPlayAgain={player ? handlePlayAgain : undefined}
          onNewPlayer={handleBackToWelcome}
          isLoading={isLoadingLeaderboard}
          title={event?.config?.leaderboard_title}
        />
      )}
    </div>
  );
}

function App() {
  const { eventSlug } = useParams<{ eventSlug?: string }>();

  return (
    <EventProvider eventSlug={eventSlug}>
      <AppContent />
    </EventProvider>
  );
}

export default App;
