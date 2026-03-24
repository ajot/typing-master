import { Link } from 'react-router-dom';

export default function TopBar() {
  return (
    <div className="w-full bg-black/50 border-b border-white/10 py-1.5 px-4 flex justify-end gap-4">
      <Link to="/pricing" className="text-[10px] text-white/50 hover:text-white/80 uppercase tracking-wider">
        Pricing
      </Link>
      <Link to="/login" className="text-[10px] text-white/50 hover:text-white/80 uppercase tracking-wider">
        Host an Event
      </Link>
    </div>
  );
}
