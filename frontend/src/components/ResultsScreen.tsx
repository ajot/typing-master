import { useEffect, useState } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import type { GameStats } from '../types';

interface ResultsScreenProps {
  stats: GameStats;
  nickname: string;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onNewPlayer?: () => void;
}

export function ResultsScreen({
  stats,
  nickname,
  onPlayAgain,
  onViewLeaderboard,
  onNewPlayer,
}: ResultsScreenProps) {
  // Determine performance message
  const getPerformanceMessage = () => {
    if (stats.wpm >= 80 && stats.accuracy >= 0.95) {
      return { message: 'LEGENDARY!', color: 'text-accent' };
    }
    if (stats.wpm >= 60 && stats.accuracy >= 0.9) {
      return { message: 'EXCELLENT!', color: 'text-retro-green' };
    }
    if (stats.wpm >= 40 && stats.accuracy >= 0.8) {
      return { message: 'GREAT JOB!', color: 'text-retro-cyan' };
    }
    if (stats.wpm >= 20) {
      return { message: 'GOOD EFFORT!', color: 'text-white' };
    }
    return { message: 'KEEP PRACTICING!', color: 'text-retro-gray' };
  };

  const performance = getPerformanceMessage();

  // AI message state
  const [aiMessage, setAiMessage] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(true);

  // Typewriter effect for AI message
  const { displayText: typewriterText, isComplete: typewriterComplete, start: startTypewriter } = useTypewriter({
    text: aiMessage,
    speed: 40,
    startDelay: 200,
  });

  // Fetch AI-generated performance message
  useEffect(() => {
    const fetchAiMessage = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch('/api/ai/performance-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            score: stats.score,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setAiMessage(data.message);
        } else {
          setAiMessage(performance.message);
        }
      } catch {
        // Use fallback on error or timeout
        setAiMessage(performance.message);
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchAiMessage();
  }, [nickname, stats.wpm, stats.accuracy, stats.score, performance.message]);

  // Start typewriter when AI message is loaded
  useEffect(() => {
    if (!isAiLoading && aiMessage) {
      startTypewriter();
    }
  }, [isAiLoading, aiMessage, startTypewriter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayAgain();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          onViewLeaderboard();
          break;
        case 'n':
        case 'N':
          if (onNewPlayer) {
            e.preventDefault();
            onNewPlayer();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayAgain, onViewLeaderboard, onNewPlayer]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="retro-panel p-8 max-w-lg w-full text-center">
        {/* Header */}
        <h2 className="text-retro-cyan text-sm mb-2">GAME OVER</h2>
        <h1 className={`text-3xl ${performance.color} text-glow mb-4`}>
          {performance.message}
        </h1>

        {/* AI Message Box */}
        <div className="retro-panel p-4 mb-6 border-accent/50 bg-black/50">
          <p className="text-retro-gray text-xs mb-2">
            <span className="text-accent">░░</span> Gradient AI WISDOM <span className="text-accent">░░</span>
          </p>
          <div className="min-h-[3rem] flex items-center justify-center">
            {isAiLoading ? (
              <p className="text-retro-gray text-sm animate-pulse">Generating wisdom...</p>
            ) : (
              <p className={`text-white text-sm leading-relaxed ${typewriterComplete ? '' : 'after:content-["▌"] after:animate-pulse after:text-accent'}`}>
                "{typewriterText}"
              </p>
            )}
          </div>
          <p className="text-retro-gray text-xs mt-2 opacity-60">
            - Powered by Gradient AI
          </p>
        </div>

        {/* Player Name */}
        <p className="text-retro-gray text-xs mb-8">
          PLAYER: <span className="text-white">{nickname.toUpperCase()}</span>
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Final Score */}
          <div className="retro-panel p-4 col-span-2">
            <p className="text-retro-gray text-xs mb-1">FINAL SCORE</p>
            <p className="text-4xl text-accent text-glow">{stats.score}</p>
          </div>

          {/* WPM */}
          <div className="retro-panel p-4">
            <p className="text-retro-gray text-xs mb-1">WORDS/MIN</p>
            <p className="text-2xl text-retro-cyan text-glow">{stats.wpm}</p>
          </div>

          {/* Accuracy */}
          <div className="retro-panel p-4">
            <p className="text-retro-gray text-xs mb-1">ACCURACY</p>
            <p
              className={`text-2xl ${
                stats.accuracy >= 0.9
                  ? 'text-retro-green'
                  : stats.accuracy >= 0.7
                  ? 'text-accent'
                  : 'text-retro-red'
              } text-glow`}
            >
              {Math.round(stats.accuracy * 100)}%
            </p>
          </div>

          {/* Characters Typed */}
          <div className="retro-panel p-4">
            <p className="text-retro-gray text-xs mb-1">CHARS TYPED</p>
            <p className="text-2xl text-white">{stats.totalChars}</p>
          </div>

          {/* Correct Characters */}
          <div className="retro-panel p-4">
            <p className="text-retro-gray text-xs mb-1">CORRECT</p>
            <p className="text-2xl text-retro-green">{stats.correctChars}</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="text-retro-gray text-xs mb-8 border-t border-retro-gray/30 pt-4">
          <p>SCORE = WPM x ACCURACY x 100</p>
          <p className="mt-1">
            {stats.wpm} x {Math.round(stats.accuracy * 100)}% = {stats.score}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={onPlayAgain} className="retro-button w-full">
            PLAY AGAIN <span className="text-retro-cyan">[SPACE]</span>
          </button>
          <button
            onClick={onViewLeaderboard}
            className="retro-button w-full bg-retro-cyan/20 hover:bg-retro-cyan/30"
          >
            VIEW LEADERBOARD <span className="text-retro-cyan">[L]</span>
          </button>
          {onNewPlayer && (
            <button
              onClick={onNewPlayer}
              className="retro-button w-full bg-transparent border-retro-gray hover:bg-retro-gray/20"
            >
              NEW PLAYER <span className="text-retro-cyan">[N]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
