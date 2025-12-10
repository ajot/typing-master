import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerScore?: number;
  onBack: () => void;
  onPlayAgain?: () => void;
  isLoading?: boolean;
}

export function Leaderboard({
  entries,
  currentPlayerScore,
  onBack,
  onPlayAgain,
  isLoading = false,
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

  // Determine rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '♔';
      case 2:
        return '♕';
      case 3:
        return '♖';
      default:
        return rank.toString();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="retro-panel p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl text-do-orange text-glow mb-2">
            LEADERBOARD
          </h1>
          <p className="text-retro-cyan text-xs">ALL-TIME TOP SCORES</p>
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
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 text-retro-gray text-xs px-4 py-2">
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
                  grid grid-cols-12 gap-2 px-4 py-3 rounded
                  ${
                    entry.score === currentPlayerScore
                      ? 'bg-do-orange/20 border border-do-orange/50'
                      : 'bg-black/30'
                  }
                  ${entry.rank <= 3 ? 'border border-retro-gray/30' : ''}
                `}
              >
                {/* Rank */}
                <div
                  className={`col-span-1 text-lg ${getRankColor(entry.rank)}`}
                >
                  {getRankIcon(entry.rank)}
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

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button onClick={onBack} className="retro-button flex-1">
            BACK
          </button>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="retro-button flex-1 bg-do-orange/30 hover:bg-do-orange/40"
            >
              PLAY AGAIN
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-retro-gray text-xs">POWERED BY DIGITALOCEAN</p>
        </div>
      </div>
    </div>
  );
}
