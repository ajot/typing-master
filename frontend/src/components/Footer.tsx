import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <div className="text-center py-6 border-t border-retro-gray/30 mt-8">
      {/* Built With */}
      <p className="text-xs text-retro-gray mb-2">Built with</p>
      <p className="text-sm mb-4">
        <span className="text-do-orange">CLAUDE</span>
        <span className="text-retro-gray mx-2">+</span>
        <span className="text-retro-cyan">DIGITALOCEAN</span>
      </p>

      {/* Tech Links */}
      <p className="text-xs text-retro-gray space-x-2">
        <a href="https://www.digitalocean.com/products/app-platform" target="_blank" rel="noopener noreferrer" className="hover:text-do-orange transition-colors">App Platform</a>
        <span>//</span>
        <a href="https://www.digitalocean.com/products/gen-ai" target="_blank" rel="noopener noreferrer" className="hover:text-do-orange transition-colors">Gradient AI</a>
        <span>//</span>
        <a href="https://www.digitalocean.com/products/managed-databases-postgresql" target="_blank" rel="noopener noreferrer" className="hover:text-do-orange transition-colors">Managed PostgreSQL</a>
        <span>//</span>
        <a href="https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github-actions/" target="_blank" rel="noopener noreferrer" className="hover:text-do-orange transition-colors">GitHub Actions</a>
      </p>

      <div className="border-t border-retro-gray/30 my-4" />

      {/* Vibe Coded Message */}
      <p className="text-xs text-retro-gray">
        ✨ <Link to="/vibe" className="text-do-orange hover:text-white transition-colors">Vibe coded</Link> by <a href="https://x.com/amit" target="_blank" rel="noopener noreferrer" className="text-do-orange hover:text-white transition-colors">@amit</a> during booth duty at AI Summit NYC
      </p>
    </div>
  );
}
