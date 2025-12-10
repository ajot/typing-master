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
        # Return existing player
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
