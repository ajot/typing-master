"""Dashboard API routes for organizer self-service event management."""
import csv
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func
from models import db, Event, EventConsent, Player, Score, Prompt, Organizer
from middleware import require_organizer

dashboard_bp = Blueprint('dashboard', __name__)

# Reserved slugs — must match frontend reserved list
RESERVED_SLUGS = {
    'admin', 'dashboard', 'login', 'signup', 'host', 'leaderboard',
    'api', 'static', 'health', 'about', 'terms', 'privacy', 'vibe', 'play'
}


def _verify_event_ownership(event_id):
    """Verify the current organizer owns the event. Returns (event, error_response)."""
    event = Event.query.get(event_id)
    if not event:
        return None, (jsonify({'error': 'Event not found'}), 404)
    if event.organizer_id != request.organizer.id:
        return None, (jsonify({'error': 'Access denied'}), 403)
    return event, None


# --- Events ---

@dashboard_bp.route('/api/dashboard/events', methods=['GET'])
@require_organizer
def list_events():
    """List organizer's events with summary stats."""
    events = Event.query.filter_by(organizer_id=request.organizer.id)\
        .order_by(Event.created_at.desc()).all()

    result = []
    for event in events:
        player_count = EventConsent.query.filter_by(event_id=event.id).count()
        game_count = Score.query.filter_by(event_id=event.id).count()
        result.append({
            **event.to_dict(),
            'player_count': player_count,
            'game_count': game_count,
        })

    return jsonify(result)


@dashboard_bp.route('/api/dashboard/events', methods=['POST'])
@require_organizer
def create_event():
    """Create a new event."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    slug = data.get('slug', '').strip().lower()
    name = data.get('name', '').strip()

    if not slug or not name:
        return jsonify({'error': 'slug and name are required'}), 400

    if slug in RESERVED_SLUGS:
        return jsonify({'error': 'This slug is reserved'}), 400

    if Event.query.filter_by(slug=slug).first():
        return jsonify({'error': 'An event with this slug already exists'}), 409

    event = Event(
        slug=slug,
        name=name,
        is_active=data.get('is_active', True),
        config=data.get('config', {}),
        organizer_id=request.organizer.id,
        starts_at=_parse_datetime(data.get('starts_at')),
        ends_at=_parse_datetime(data.get('ends_at')),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify(event.to_dict()), 201


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['GET'])
@require_organizer
def get_event(event_id):
    """Get event detail with stats."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    player_count = EventConsent.query.filter_by(event_id=event.id).count()
    game_count = Score.query.filter_by(event_id=event.id).count()

    top_score = db.session.query(func.max(Score.score))\
        .filter(Score.event_id == event.id).scalar() or 0

    avg_wpm = db.session.query(func.avg(Score.wpm))\
        .filter(Score.event_id == event.id).scalar()

    return jsonify({
        **event.to_dict(),
        'player_count': player_count,
        'game_count': game_count,
        'top_score': top_score,
        'avg_wpm': round(float(avg_wpm), 1) if avg_wpm else 0,
    })


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['PATCH'])
@require_organizer
def update_event(event_id):
    """Update event settings."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        event.name = data['name']
    if 'is_active' in data:
        event.is_active = data['is_active']
    if 'config' in data:
        event.config = data['config']
    if 'starts_at' in data:
        event.starts_at = _parse_datetime(data['starts_at'])
    if 'ends_at' in data:
        event.ends_at = _parse_datetime(data['ends_at'])

    db.session.commit()
    return jsonify(event.to_dict())


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['DELETE'])
@require_organizer
def delete_event(event_id):
    """Delete event and associated data."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    # Application-level cascade (single transaction)
    # 1. Delete custom prompts for this event
    Prompt.query.filter_by(event_id=event.id).delete()
    # 2. Delete consent records
    EventConsent.query.filter_by(event_id=event.id).delete()
    # 3. Null out event_id on scores (preserve player history)
    Score.query.filter_by(event_id=event.id).update({'event_id': None})
    # 4. Delete the event
    db.session.delete(event)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200


# --- Players ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/players', methods=['GET'])
@require_organizer
def get_event_players(event_id):
    """Get players for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    results = db.session.query(
        Player.first_name,
        Player.last_name,
        Player.nickname,
        Player.email,
        Player.email_type,
        EventConsent.consented,
        EventConsent.ip_address,
        EventConsent.created_at.label('joined_event_at'),
        func.count(Score.id).label('games_played')
    ).join(
        Player, EventConsent.player_id == Player.id
    ).outerjoin(
        Score, (Score.player_id == Player.id) & (Score.event_id == event_id)
    ).filter(
        EventConsent.event_id == event_id
    ).group_by(
        Player.first_name, Player.last_name, Player.nickname,
        Player.email, Player.email_type,
        EventConsent.consented, EventConsent.ip_address, EventConsent.created_at
    ).order_by(
        EventConsent.created_at.asc()
    ).all()

    players = [{
        'first_name': r.first_name,
        'last_name': r.last_name,
        'display_name': f"{r.first_name} {r.last_name[0].upper()}." if r.first_name and r.last_name else r.nickname,
        'email': r.email,
        'email_type': r.email_type,
        'consented': r.consented,
        'ip_address': r.ip_address,
        'joined_event_at': r.joined_event_at.isoformat() if r.joined_event_at else None,
        'games_played': r.games_played or 0
    } for r in results]

    return jsonify({
        'event_id': event_id,
        'event_name': event.name,
        'total_players': len(players),
        'total_games': sum(p['games_played'] for p in players),
        'players': players
    })


@dashboard_bp.route('/api/dashboard/events/<event_id>/players/export', methods=['GET'])
@require_organizer
def export_event_players(event_id):
    """Export event players as CSV."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    # Reuse the same query as get_event_players
    results = db.session.query(
        Player.first_name,
        Player.last_name,
        Player.email,
        Player.email_type,
        EventConsent.consented,
        EventConsent.ip_address,
        EventConsent.created_at.label('joined_event_at'),
        func.count(Score.id).label('games_played')
    ).join(
        Player, EventConsent.player_id == Player.id
    ).outerjoin(
        Score, (Score.player_id == Player.id) & (Score.event_id == event_id)
    ).filter(
        EventConsent.event_id == event_id
    ).group_by(
        Player.first_name, Player.last_name,
        Player.email, Player.email_type,
        EventConsent.consented, EventConsent.ip_address, EventConsent.created_at
    ).order_by(
        EventConsent.created_at.asc()
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['First Name', 'Last Name', 'Email', 'Type', 'Consented', 'IP Address', 'Joined At', 'Games Played'])

    for r in results:
        writer.writerow([
            r.first_name or '',
            r.last_name or '',
            r.email,
            r.email_type or '',
            'Yes' if r.consented is True else ('No' if r.consented is False else 'N/A'),
            r.ip_address or '',
            r.joined_event_at.isoformat() if r.joined_event_at else '',
            r.games_played or 0
        ])

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename=event-{event.slug}-players.csv'
    return response


# --- Leaderboard ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/leaderboard', methods=['GET'])
@require_organizer
def get_event_leaderboard(event_id):
    """Get event leaderboard (best score per player)."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    results = db.session.query(
        Player.id,
        Player.first_name,
        Player.last_name,
        Player.nickname,
        Player.email,
        func.max(Score.score).label('best_score'),
        func.max(Score.wpm).label('best_wpm'),
        func.count(Score.id).label('games_played')
    ).join(
        Score, Score.player_id == Player.id
    ).filter(
        Score.event_id == event_id,
        Player.is_hidden == False
    ).group_by(
        Player.id, Player.first_name, Player.last_name,
        Player.nickname, Player.email
    ).order_by(
        func.max(Score.score).desc()
    ).limit(50).all()

    leaderboard = [{
        'display_name': f"{r.first_name} {r.last_name[0].upper()}." if r.first_name and r.last_name else r.nickname,
        'email': r.email,
        'best_score': r.best_score,
        'best_wpm': r.best_wpm,
        'games_played': r.games_played,
    } for r in results]

    return jsonify({
        'event_id': event_id,
        'event_name': event.name,
        'leaderboard': leaderboard
    })


# --- Custom Prompts ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts', methods=['GET'])
@require_organizer
def list_event_prompts(event_id):
    """List custom prompts for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompts = Prompt.query.filter_by(event_id=event.id)\
        .order_by(Prompt.created_at.desc()).all()

    return jsonify([p.to_dict() for p in prompts])


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts', methods=['POST'])
@require_organizer
def create_event_prompt(event_id):
    """Create a custom prompt for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({'error': 'text is required'}), 400

    text = data['text'].strip()
    if len(text) > 300:
        return jsonify({'error': 'Prompt must be 300 characters or less'}), 400

    prompt = Prompt(
        text=text,
        category=data.get('category', 'custom'),
        difficulty=data.get('difficulty', 'medium'),
        is_active=data.get('is_active', True),
        event_id=event.id,
    )
    db.session.add(prompt)
    db.session.commit()

    return jsonify(prompt.to_dict()), 201


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts/<prompt_id>', methods=['PATCH'])
@require_organizer
def update_event_prompt(event_id, prompt_id):
    """Update a custom prompt."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompt = Prompt.query.filter_by(id=prompt_id, event_id=event.id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    data = request.get_json()
    if 'text' in data:
        prompt.text = data['text']
    if 'category' in data:
        prompt.category = data['category']
    if 'difficulty' in data:
        prompt.difficulty = data['difficulty']
    if 'is_active' in data:
        prompt.is_active = data['is_active']

    db.session.commit()
    return jsonify(prompt.to_dict())


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts/<prompt_id>', methods=['DELETE'])
@require_organizer
def delete_event_prompt(event_id, prompt_id):
    """Delete a custom prompt."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompt = Prompt.query.filter_by(id=prompt_id, event_id=event.id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    db.session.delete(prompt)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200


# --- Helpers ---

def _parse_datetime(value):
    """Parse ISO datetime string or return None."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None
