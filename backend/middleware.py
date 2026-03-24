"""Authentication middleware for organizer dashboard."""
import hashlib
from functools import wraps
from datetime import datetime
from flask import request, jsonify
from models import Organizer


def hash_token(token):
    """SHA-256 hash a token string."""
    return hashlib.sha256(token.encode()).hexdigest()


def require_organizer(f):
    """Decorator that requires a valid organizer session cookie."""
    @wraps(f)
    def decorated(*args, **kwargs):
        session_token = request.cookies.get('session_token')
        if not session_token:
            return jsonify({'error': 'Authentication required'}), 401

        token_hash = hash_token(session_token)
        organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()

        if not organizer:
            return jsonify({'error': 'Invalid session'}), 401

        if organizer.session_expires_at and organizer.session_expires_at < datetime.utcnow():
            return jsonify({'error': 'Session expired'}), 401

        if not organizer.is_active:
            return jsonify({'error': 'Account is not active', 'inactive': True}), 403

        request.organizer = organizer
        return f(*args, **kwargs)
    return decorated
