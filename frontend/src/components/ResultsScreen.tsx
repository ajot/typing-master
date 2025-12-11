import { useEffect } from 'react';
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
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
        <h1 className={`text-3xl ${performance.color} text-glow mb-6`}>
          {performance.message}
        </h1>

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
            PLAY AGAIN <span className="text-retro-gray">[ENTER]</span>
          </button>
          <button
            onClick={onViewLeaderboard}
            className="retro-button w-full bg-retro-cyan/20 hover:bg-retro-cyan/30"
          >
            VIEW LEADERBOARD <span className="text-retro-gray">[L]</span>
          </button>
          {onNewPlayer && (
            <button
              onClick={onNewPlayer}
              className="retro-button w-full bg-transparent border-retro-gray hover:bg-retro-gray/20"
            >
              NEW PLAYER <span className="text-retro-gray">[N]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
