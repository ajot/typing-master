import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameStats } from '../types';

interface UseTypingGameProps {
  text: string;
  duration: number; // in seconds
  onComplete: (stats: GameStats) => void;
}

interface UseTypingGameReturn {
  currentIndex: number;
  isCorrect: boolean[];
  stats: GameStats;
  isComplete: boolean;
  handleKeyPress: (key: string) => void;
  startGame: () => void;
  resetGame: () => void;
}

export function useTypingGame({
  text,
  duration,
  onComplete,
}: UseTypingGameProps): UseTypingGameReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean[]>([]);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCalledComplete = useRef(false);

  // Calculate stats
  const calculateStats = useCallback((): GameStats => {
    const timeElapsed = startTime ? (Date.now() - startTime) / 1000 / 60 : 0; // in minutes
    const wpm = timeElapsed > 0 ? Math.round((correctChars / 5) / timeElapsed) : 0;
    const accuracy = totalChars > 0 ? correctChars / totalChars : 1;
    const score = Math.round(wpm * accuracy * 100);

    return {
      wpm,
      accuracy,
      score,
      correctChars,
      totalChars,
      timeRemaining,
    };
  }, [startTime, correctChars, totalChars, timeRemaining]);

  const stats = calculateStats();

  // Timer effect
  useEffect(() => {
    if (startTime && !isComplete) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [startTime, isComplete]);

  // Handle game completion - only call once
  useEffect(() => {
    if (isComplete && onComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onComplete(calculateStats());
    }
  }, [isComplete, onComplete, calculateStats]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isComplete || !startTime) return;
      if (key.length !== 1) return; // Ignore special keys

      const expectedChar = text[currentIndex];
      const isCharCorrect = key === expectedChar;

      setIsCorrect((prev) => [...prev, isCharCorrect]);
      setTotalChars((prev) => prev + 1);

      if (isCharCorrect) {
        setCorrectChars((prev) => prev + 1);
        setCurrentIndex((prev) => {
          const newIndex = prev + 1;
          // Check if completed the text
          if (newIndex >= text.length) {
            setIsComplete(true);
          }
          return newIndex;
        });
      }
    },
    [currentIndex, text, isComplete, startTime]
  );

  const startGame = useCallback(() => {
    setStartTime(Date.now());
    setTimeRemaining(duration);
    setIsComplete(false);
    hasCalledComplete.current = false;
  }, [duration]);

  const resetGame = useCallback(() => {
    setCurrentIndex(0);
    setIsCorrect([]);
    setCorrectChars(0);
    setTotalChars(0);
    setStartTime(null);
    setTimeRemaining(duration);
    setIsComplete(false);
    hasCalledComplete.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [duration]);

  return {
    currentIndex,
    isCorrect,
    stats,
    isComplete,
    handleKeyPress,
    startGame,
    resetGame,
  };
}
