from flask import Blueprint, request, jsonify
from models import db, Prompt
from sqlalchemy.sql.expression import func

prompts_bp = Blueprint('prompts', __name__)

@prompts_bp.route('/prompts/random', methods=['GET'])
def get_random_prompt():
    """Get a random active prompt"""
    prompt = Prompt.query.filter_by(is_active=True).order_by(func.random()).first()

    if not prompt:
        return jsonify({'error': 'No prompts available'}), 404

    # Increment times_used
    prompt.times_used += 1
    db.session.commit()

    return jsonify(prompt.to_dict())


@prompts_bp.route('/prompts', methods=['GET'])
def list_prompts():
    """List all prompts (admin)"""
    prompts = Prompt.query.order_by(Prompt.created_at.desc()).all()
    return jsonify([p.to_dict() for p in prompts])


@prompts_bp.route('/prompts', methods=['POST'])
def create_prompt():
    """Create a new prompt (admin)"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Text is required'}), 400

    prompt = Prompt(
        text=text,
        category=data.get('category', 'general'),
        difficulty=data.get('difficulty', 'medium'),
        is_active=data.get('is_active', True)
    )
    db.session.add(prompt)
    db.session.commit()

    return jsonify(prompt.to_dict()), 201


@prompts_bp.route('/prompts/<prompt_id>', methods=['PATCH'])
def update_prompt(prompt_id):
    """Update a prompt (admin)"""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'text' in data:
        prompt.text = data['text'].strip()
    if 'category' in data:
        prompt.category = data['category']
    if 'difficulty' in data:
        prompt.difficulty = data['difficulty']
    if 'is_active' in data:
        prompt.is_active = data['is_active']

    db.session.commit()
    return jsonify(prompt.to_dict())


@prompts_bp.route('/prompts/<prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    """Delete a prompt (admin)"""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    db.session.delete(prompt)
    db.session.commit()
    return jsonify({'message': 'Prompt deleted'})
