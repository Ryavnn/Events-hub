from flask import Flask, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)


app.secret_key = 'supersecretkey'  # Replace in production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///admin.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Admin model
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

# Function to create default admin
def create_admin():
    db.create_all()
    if not Admin.query.filter_by(username='admin').first():
        hashed_pw = generate_password_hash('admin123')  # System default password
        new_admin = Admin(username='admin', password_hash=hashed_pw)
        db.session.add(new_admin)
        db.session.commit()
        print("✅ Admin user created.")

# Auth decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    admin = Admin.query.filter_by(username=username).first()

    if admin and check_password_hash(admin.password_hash, password):
        session['admin_logged_in'] = True
        return jsonify({'message': 'Login successful'}), 200

    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/admin/dashboard', methods=['GET'])
@login_required
def dashboard():
    return jsonify({'message': 'Welcome to the Admin Dashboard'}), 200

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

if __name__ == '__main__':
    with app.app_context():
        create_admin()
    app.run(debug=True)
