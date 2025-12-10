import { useTheme, type Theme } from '../contexts/ThemeContext';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const themes: { id: Theme; name: string; color: string }[] = [
  { id: 'orange', name: 'ORANGE', color: '#FF6B00' },
  { id: 'blue', name: 'BLUE', color: '#0080FF' },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative retro-panel max-w-sm w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-retro-gray hover:text-white text-xs"
        >
          [X]
        </button>

        {/* Title */}
        <h2 className="text-accent text-center text-sm mb-6">SETTINGS</h2>

        {/* Theme selection */}
        <div className="mb-6">
          <p className="text-retro-cyan text-xs mb-4 text-center">
            ACCENT COLOR
          </p>
          <div className="flex justify-center gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.id)}
                className={`
                  w-16 h-16 border-4 transition-all
                  ${theme === t.id
                    ? 'border-white scale-110'
                    : 'border-retro-gray hover:border-white/50'
                  }
                `}
                style={{ backgroundColor: t.color }}
                title={t.name}
              >
                {theme === t.id && (
                  <span className="text-black text-lg">*</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-retro-gray text-xs mt-4 text-center">
            {themes.find((t) => t.id === theme)?.name}
          </p>
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          className="retro-button w-full"
        >
          DONE
        </button>
      </div>
    </div>
  );
}
