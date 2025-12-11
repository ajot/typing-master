import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from models import db

load_dotenv()

def create_app():
    # Check if static folder exists (production build)
    static_folder = os.path.join(os.path.dirname(__file__), 'static')
    if os.path.exists(static_folder):
        app = Flask(__name__, static_folder='static', static_url_path='')
    else:
        app = Flask(__name__)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        'postgresql://localhost/typing_master'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

    # Initialize extensions
    CORS(app)
    db.init_app(app)

    # Register blueprints
    from routes.players import players_bp
    from routes.prompts import prompts_bp
    from routes.scores import scores_bp
    from routes.leaderboard import leaderboard_bp

    app.register_blueprint(players_bp, url_prefix='/api')
    app.register_blueprint(prompts_bp, url_prefix='/api')
    app.register_blueprint(scores_bp, url_prefix='/api')
    app.register_blueprint(leaderboard_bp, url_prefix='/api')

    # Health check endpoint
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'healthy', 'message': 'Typing Master API is running!'})

    # Serve frontend for all non-API routes (SPA support)
    @app.route('/')
    def serve_index():
        if app.static_folder:
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Frontend not built'}), 404

    @app.route('/<path:path>')
    def serve_static(path):
        if app.static_folder:
            # Try to serve the file, fallback to index.html for SPA routing
            if os.path.exists(os.path.join(app.static_folder, path)):
                return send_from_directory(app.static_folder, path)
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Frontend not built'}), 404

    # Create tables
    with app.app_context():
        db.create_all()

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
