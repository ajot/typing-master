from flask import Blueprint, request, jsonify
from models import db, Score, Player, Prompt, Event
from datetime import datetime

scores_bp = Blueprint('scores', __name__)

@scores_bp.route('/scores', methods=['POST'])
def create_score():
    """Submit a new score"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    player_id = data.get('player_id')
    prompt_id = data.get('prompt_id')
    wpm = data.get('wpm')
    accuracy = data.get('accuracy')

    # Validate required fields
    if not player_id:
        return jsonify({'error': 'player_id is required'}), 400
    if not prompt_id:
        return jsonify({'error': 'prompt_id is required'}), 400
    if wpm is None:
        return jsonify({'error': 'wpm is required'}), 400
    if accuracy is None:
        return jsonify({'error': 'accuracy is required'}), 400

    # Validate player exists
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    # Validate prompt exists
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    # Validate event if provided
    event_id = data.get('event_id')
    if event_id:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

    # Parse started_at if provided
    started_at = None
    if data.get('started_at'):
        try:
            started_at = datetime.fromisoformat(data['started_at'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            pass  # Ignore invalid timestamps

    # Calculate final score: WPM × Accuracy × 100
    final_score = int(wpm * accuracy * 100)

    score = Score(
        player_id=player_id,
        prompt_id=prompt_id,
        wpm=wpm,
        accuracy=accuracy,
        score=final_score,
        event_id=event_id,
        started_at=started_at,
    )
    db.session.add(score)
    db.session.commit()

    return jsonify(score.to_dict()), 201


@scores_bp.route('/scores/<score_id>', methods=['GET'])
def get_score(score_id):
    """Get a score by ID"""
    score = Score.query.get(score_id)
    if not score:
        return jsonify({'error': 'Score not found'}), 404
    return jsonify(score.to_dict())


@scores_bp.route('/scores/player/<player_id>', methods=['GET'])
def get_player_scores(player_id):
    """Get all scores for a player"""
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    scores = Score.query.filter_by(player_id=player_id).order_by(Score.created_at.desc()).all()
    return jsonify([s.to_dict() for s in scores])
