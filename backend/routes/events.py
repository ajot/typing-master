import os
from flask import Blueprint, request, jsonify
from models import db, Event, EventConsent
from datetime import datetime

events_bp = Blueprint('events', __name__)


@events_bp.route('/events/<slug>', methods=['GET'])
def get_event_by_slug(slug):
    """Get event config by slug (public)"""
    event = Event.query.filter_by(slug=slug, is_active=True).first()
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    return jsonify(event.to_dict())


@events_bp.route('/events/<event_id>/consent', methods=['POST'])
def record_consent(event_id):
    """Record player consent for an event (public)"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    if not data or not data.get('player_id'):
        return jsonify({'error': 'player_id is required'}), 400

    player_id = data['player_id']
    consented = data.get('consented')

    # Get consent label from event config for snapshot
    consent_config = (event.config or {}).get('consent', {})
    consent_text = consent_config.get('label') if consent_config.get('enabled') else None

    # Get client IP
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip_address and ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()

    # Upsert: update if exists, create if not
    existing = EventConsent.query.filter_by(
        event_id=event_id, player_id=player_id
    ).first()

    if existing:
        existing.consented = consented
        existing.consent_text = consent_text
        existing.ip_address = ip_address
    else:
        consent_record = EventConsent(
            event_id=event_id,
            player_id=player_id,
            consented=consented,
            consent_text=consent_text,
            ip_address=ip_address,
        )
        db.session.add(consent_record)

    db.session.commit()
    return jsonify({'status': 'ok'}), 200


@events_bp.route('/events', methods=['POST'])
def create_event():
    """Create a new event (admin)"""
    if os.getenv('FLASK_ENV') != 'development' and os.getenv('ENABLE_ADMIN') != 'true':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    slug = data.get('slug')
    name = data.get('name')

    if not slug or not name:
        return jsonify({'error': 'slug and name are required'}), 400

    if Event.query.filter_by(slug=slug).first():
        return jsonify({'error': 'Event with this slug already exists'}), 409

    event = Event(
        slug=slug,
        name=name,
        is_active=data.get('is_active', True),
        config=data.get('config', {}),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify(event.to_dict()), 201


@events_bp.route('/events/<event_id>', methods=['PATCH'])
def update_event(event_id):
    """Update an event (admin)"""
    if os.getenv('FLASK_ENV') != 'development' and os.getenv('ENABLE_ADMIN') != 'true':
        return jsonify({'error': 'Admin access required'}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'is_active' in data:
        event.is_active = data['is_active']
    if 'name' in data:
        event.name = data['name']
    if 'config' in data:
        event.config = data['config']

    db.session.commit()
    return jsonify(event.to_dict())


@events_bp.route('/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event (admin)"""
    if os.getenv('FLASK_ENV') != 'development' and os.getenv('ENABLE_ADMIN') != 'true':
        return jsonify({'error': 'Admin access required'}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Delete associated consents first
    EventConsent.query.filter_by(event_id=event_id).delete()
    db.session.delete(event)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200


@events_bp.route('/events', methods=['GET'])
def list_events():
    """List all events (admin)"""
    if os.getenv('FLASK_ENV') != 'development' and os.getenv('ENABLE_ADMIN') != 'true':
        return jsonify({'error': 'Admin access required'}), 403

    events = Event.query.order_by(Event.created_at.desc()).all()
    return jsonify([e.to_dict() for e in events])
