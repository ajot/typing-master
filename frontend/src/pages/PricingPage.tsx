import { Link } from 'react-router-dom';

export default function PricingPage() {
  return (
    <div className="dashboard-theme min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Host Your Own Typing Competition</h1>
        <p className="text-gray-600 mb-12">Run "Type the Cloud" at your conference, meetup, or team event.</p>

        <div className="grid grid-cols-2 gap-6 mb-12">
          {/* Free */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Free</h2>
            <p className="text-gray-500 text-sm mb-6">Play on the homepage</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Unlimited games
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Public leaderboard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Retro 8-bit experience
              </li>
            </ul>
            <Link
              to="/"
              className="block mt-8 text-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
            >
              Play Now
            </Link>
          </div>

          {/* Paid */}
          <div className="bg-white border-2 border-gray-900 rounded-lg p-8 text-left relative">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Event</h2>
            <p className="text-gray-500 text-sm mb-6">For conferences & teams</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Unlimited events
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Private event leaderboards
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Player data & CSV export
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Custom typing prompts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Consent management
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Event scheduling (start/end dates)
              </li>
            </ul>
            <a
              href="mailto:amit@ajot.me"
              className="block mt-8 text-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
