from flask import Blueprint, request, jsonify
from models import db, Player

players_bp = Blueprint('players', __name__)

@players_bp.route('/players', methods=['POST'])
def create_player():
    """Register a new player"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    nickname = data.get('nickname', '').strip()
    email = data.get('email', '').strip()

    if not nickname:
        return jsonify({'error': 'Nickname is required'}), 400
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if len(nickname) > 50:
        return jsonify({'error': 'Nickname must be 50 characters or less'}), 400

    # Check if player with this email already exists
    existing_player = Player.query.filter_by(email=email).first()
    if existing_player:
        # Update nickname if different
        if existing_player.nickname != nickname:
            existing_player.nickname = nickname
            db.session.commit()
        return jsonify(existing_player.to_dict()), 200

    # Create new player
    player = Player(nickname=nickname, email=email)
    db.session.add(player)
    db.session.commit()

    return jsonify(player.to_dict()), 201


@players_bp.route('/players/<player_id>', methods=['GET'])
def get_player(player_id):
    """Get a player by ID"""
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.to_dict())


@players_bp.route('/players', methods=['GET'])
def list_players():
    """List all players (admin)"""
    players = Player.query.order_by(Player.created_at.desc()).all()
    return jsonify({
        'players': [p.to_dict() for p in players]
    })


@players_bp.route('/players/<player_id>/hide', methods=['POST'])
def hide_player(player_id):
    """Hide a player from the leaderboard (admin)"""
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    player.is_hidden = True
    db.session.commit()
    return jsonify(player.to_dict())


@players_bp.route('/players/<player_id>/unhide', methods=['POST'])
def unhide_player(player_id):
    """Unhide a player from the leaderboard (admin)"""
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    player.is_hidden = False
    db.session.commit()
    return jsonify(player.to_dict())
