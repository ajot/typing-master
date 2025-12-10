from flask import Blueprint, jsonify
from models import db, Score, Player
from datetime import datetime, timedelta
from sqlalchemy import func

leaderboard_bp = Blueprint('leaderboard', __name__)

@leaderboard_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get today's top 10 scores"""
    # Get start of today (UTC)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Query top 10 scores from today
    top_scores = db.session.query(Score, Player).join(Player).filter(
        Score.created_at >= today_start
    ).order_by(Score.score.desc()).limit(10).all()

    leaderboard = []
    for rank, (score, player) in enumerate(top_scores, 1):
        leaderboard.append({
            'rank': rank,
            'nickname': player.nickname,
            'wpm': score.wpm,
            'accuracy': round(score.accuracy * 100, 1),
            'score': score.score,
            'created_at': score.created_at.isoformat()
        })

    return jsonify({
        'date': today_start.strftime('%Y-%m-%d'),
        'leaderboard': leaderboard
    })


@leaderboard_bp.route('/leaderboard/all-time', methods=['GET'])
def get_all_time_leaderboard():
    """Get all-time top 10 scores (best score per player)"""
    # Get all scores ordered by score descending
    all_scores = db.session.query(Score, Player).join(Player).order_by(
        Score.score.desc()
    ).all()

    # Filter to keep only best score per player
    seen_players = set()
    top_scores = []
    for score, player in all_scores:
        if player.id not in seen_players:
            seen_players.add(player.id)
            top_scores.append((score, player))
            if len(top_scores) >= 10:
                break

    leaderboard = []
    for rank, (score, player) in enumerate(top_scores, 1):
        leaderboard.append({
            'rank': rank,
            'nickname': player.nickname,
            'wpm': score.wpm,
            'accuracy': round(score.accuracy * 100, 1),
            'score': score.score,
            'created_at': score.created_at.isoformat()
        })

    return jsonify({
        'leaderboard': leaderboard
    })
