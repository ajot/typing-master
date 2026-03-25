import { Link } from 'react-router-dom';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black py-16 px-4">
      {/* Scanline overlay */}
      <div className="scanlines pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center relative">
        {/* Back to game */}
        <Link to="/" className="text-retro-gray text-[10px] hover:text-white uppercase tracking-wider">
          ← Back to game
        </Link>

        <h1 className="text-2xl text-do-orange text-center mt-6 mb-2 font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>
          HOST THE GAME
        </h1>
        <p className="text-retro-gray text-xs mb-12" style={{ fontFamily: "'Press Start 2P', cursive" }}>
          Run it at your conference, meetup, or team event
        </p>

        <div className="grid grid-cols-2 gap-6 mb-12">
          {/* Free */}
          <div className="border-2 border-retro-gray/30 rounded-none p-8 text-left bg-black/50">
            <h2 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
              FREE
            </h2>
            <p className="text-retro-gray text-xs mb-6">Play on the homepage</p>
            <ul className="space-y-3 text-sm text-retro-gray">
              <li className="flex items-start gap-2">
                <span className="text-retro-green mt-0.5">✓</span>
                Unlimited games
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-green mt-0.5">✓</span>
                Public leaderboard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-green mt-0.5">✓</span>
                Retro 8-bit experience
              </li>
            </ul>
            <Link
              to="/"
              className="block mt-8 text-center px-4 py-3 border-2 border-retro-gray/50 text-retro-gray text-xs uppercase tracking-wider hover:border-white hover:text-white transition-colors"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
            >
              Play Now
            </Link>
          </div>

          {/* Paid */}
          <div className="border-2 border-do-orange rounded-none p-8 text-left bg-black/50 relative">
            <div className="absolute -top-3 left-4 bg-do-orange text-black text-[8px] font-bold px-2 py-0.5 uppercase" style={{ fontFamily: "'Press Start 2P', cursive" }}>
              Popular
            </div>
            <h2 className="text-lg font-bold text-do-orange mb-1" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
              EVENT
            </h2>
            <p className="text-retro-gray text-xs mb-6">For conferences & teams</p>
            <ul className="space-y-3 text-sm text-retro-gray">
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Unlimited events
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Private event leaderboards
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Player data & CSV export
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Custom typing prompts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Consent management
              </li>
              <li className="flex items-start gap-2">
                <span className="text-retro-cyan mt-0.5">✓</span>
                Event scheduling
              </li>
            </ul>
            <a
              href="mailto:amit@ajot.me"
              className="block mt-8 text-center px-4 py-3 bg-do-orange text-black text-xs uppercase tracking-wider font-bold hover:bg-white transition-colors"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
            >
              Contact Us
            </a>
          </div>
        </div>

        <p className="text-xs text-retro-gray/50">
          Already an organizer?{' '}
          <Link to="/login" className="text-retro-cyan hover:text-white">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
