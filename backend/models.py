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
    is_hidden = db.Column(db.Boolean, default=False)  # Hide from leaderboard
    email_type = db.Column(db.String(50), nullable=True)  # Classification: do_employee, company, personal, suspicious, typo
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scores = db.relationship('Score', backref='player', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nickname': self.nickname,
            'email': self.email,
            'is_hidden': self.is_hidden,
            'email_type': self.email_type,
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


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    config = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scores = db.relationship('Score', backref='event', lazy=True)
    consents = db.relationship('EventConsent', backref='event', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'is_active': self.is_active,
            'config': self.config or {},
            'created_at': self.created_at.isoformat()
        }


class EventConsent(db.Model):
    __tablename__ = 'event_consents'
    __table_args__ = (
        db.UniqueConstraint('event_id', 'player_id', name='uq_event_player'),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    event_id = db.Column(db.String(36), db.ForeignKey('events.id'), nullable=False)
    player_id = db.Column(db.String(36), db.ForeignKey('players.id'), nullable=False)
    consented = db.Column(db.Boolean, nullable=True)
    consent_text = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    player = db.relationship('Player', backref='event_consents', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'player_id': self.player_id,
            'consented': self.consented,
            'consent_text': self.consent_text,
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
    event_id = db.Column(db.String(36), db.ForeignKey('events.id'), nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'player_id': self.player_id,
            'prompt_id': self.prompt_id,
            'wpm': self.wpm,
            'accuracy': self.accuracy,
            'score': self.score,
            'event_id': self.event_id,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'created_at': self.created_at.isoformat(),
            'player': self.player.to_dict() if self.player else None
        }
