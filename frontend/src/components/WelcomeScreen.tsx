import { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (nickname: string, email: string) => void;
  onViewLeaderboard?: () => void;
}

export function WelcomeScreen({ onStart, onViewLeaderboard }: WelcomeScreenProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ nickname?: string; email?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { nickname?: string; email?: string } = {};

    if (!nickname.trim()) {
      newErrors.nickname = 'Nickname required';
    } else if (nickname.length > 50) {
      newErrors.nickname = 'Max 50 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onStart(nickname.trim(), email.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="retro-panel p-8 max-w-md w-full">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl text-do-orange text-center mb-2 text-glow">
          TYPING MASTER
        </h1>
        <p className="text-retro-cyan text-center text-xs mb-8">
          DIGITALOCEAN EDITION
        </p>

        {/* Instructions */}
        <div className="mb-8 text-center">
          <p className="text-white text-xs mb-2">
            TYPE AS FAST AS YOU CAN!
          </p>
          <p className="text-retro-gray text-xs">
            60 SECONDS ON THE CLOCK
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-retro-cyan text-xs mb-2">
              ENTER YOUR HANDLE
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setErrors((prev) => ({ ...prev, nickname: undefined }));
              }}
              className="retro-input w-full"
              placeholder="PLAYER_ONE"
              maxLength={50}
              autoFocus
            />
            {errors.nickname && (
              <p className="text-retro-red text-xs mt-1">{errors.nickname}</p>
            )}
          </div>

          <div>
            <label className="block text-retro-cyan text-xs mb-2">
              ENTER YOUR EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className="retro-input w-full"
              placeholder="PLAYER@EXAMPLE.COM"
            />
            {errors.email && (
              <p className="text-retro-red text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <button type="submit" className="retro-button w-full">
            START GAME
          </button>
        </form>

        {/* Leaderboard Link */}
        {onViewLeaderboard && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onViewLeaderboard}
              className="text-retro-cyan text-xs hover:text-white underline"
            >
              VIEW LEADERBOARD
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-retro-gray text-xs">
            POWERED BY
          </p>
          <p className="text-do-orange text-xs">
            DIGITALOCEAN
          </p>
        </div>
      </div>
    </div>
  );
}
