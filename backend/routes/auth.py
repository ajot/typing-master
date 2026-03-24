"""Authentication routes for organizer magic link login."""
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, make_response
from models import db, Organizer
from middleware import hash_token

auth_bp = Blueprint('auth', __name__)

# Rate limit tracking (in-memory, resets on restart)
_login_attempts = {}
RATE_LIMIT = 3
RATE_WINDOW = 900  # 15 minutes


def _check_rate_limit(email):
    now = datetime.utcnow()
    cutoff = now - timedelta(seconds=RATE_WINDOW)
    attempts = _login_attempts.get(email, [])
    attempts = [t for t in attempts if t > cutoff]
    _login_attempts[email] = attempts
    return len(attempts) >= RATE_LIMIT


def _record_attempt(email):
    _login_attempts.setdefault(email, []).append(datetime.utcnow())


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400

    email = data['email'].lower().strip()
    generic_response = jsonify({
        'message': 'If an account exists for that email, a magic link has been sent.'
    })

    if _check_rate_limit(email):
        return generic_response, 200

    _record_attempt(email)

    organizer = Organizer.query.filter_by(email=email).first()
    if not organizer:
        return generic_response, 200

    token = secrets.token_urlsafe(32)
    organizer.auth_token_hash = hash_token(token)
    organizer.auth_token_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    print(f"\n{'='*60}")
    print(f"MAGIC LINK for {email}:")
    print(f"  /login/verify?token={token}")
    print(f"{'='*60}\n")

    return generic_response, 200


@auth_bp.route('/api/auth/verify', methods=['POST'])
def verify():
    data = request.get_json()
    if not data or not data.get('token'):
        return jsonify({'error': 'Token is required'}), 400

    token = data['token']
    token_hash = hash_token(token)

    organizer = Organizer.query.filter_by(auth_token_hash=token_hash).first()
    if not organizer:
        return jsonify({'error': 'Invalid or expired link'}), 401

    if organizer.auth_token_expires_at < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired link'}), 401

    organizer.auth_token_hash = None
    organizer.auth_token_expires_at = None

    session_token = secrets.token_urlsafe(32)
    organizer.session_token_hash = hash_token(session_token)
    organizer.session_expires_at = datetime.utcnow() + timedelta(days=30)
    db.session.commit()

    response = make_response(jsonify({
        'organizer': organizer.to_dict(),
        'redirect': '/dashboard'
    }))
    response.set_cookie(
        'session_token',
        session_token,
        httponly=True,
        secure=True,
        samesite='Lax',
        max_age=30 * 24 * 60 * 60
    )
    return response


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session_token = request.cookies.get('session_token')
    if session_token:
        token_hash = hash_token(session_token)
        organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()
        if organizer:
            organizer.session_token_hash = None
            organizer.session_expires_at = None
            db.session.commit()

    response = make_response(jsonify({'status': 'ok'}))
    response.delete_cookie('session_token')
    return response


@auth_bp.route('/api/auth/me', methods=['GET'])
def get_me():
    session_token = request.cookies.get('session_token')
    if not session_token:
        return jsonify({'error': 'Not authenticated'}), 401

    token_hash = hash_token(session_token)
    organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()

    if not organizer:
        return jsonify({'error': 'Invalid session'}), 401

    if organizer.session_expires_at and organizer.session_expires_at < datetime.utcnow():
        return jsonify({'error': 'Session expired'}), 401

    return jsonify({'organizer': organizer.to_dict()})
