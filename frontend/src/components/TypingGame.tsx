import { useEffect, useCallback, useRef } from 'react';
import { useTypingGame } from '../hooks/useTypingGame';
import type { GameStats } from '../types';

interface TypingGameProps {
  text: string;
  onComplete: (stats: GameStats) => void;
  onKeyPress?: (isCorrect: boolean) => void;
  duration?: number;
}

export function TypingGame({
  text,
  onComplete,
  onKeyPress,
  duration = 60,
}: TypingGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentIndex, isCorrect, stats, handleKeyPress, startGame } =
    useTypingGame({
      text,
      duration,
      onComplete,
    });

  // Handle keyboard input
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Ignore special keys
      if (e.key.length !== 1) return;

      e.preventDefault();
      const expectedChar = text[currentIndex];
      const isCharCorrect = e.key === expectedChar;

      handleKeyPress(e.key);

      if (onKeyPress) {
        onKeyPress(isCharCorrect);
      }
    },
    [currentIndex, text, handleKeyPress, onKeyPress]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Start game when component mounts
  useEffect(() => {
    startGame();
    // Focus the container for keyboard events
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [startGame]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render the text with character highlighting
  const renderText = () => {
    return text.split('').map((char, index) => {
      let className = 'text-retro-gray'; // Untyped

      if (index < currentIndex) {
        // Already typed
        className = isCorrect[index] ? 'text-retro-green' : 'text-retro-red bg-retro-red/20';
      } else if (index === currentIndex) {
        // Current character
        className = 'text-white bg-do-orange/50 animate-pulse';
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen p-4"
      tabIndex={0}
    >
      {/* Stats Bar */}
      <div className="w-full max-w-3xl mb-6">
        <div className="retro-panel p-4">
          <div className="flex justify-between items-center">
            {/* Timer */}
            <div className="text-center">
              <p className="text-retro-gray text-xs mb-1">TIME</p>
              <p
                className={`text-2xl ${
                  stats.timeRemaining <= 10
                    ? 'text-retro-red animate-pulse'
                    : 'text-do-orange'
                } text-glow`}
              >
                {formatTime(stats.timeRemaining)}
              </p>
            </div>

            {/* WPM */}
            <div className="text-center">
              <p className="text-retro-gray text-xs mb-1">WPM</p>
              <p className="text-2xl text-retro-cyan text-glow">{stats.wpm}</p>
            </div>

            {/* Accuracy */}
            <div className="text-center">
              <p className="text-retro-gray text-xs mb-1">ACCURACY</p>
              <p
                className={`text-2xl ${
                  stats.accuracy >= 0.9
                    ? 'text-retro-green'
                    : stats.accuracy >= 0.7
                    ? 'text-do-orange'
                    : 'text-retro-red'
                } text-glow`}
              >
                {Math.round(stats.accuracy * 100)}%
              </p>
            </div>

            {/* Score */}
            <div className="text-center">
              <p className="text-retro-gray text-xs mb-1">SCORE</p>
              <p className="text-2xl text-white text-glow">{stats.score}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Typing Area */}
      <div className="w-full max-w-3xl">
        <div className="retro-panel p-6">
          <div className="bg-black/50 p-6 rounded border border-retro-gray/30 min-h-[200px]">
            <p className="text-base md:text-lg leading-relaxed font-mono">
              {renderText()}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-retro-gray/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-do-orange transition-all duration-100"
                style={{ width: `${(currentIndex / text.length) * 100}%` }}
              />
            </div>
            <p className="text-retro-gray text-xs text-center mt-2">
              {currentIndex} / {text.length} CHARACTERS
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-retro-gray text-xs mt-6">
        TYPE THE TEXT ABOVE AS FAST AND ACCURATELY AS YOU CAN!
      </p>
    </div>
  );
}
