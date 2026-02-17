import { useEffect } from 'react';
import type { LeaderboardEntry } from '../types';
import { Footer } from './Footer';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerScore?: number;
  onBack: () => void;
  onPlayAgain?: () => void;
  onNewPlayer?: () => void;
  isLoading?: boolean;
  showAutoRefresh?: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
  title?: string;
}

export function Leaderboard({
  entries,
  currentPlayerScore,
  onBack,
  onPlayAgain,
  onNewPlayer,
  isLoading = false,
  showAutoRefresh = false,
  lastUpdated,
  onRefresh,
  title,
}: LeaderboardProps) {
  // Determine rank color
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-do-orange'; // Gold
      case 2:
        return 'text-retro-gray'; // Silver
      case 3:
        return 'text-amber-600'; // Bronze
      default:
        return 'text-white';
    }
  };

  // Determine rank display
  const getRankDisplay = (rank: number) => {
    return rank.toString();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (showAutoRefresh) {
            onBack(); // PLAY GAME
          } else if (onPlayAgain) {
            onPlayAgain(); // PLAY AGAIN
          }
          break;
        case 'Escape':
          if (!showAutoRefresh) {
            e.preventDefault();
            onBack();
          }
          break;
        case 'n':
        case 'N':
          if (onNewPlayer) {
            e.preventDefault();
            onNewPlayer();
          }
          break;
        case 'r':
        case 'R':
          if (onRefresh && showAutoRefresh) {
            e.preventDefault();
            onRefresh();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, onPlayAgain, onNewPlayer, onRefresh, showAutoRefresh]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="retro-panel p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`${showAutoRefresh ? 'text-3xl' : 'text-2xl'} text-do-orange text-glow mb-2`}>
            {title || 'LEADERBOARD'}
          </h1>
          <p className="text-retro-cyan text-xs">ALL-TIME TOP SCORES</p>
          {showAutoRefresh && (
            <p className="text-retro-gray text-xs mt-2">
              Auto-refreshes every 5 seconds
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-retro-cyan text-xl animate-pulse">
              LOADING...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-retro-gray text-sm mb-2">NO SCORES YET!</p>
            <p className="text-retro-cyan text-xs">BE THE FIRST TO PLAY</p>
          </div>
        )}

        {/* Leaderboard Table */}
        {!isLoading && entries.length > 0 && (
          <div className="space-y-2">
            {/* Header Row - Hidden on mobile, shown on md+ */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-retro-gray text-xs px-4 py-2">
              <div className="col-span-1">RANK</div>
              <div className="col-span-4">PLAYER</div>
              <div className="col-span-2 text-right">WPM</div>
              <div className="col-span-2 text-right">ACC</div>
              <div className="col-span-3 text-right">SCORE</div>
            </div>

            {/* Entries */}
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`
                  px-4 py-3 rounded
                  ${
                    entry.score === currentPlayerScore
                      ? 'bg-do-orange/20 border border-do-orange/50'
                      : 'bg-black/30'
                  }
                  ${entry.rank <= 3 ? 'border border-retro-gray/30' : ''}
                `}
              >
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${getRankColor(entry.rank)}`}>
                        {getRankDisplay(entry.rank)}
                      </span>
                      <span className="text-white font-bold truncate max-w-[120px]">
                        {entry.nickname.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${getRankColor(entry.rank)}`}>
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-retro-cyan">{entry.wpm} WPM</span>
                    <span
                      className={
                        entry.accuracy >= 95
                          ? 'text-retro-green'
                          : entry.accuracy >= 80
                          ? 'text-do-orange'
                          : 'text-retro-red'
                      }
                    >
                      {entry.accuracy}% ACC
                    </span>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                  {/* Rank */}
                  <div className={`col-span-1 text-lg ${getRankColor(entry.rank)}`}>
                    {getRankDisplay(entry.rank)}
                  </div>

                  {/* Player Name */}
                  <div className="col-span-4 text-white truncate">
                    {entry.nickname.toUpperCase()}
                  </div>

                  {/* WPM */}
                  <div className="col-span-2 text-right text-retro-cyan">
                    {entry.wpm}
                  </div>

                  {/* Accuracy */}
                  <div
                    className={`col-span-2 text-right ${
                      entry.accuracy >= 95
                        ? 'text-retro-green'
                        : entry.accuracy >= 80
                        ? 'text-do-orange'
                        : 'text-retro-red'
                    }`}
                  >
                    {entry.accuracy}%
                  </div>

                  {/* Score */}
                  <div
                    className={`col-span-3 text-right font-bold ${getRankColor(
                      entry.rank
                    )}`}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current Player Highlight */}
        {currentPlayerScore !== undefined && (
          <div className="mt-6 text-center text-xs">
            <span className="text-retro-gray">YOUR SCORE: </span>
            <span className="text-do-orange text-glow">
              {currentPlayerScore.toLocaleString()}
            </span>
          </div>
        )}

        {/* Last Updated (for auto-refresh mode) */}
        {showAutoRefresh && lastUpdated && (
          <div className="text-center mt-6 text-retro-gray text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-8">
          <div className="flex gap-4">
            <button onClick={onBack} className="retro-button flex-1">
              {showAutoRefresh ? 'PLAY GAME' : 'BACK'}{' '}
              <span className="text-retro-cyan">{showAutoRefresh ? '[SPACE]' : '[ESC]'}</span>
            </button>
            {onPlayAgain && !showAutoRefresh && (
              <button
                onClick={onPlayAgain}
                className="retro-button flex-1 bg-do-orange/30 hover:bg-do-orange/40"
              >
                PLAY AGAIN <span className="text-retro-cyan">[SPACE]</span>
              </button>
            )}
            {onRefresh && showAutoRefresh && (
              <button
                onClick={onRefresh}
                className="retro-button flex-1 bg-retro-cyan/20 hover:bg-retro-cyan/30"
              >
                REFRESH NOW <span className="text-retro-cyan">[R]</span>
              </button>
            )}
          </div>
          {onNewPlayer && (
            <button
              onClick={onNewPlayer}
              className="retro-button w-full bg-transparent border-retro-gray hover:bg-retro-gray/20"
            >
              NEW PLAYER <span className="text-retro-cyan">[N]</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
