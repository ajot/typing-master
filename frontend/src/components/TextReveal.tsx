import { useEffect } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

interface TextRevealProps {
  text: string;
  onComplete: () => void;
  speed?: number;
}

export function TextReveal({ text, onComplete, speed = 30 }: TextRevealProps) {
  const { displayText, isComplete, start } = useTypewriter({
    text,
    speed,
    startDelay: 500,
    onComplete,
  });

  useEffect(() => {
    start();
  }, [start]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="retro-panel p-8 max-w-2xl w-full">
        <h2 className="text-retro-cyan text-center text-sm mb-6">
          GET READY TO TYPE...
        </h2>

        <div className="bg-black/50 p-6 rounded border border-retro-gray/30 min-h-[200px]">
          <p className="text-white text-sm md:text-base leading-relaxed">
            {displayText}
            {!isComplete && (
              <span className="inline-block w-2 h-4 bg-do-orange ml-1 animate-blink" />
            )}
          </p>
        </div>

        {!isComplete && (
          <p className="text-retro-gray text-xs text-center mt-4 animate-pulse">
            LOADING TEXT...
          </p>
        )}

        {isComplete && (
          <p className="text-retro-green text-xs text-center mt-4">
            STARTING IN 3...
          </p>
        )}
      </div>
    </div>
  );
}
