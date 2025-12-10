from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class Player(db.Model):
    __tablename__ = 'players'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    nickname = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scores = db.relationship('Score', backref='player', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nickname': self.nickname,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


class Prompt(db.Model):
    __tablename__ = 'prompts'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    text = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default='general')
    difficulty = db.Column(db.String(20), default='medium')
    is_active = db.Column(db.Boolean, default=True)
    times_used = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scores = db.relationship('Score', backref='prompt', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'category': self.category,
            'difficulty': self.difficulty,
            'is_active': self.is_active,
            'times_used': self.times_used,
            'created_at': self.created_at.isoformat()
        }


class Score(db.Model):
    __tablename__ = 'scores'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    player_id = db.Column(db.String(36), db.ForeignKey('players.id'), nullable=False)
    prompt_id = db.Column(db.String(36), db.ForeignKey('prompts.id'), nullable=False)
    wpm = db.Column(db.Integer, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'player_id': self.player_id,
            'prompt_id': self.prompt_id,
            'wpm': self.wpm,
            'accuracy': self.accuracy,
            'score': self.score,
            'created_at': self.created_at.isoformat(),
            'player': self.player.to_dict() if self.player else None
        }
