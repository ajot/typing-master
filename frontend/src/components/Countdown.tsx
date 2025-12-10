import { useEffect, useState } from 'react';

interface CountdownProps {
  onComplete: () => void;
  onTick?: (count: number) => void;
}

export function Countdown({ onComplete, onTick }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    if (onTick) {
      onTick(count);
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete, onTick]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <p className="text-retro-cyan text-sm mb-8">GET READY!</p>

        <div className="relative">
          {/* Outer glow ring */}
          <div
            className={`
              absolute inset-0 rounded-full blur-xl
              ${count === 3 ? 'bg-retro-red/30' : ''}
              ${count === 2 ? 'bg-do-orange/30' : ''}
              ${count === 1 ? 'bg-retro-green/30' : ''}
              ${count === 0 ? 'bg-retro-cyan/30' : ''}
            `}
          />

          {/* Number display */}
          <div
            className={`
              relative w-48 h-48 flex items-center justify-center
              rounded-full border-4
              ${count === 3 ? 'border-retro-red text-retro-red' : ''}
              ${count === 2 ? 'border-do-orange text-do-orange' : ''}
              ${count === 1 ? 'border-retro-green text-retro-green' : ''}
              ${count === 0 ? 'border-retro-cyan text-retro-cyan' : ''}
              animate-pulse
            `}
          >
            <span className="text-8xl text-glow">
              {count === 0 ? 'GO!' : count}
            </span>
          </div>
        </div>

        <p className="text-retro-gray text-xs mt-8">
          {count > 0 ? 'PREPARE YOUR FINGERS...' : 'TYPE NOW!'}
        </p>
      </div>
    </div>
  );
}
