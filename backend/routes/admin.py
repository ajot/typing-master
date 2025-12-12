from flask import Blueprint, request, jsonify
from sqlalchemy import func, or_, cast, Numeric
from models import db, Player, Score
import re

admin_bp = Blueprint('admin', __name__)

# DO team domains
DO_DOMAINS = ['digitalocean.com', 'ajot.me']

# Known personal email providers
PERSONAL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'aol.com', 'protonmail.com', 'proton.me', 'live.com', 'msn.com',
    'me.com', 'mac.com', 'mail.com', 'ymail.com', 'googlemail.com',
    'fastmail.com', 'zoho.com', 'tutanota.com', 'hey.com'
]

# Obviously fake domains
FAKE_DOMAINS = [
    'test.com', 'example.com', 'fake.com', 'asdf.com', 'xyz.com',
    'aaa.com', 'abc.com', '123.com', 'temp.com', 'tempmail.com',
    'mailinator.com', 'guerrillamail.com', 'throwaway.com',
    'fakeemail.com', 'noemail.com', 'none.com', 'na.com', 'n.com',
    'x.com', 'a.com', 'aa.com', 'aaaa.com', 'testing.com',
    'do.com', 'robot.com', 'secret.com', 'email.com', 'mail.co'
]

# Suspicious TLDs often used for fake emails
FAKE_TLDS = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq']

# Common TLD typos (misspellings of .com, .net, .org, etc.)
TYPO_TLDS = [
    '.co', '.con', '.cmo', '.ocm', '.vom', '.xom', '.om',  # .com typos
    '.ner', '.nte', '.bet', '.met',                         # .net typos
    '.ogr', '.otg', '.prg',                                 # .org typos
    '.gmai', '.gmial', '.gmal',                             # gmail typos (in domain)
]

# Fake username patterns (regex)
FAKE_USERNAME_PATTERNS = [
    r'^test\d*$',           # test, test1, test123
    r'^asdf+$',             # asdf, asdfasdf
    r'^[a-z]$',             # single letter
    r'^[a-z]{1,2}\d*$',     # a1, ab, ab123
    r'^fake',               # fake, fakeuser
    r'^none$',
    r'^na$',
    r'^null$',
    r'^admin$',
    r'^user\d*$',           # user, user1
    r'^demo\d*$',           # demo, demo1
    r'^sample\d*$',
    r'^\d+$',               # all numbers
    r'^x+$',                # x, xx, xxx
    r'^aaa+$',              # aaa, aaaa
    r'^player\d*$',         # player, player1
    r'^hello$',             # hello
    r'^noemail$',           # noemail
    r'^secret$',            # secret
    r'^xyz$',               # xyz
    r'^lol$',               # lol
    r'^lmao$',              # lmao
    r'^hi$',                # hi
    r'^hey$',               # hey
    r'^yo$',                # yo
    r'^blah$',              # blah
    r'^foo$',               # foo
    r'^bar$',               # bar
    r'^baz$',               # baz
    r'^qwerty',             # qwerty, qwerty123
    r'^abcd*$',             # abc, abcd, abcde
    r'.*[!@#$%^&*()+=].*',  # special chars in username (except . - _)
]


def classify_email(email: str) -> str:
    """Classify an email using deterministic rules"""
    email = email.lower().strip()

    if '@' not in email:
        return 'fake'

    username, domain = email.rsplit('@', 1)
    domain_name = domain.split('.')[0] if '.' in domain else domain

    # 1. Check DO domains FIRST - trust the domain, but reject obviously fake usernames
    if domain in DO_DOMAINS:
        # Only reject truly fake test usernames for DO domains
        if username in ['test', 'asdf', 'fake', 'null', 'admin', 'user', 'demo', 'sample']:
            return 'suspicious'
        return 'do_employee'

    # 2. Check fake username patterns (for non-DO emails)
    for pattern in FAKE_USERNAME_PATTERNS:
        if re.match(pattern, username):
            return 'suspicious'

    # 3. Check if username matches domain (secret@secret.com)
    if username == domain_name:
        return 'suspicious'

    # 4. Check obviously fake domains
    if domain in FAKE_DOMAINS:
        return 'suspicious'

    # 5. Check for suspicious TLDs
    for tld in FAKE_TLDS:
        if domain.endswith(tld):
            return 'suspicious'

    # 6. Check for TLD typos (e.g., gmail.co, gmail.con)
    for typo in TYPO_TLDS:
        if domain.endswith(typo):
            return 'typo'

    # 7. Check for very short domains (like do.com, x.co)
    if len(domain_name) <= 2:
        return 'suspicious'

    # 8. Check for no TLD or malformed domain
    if domain.count('.') == 0:
        return 'suspicious'

    # 8. Check personal email providers
    if domain in PERSONAL_DOMAINS:
        return 'personal'

    # 9. Everything else is likely a company email
    # (real domain, not a known personal provider)
    return 'company'


@admin_bp.route('/api/admin/stats', methods=['GET'])
def get_stats():
    """Get admin dashboard stats with optional email filter"""
    email_filter = request.args.get('email', '').strip()
    do_filter = request.args.get('do_filter', 'all').strip()  # 'all', 'only_do', 'exclude_do'

    # DO team email patterns (with @ prefix for SQL matching)
    do_domain_patterns = [f'@{d}' for d in DO_DOMAINS]

    # Base query for players with scores
    # Use cast to Numeric for PostgreSQL round() compatibility
    query = db.session.query(
        Player.id,
        Player.email,
        Player.nickname,
        Player.is_hidden,
        Player.email_type,
        Player.created_at,
        func.count(Score.id).label('games_played'),
        func.max(Score.score).label('best_score'),
        func.round(cast(func.avg(Score.wpm), Numeric), 1).label('avg_wpm'),
        func.round(cast(func.avg(Score.accuracy * 100), Numeric), 1).label('avg_accuracy')
    ).outerjoin(Score, Player.id == Score.player_id)

    # Exclude hidden players
    query = query.filter(Player.is_hidden == False)

    # Apply DO filter (use ilike for case-insensitive matching)
    if do_filter == 'only_do':
        # Only show DO team members
        do_conditions = [Player.email.ilike(f'%{domain}') for domain in do_domain_patterns]
        query = query.filter(or_(*do_conditions))
    elif do_filter == 'exclude_do':
        # Exclude DO team members
        for domain in do_domain_patterns:
            query = query.filter(~Player.email.ilike(f'%{domain}'))

    # Apply email filter if provided
    if email_filter:
        # Support comma-separated emails or domains
        filters = [f.strip() for f in email_filter.split(',')]
        conditions = []
        for f in filters:
            if f.startswith('@'):
                # Domain filter
                conditions.append(Player.email.like(f'%{f}'))
            else:
                # Exact email or partial match
                conditions.append(Player.email.like(f'%{f}%'))
        query = query.filter(or_(*conditions))

    # Group by player and order by games played
    players = query.group_by(
        Player.id, Player.email, Player.nickname,
        Player.is_hidden, Player.email_type, Player.created_at
    ).order_by(func.count(Score.id).desc()).all()

    # Calculate totals
    total_players = len(players)
    total_games = sum(p.games_played or 0 for p in players)
    players_with_games = sum(1 for p in players if p.games_played > 0)

    # Format player data
    player_list = [{
        'id': str(p.id),
        'email': p.email,
        'nickname': p.nickname,
        'email_type': p.email_type,
        'games_played': p.games_played or 0,
        'best_score': p.best_score or 0,
        'avg_wpm': float(p.avg_wpm) if p.avg_wpm else 0,
        'avg_accuracy': float(p.avg_accuracy) if p.avg_accuracy else 0,
        'created_at': p.created_at.isoformat() if p.created_at else None
    } for p in players]

    return jsonify({
        'total_players': total_players,
        'total_games': total_games,
        'players_with_games': players_with_games,
        'players': player_list
    })


@admin_bp.route('/api/admin/analyze-emails', methods=['POST'])
def analyze_emails():
    """Analyze all emails using deterministic rules and update verdicts"""
    # Get all players without a verdict (or optionally re-analyze all)
    reanalyze = request.json.get('reanalyze', False) if request.json else False

    if reanalyze:
        players = Player.query.filter(Player.is_hidden == False).all()
    else:
        players = Player.query.filter(
            Player.is_hidden == False,
            (Player.email_type == None) | (Player.email_type == '')
        ).all()

    if not players:
        return jsonify({'message': 'No emails to analyze', 'analyzed': 0})

    # Classify each email using rules
    results = {}
    updated = 0

    for player in players:
        verdict = classify_email(player.email)
        player.email_type = verdict
        results[player.email] = verdict
        updated += 1

    db.session.commit()

    return jsonify({
        'message': f'Analyzed {len(players)} emails',
        'analyzed': len(players),
        'updated': updated,
        'results': results
    })
