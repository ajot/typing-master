import os
from flask import Blueprint, request, jsonify

ai_bp = Blueprint('ai', __name__)

# Performance tier definitions
def get_performance_tier(wpm: float, accuracy: float) -> dict:
    """Determine performance tier based on WPM and accuracy."""
    if wpm >= 80 and accuracy >= 0.95:
        return {
            'tier': 'legendary',
            'system_prompt': (
                "You are an epic 80s arcade game announcer. Respond with a single victory "
                "message in ALL CAPS. Be dramatic and over-the-top. Max 100 characters. No quotes."
            ),
            'user_prompt_template': (
                "Player {nickname} just achieved LEGENDARY status: {wpm} WPM with {accuracy}% accuracy "
                "in a typing game! Announce their glory!"
            )
        }
    elif wpm >= 60 and accuracy >= 0.90:
        return {
            'tier': 'excellent',
            'system_prompt': (
                "You are a cloud computing enthusiast who loves DigitalOcean puns. Give a "
                "celebratory message with a cloud/server/deployment joke. Max 100 characters. No quotes."
            ),
            'user_prompt_template': (
                "Player {nickname} scored {wpm} WPM with {accuracy}% accuracy. "
                "Celebrate with a cloud computing pun!"
            )
        }
    elif wpm >= 40 and accuracy >= 0.80:
        return {
            'tier': 'great',
            'system_prompt': (
                "You are an encouraging tech mentor who uses cloud computing metaphors. "
                "Be positive and motivating. Max 100 characters. No quotes."
            ),
            'user_prompt_template': (
                "Player {nickname} scored {wpm} WPM with {accuracy}% accuracy. "
                "Encourage them with a cloud/tech reference!"
            )
        }
    elif wpm >= 20:
        return {
            'tier': 'good',
            'system_prompt': (
                "You are a friendly coach who gently teases but stays encouraging. "
                "Use a cloud/tech pun. Max 100 characters. No quotes."
            ),
            'user_prompt_template': (
                "Player {nickname} scored {wpm} WPM with {accuracy}% accuracy. "
                "Give them a light-hearted nudge to improve!"
            )
        }
    else:
        return {
            'tier': 'needs_practice',
            'system_prompt': (
                "You are a snarky but lovable robot who roasts bad performance with tech puns. "
                "Keep it playful, not mean. Encourage retry. Max 100 characters. No quotes."
            ),
            'user_prompt_template': (
                "Player {nickname} scored {wpm} WPM with {accuracy}% accuracy. "
                "Give them a playful roast that makes them want to try again!"
            )
        }


# Fallback messages by tier
FALLBACK_MESSAGES = {
    'legendary': 'LEGENDARY!',
    'excellent': 'EXCELLENT!',
    'great': 'GREAT JOB!',
    'good': 'GOOD EFFORT!',
    'needs_practice': 'KEEP PRACTICING!'
}


@ai_bp.route('/ai/performance-message', methods=['POST'])
def get_performance_message():
    """Generate an AI-powered performance message using Gradient AI."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    nickname = data.get('nickname', 'Player')
    wpm = data.get('wpm', 0)
    accuracy = data.get('accuracy', 0)

    # Convert accuracy to percentage if it's a decimal
    accuracy_percent = int(accuracy * 100) if accuracy <= 1 else int(accuracy)

    # Get performance tier
    tier_info = get_performance_tier(wpm, accuracy if accuracy <= 1 else accuracy / 100)
    tier = tier_info['tier']

    # Check for API key
    api_key = os.getenv('DIGITAL_OCEAN_MODEL_ACCESS_KEY')

    if not api_key:
        # Return fallback message if no API key
        return jsonify({
            'message': FALLBACK_MESSAGES[tier],
            'tier': tier,
            'ai_generated': False
        })

    try:
        from gradient import Gradient

        client = Gradient(model_access_key=api_key)

        # Build prompts
        system_prompt = tier_info['system_prompt']
        user_prompt = tier_info['user_prompt_template'].format(
            nickname=nickname.upper(),
            wpm=wpm,
            accuracy=accuracy_percent
        )

        # Call Gradient AI with timeout
        resp = client.chat.completions.create(
            model="llama3-8b-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        )

        message = resp.choices[0].message.content

        # Clean up the message (remove quotes if present)
        message = message.strip().strip('"\'')

        # Ensure message isn't too long
        if len(message) > 150:
            message = message[:147] + "..."

        return jsonify({
            'message': message,
            'tier': tier,
            'ai_generated': True
        })

    except Exception as e:
        # Return fallback on any error
        print(f"AI generation error: {e}")
        return jsonify({
            'message': FALLBACK_MESSAGES[tier],
            'tier': tier,
            'ai_generated': False,
            'error': str(e)
        })
