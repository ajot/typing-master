import { useState, useEffect, useCallback } from 'react';

interface UseTypewriterProps {
  text: string;
  speed?: number; // ms per character
  startDelay?: number; // ms before starting
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayText: string;
  isComplete: boolean;
  start: () => void;
  reset: () => void;
}

export function useTypewriter({
  text,
  speed = 30,
  startDelay = 0,
  onComplete,
}: UseTypewriterProps): UseTypewriterReturn {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (!isStarted) return;

    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeNextChar = () => {
      if (charIndex < text.length) {
        setDisplayText(text.slice(0, charIndex + 1));
        charIndex++;
        timeoutId = setTimeout(typeNextChar, speed);
      } else {
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    };

    // Start after delay
    timeoutId = setTimeout(typeNextChar, startDelay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, speed, startDelay, isStarted, onComplete]);

  const start = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsStarted(true);
  }, []);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsStarted(false);
  }, []);

  return {
    displayText,
    isComplete,
    start,
    reset,
  };
}
