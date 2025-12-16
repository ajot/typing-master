import os
from flask import Blueprint, request, jsonify
from models import db, Prompt
from sqlalchemy.sql.expression import func

prompts_bp = Blueprint('prompts', __name__)

# Category descriptions for AI prompt generation
CATEGORY_DESCRIPTIONS = {
    'droplets': 'DigitalOcean Droplets (virtual machines/cloud servers)',
    'kubernetes': 'DigitalOcean Kubernetes (DOKS, container orchestration)',
    'app-platform': 'DigitalOcean App Platform (PaaS for deploying apps)',
    'databases': 'DigitalOcean Managed Databases (PostgreSQL, MySQL, Redis, MongoDB)',
    'spaces': 'DigitalOcean Spaces (S3-compatible object storage)',
    'gradient-ai': 'DigitalOcean Gradient AI (GenAI platform with LLM inference)',
    'general': 'DigitalOcean cloud computing and infrastructure in general'
}

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


@prompts_bp.route('/prompts/generate', methods=['POST'])
def generate_prompt():
    """Generate a typing prompt using Gradient AI (admin)"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    category = data.get('category', 'general')
    difficulty = data.get('difficulty', 'medium')

    # Validate category
    if category not in CATEGORY_DESCRIPTIONS:
        return jsonify({'error': f'Invalid category. Must be one of: {", ".join(CATEGORY_DESCRIPTIONS.keys())}'}), 400

    # Validate difficulty
    if difficulty not in ['easy', 'medium', 'hard']:
        return jsonify({'error': 'Invalid difficulty. Must be easy, medium, or hard'}), 400

    # Check for API key
    api_key = os.getenv('DIGITAL_OCEAN_MODEL_ACCESS_KEY')

    if not api_key:
        return jsonify({'error': 'AI generation not available - API key not configured'}), 503

    try:
        from gradient import Gradient

        client = Gradient(model_access_key=api_key)

        category_desc = CATEGORY_DESCRIPTIONS[category]

        system_prompt = (
            "You are a technical writer creating typing practice prompts about cloud computing. "
            "Generate a single educational typing prompt about the specified topic. "
            "The prompt should be 150-250 characters long. "
            "Write in plain, clear language. No buzzwords, no marketing speak, no hype. "
            "Just explain what the technology does in simple terms that anyone can understand. "
            "Do not use quotes around the response. "
            "Just respond with the prompt text, nothing else."
        )

        user_prompt = f"Generate a typing practice prompt about {category_desc}. Make it educational and fun to type."

        resp = client.chat.completions.create(
            model="llama3-8b-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        )

        generated_text = resp.choices[0].message.content.strip().strip('"\'')

        return jsonify({
            'text': generated_text,
            'category': category,
            'difficulty': difficulty,
            'ai_generated': True
        })

    except Exception as e:
        print(f"AI prompt generation error: {e}")
        return jsonify({
            'error': f'AI generation failed: {str(e)}'
        }), 500
