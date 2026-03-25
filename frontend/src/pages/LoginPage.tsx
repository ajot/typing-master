import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email.trim());
    setSubmitting(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.message);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm mb-6">
            If an account exists for <strong className="text-white">{email}</strong>, we've sent a login link.
            It expires in 15 minutes.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="text-sm text-do-orange hover:text-white"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-white">Type the Cloud</Link>
          <p className="text-gray-500 mt-2 text-sm">Organizer login</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-do-orange focus:border-transparent"
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full mt-4 px-4 py-2 bg-do-orange text-black text-sm font-bold rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Sending...' : 'Send login link'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Want to host your own typing competition?{' '}
            <a href="mailto:amit@ajot.me" className="text-do-orange hover:text-white">
              Contact us to get started
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const { verify } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  const token = searchParams.get('token');
  const hasToken = !!token;
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token || verifyAttempted.current) return;
    verifyAttempted.current = true;
    verify(token).then(result => {
      if (result.success) {
        navigate(result.redirect || '/dashboard');
      } else {
        setError(result.error || 'Verification failed');
        setVerifying(false);
      }
    });
  }, [token, verify, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        {!hasToken ? (
          <div>
            <p className="text-red-400 mb-4">No token provided</p>
            <Link to="/login" className="text-do-orange hover:text-white text-sm">
              Back to login
            </Link>
          </div>
        ) : verifying ? (
          <p className="text-gray-400">Verifying your login link...</p>
        ) : (
          <div>
            <p className="text-red-400 mb-4">{error}</p>
            <Link to="/login" className="text-do-orange hover:text-white text-sm">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
