import { Link } from 'react-router-dom';

type Milestone = {
  time: string;
  icon: string;
  label: string;
  highlight?: boolean;
  divider?: boolean;
};

type Level = {
  day: string;
  title: string;
  subtitle: string;
  commits: number;
  milestones: Milestone[];
};

const TIMELINE: Level[] = [
  {
    day: 'DEC 10',
    title: 'LEVEL 1',
    subtitle: 'THE BUILD',
    commits: 14,
    milestones: [
      { time: '12:27 PM', icon: '>', label: 'GAME START - Project kickoff', highlight: true },
      { time: '2:29 PM', icon: '*', label: 'CORE COMPLETE - Full typing game', highlight: true },
      { time: '2:51 PM', icon: '+', label: 'Leaderboard added' },
      { time: '4:26 PM', icon: '#', label: 'PostgreSQL migration' },
      { time: '4:29 PM', icon: '!', label: 'DEPLOYED - Live on App Platform', highlight: true },
      { time: '...', icon: '-', label: 'LATER THAT EVENING', divider: true },
      { time: '10:04 PM', icon: '@', label: 'Dockerfile for deployment' },
      { time: '11:59 PM', icon: '~', label: 'Renamed to "Type the Cloud"' },
    ],
  },
  {
    day: 'DEC 11',
    title: 'LEVEL 2',
    subtitle: 'THE POLISH',
    commits: 4,
    milestones: [
      { time: '9:03 AM', icon: '^', label: 'Keyboard shortcuts' },
      { time: '9:18 AM', icon: '%', label: 'Mobile responsive' },
      { time: '2:03 PM', icon: '&', label: 'UX improvements' },
    ],
  },
  {
    day: 'DEC 12',
    title: 'LEVEL 3',
    subtitle: 'THE EXTRAS',
    commits: 3,
    milestones: [
      { time: '2:40 PM', icon: '$', label: 'Admin dashboard' },
      { time: '3:18 PM', icon: '?', label: 'Documentation' },
    ],
  },
];

export function VibePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="scanlines pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-retro-gray text-xs hover:text-retro-cyan mb-4 inline-block"
          >
            &lt; BACK TO GAME
          </Link>

          <h1 className="text-2xl md:text-3xl text-do-orange text-glow mb-2">
            VIBE CHECK
          </h1>
          <p className="text-retro-gray text-xs mb-6">
            BUILD LOG // TYPE THE CLOUD
          </p>
        </div>

        {/* Hero Stats */}
        <div className="retro-panel p-6 mb-8 text-center">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-3xl md:text-4xl text-retro-cyan text-glow">2</p>
              <p className="text-xs text-retro-gray">HOURS TO BUILD</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl text-retro-green text-glow">4</p>
              <p className="text-xs text-retro-gray">HOURS TO DEPLOY</p>
            </div>
          </div>
          <div className="border-t border-retro-gray/30 pt-4">
            <p className="text-do-orange text-sm">21 COMMITS IN 3 DAYS</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-retro-gray mb-1">
            <span>IDEA</span>
            <span>BUILD</span>
            <span>DEPLOY</span>
            <span>POLISH</span>
          </div>
          <div className="h-2 bg-retro-gray/20 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-do-orange via-retro-cyan to-retro-green"
              style={{ width: '100%' }}
            />
          </div>
          <p className="text-center text-xs text-retro-green mt-1">COMPLETE!</p>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {TIMELINE.map((level, levelIdx) => (
            <div key={level.day} className="retro-panel p-4">
              {/* Level Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-retro-gray/30">
                <div>
                  <span className={`text-sm ${
                    levelIdx === 0 ? 'text-do-orange' :
                    levelIdx === 1 ? 'text-retro-cyan' :
                    'text-retro-green'
                  } text-glow`}>
                    {level.title}
                  </span>
                  <span className="text-retro-gray text-xs ml-2">
                    {level.subtitle}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-retro-gray">{level.day}</p>
                  <p className="text-xs text-retro-gray">{level.commits} commits</p>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                {level.milestones.map((milestone, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start text-xs ${
                      milestone.divider
                        ? 'text-retro-gray/50 italic my-3'
                        : milestone.highlight
                          ? 'text-white'
                          : 'text-retro-gray'
                    }`}
                  >
                    {milestone.divider ? (
                      <span className="w-full text-center">- - - {milestone.label} - - -</span>
                    ) : (
                      <>
                        <span className="text-retro-cyan w-24 flex-shrink-0 whitespace-nowrap">
                          {milestone.time}
                        </span>
                        <span className={`mr-3 flex-shrink-0 ${
                          milestone.highlight ? 'text-do-orange' : 'text-retro-gray'
                        }`}>
                          [{milestone.icon}]
                        </span>
                        <span className={milestone.highlight ? 'text-glow' : ''}>
                          {milestone.label}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-retro-gray/30">
          <p className="text-xs text-retro-gray mb-2">POWERED BY</p>
          <p className="text-sm">
            <span className="text-do-orange">CLAUDE</span>
            <span className="text-retro-gray mx-2">+</span>
            <span className="text-retro-cyan">DIGITALOCEAN</span>
          </p>
          <p className="text-xs text-retro-gray mt-4">
            App Platform // Managed PostgreSQL // GitHub Auto-Deploy
          </p>
        </div>

        {/* Play Button */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="retro-button inline-block px-8 py-3 text-sm"
          >
            PLAY THE GAME
          </Link>
        </div>
      </div>
    </div>
  );
}
