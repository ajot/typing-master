import { Link } from 'react-router-dom';

export default function TopBar() {
  return (
    <div className="absolute top-0 right-0 py-2 px-4 flex gap-3 z-10">
      <Link to="/pricing" className="text-[8px] text-retro-gray/40 hover:text-retro-gray/70 uppercase tracking-widest font-sans">
        Pricing
      </Link>
      <span className="text-retro-gray/20 text-[8px]">|</span>
      <Link to="/login" className="text-[8px] text-retro-gray/40 hover:text-retro-gray/70 uppercase tracking-widest font-sans">
        Host an Event
      </Link>
    </div>
  );
}
