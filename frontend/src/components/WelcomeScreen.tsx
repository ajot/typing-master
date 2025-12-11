import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';

type WelcomeScreenProps = {
  onStart: (nickname: string, email: string) => void;
};

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ nickname?: string; email?: string }>({});
  const [showSettings, setShowSettings] = useState(false);

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
      <div className="retro-panel p-8 max-w-md w-full relative">
        {/* Settings Icon */}
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-3 right-3 text-retro-gray hover:text-accent text-xs p-1 transition-colors"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* 8-bit Sammy Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/sammy-8bit.png"
            alt="Sammy the Shark"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl text-accent text-center mb-2 text-glow-accent">
          TYPE THE CLOUD
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
        <div className="mt-6 text-center">
          <Link
            to="/leaderboard"
            className="text-retro-cyan text-xs hover:text-white underline"
          >
            VIEW LEADERBOARD
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-retro-gray text-xs">
            POWERED BY
          </p>
          <p className="text-accent text-xs">
            DIGITALOCEAN
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
