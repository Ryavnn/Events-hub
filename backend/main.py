from flask import Flask, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_cors import CORS
from datetime import datetime
import json
import jwt
from datetime import datetime, timedelta
from datetime import datetime, timezone
from flask import send_file
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import Image
import qrcode
import io
import uuid
import os
from datetime import datetime
import string
import random

app = Flask(__name__)
CORS(app, 
     supports_credentials=True, 
     origins=["http://127.0.0.1:5500", "http://localhost:5500"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Add a route to handle OPTIONS requests globally
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 200

app.secret_key = 'supersecretkey'  # Replace in production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///admin.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'  # Use a strong key in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)  # Token validity period


db = SQLAlchemy(app)

# Admin model
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

# Event model
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    venue = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(300), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    start_time = db.Column(db.String(5), nullable=False)  # Format: "HH:MM"
    end_time = db.Column(db.String(5), nullable=True)     # Format: "HH:MM"
    status = db.Column(db.String(20), nullable=False)     # "Active", "Upcoming", "Completed", "Cancelled"
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationship with ticket types
    ticket_types = db.relationship('TicketType', backref='event', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'venue': self.venue,
            'address': self.address,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'startTime': self.start_time,
            'endTime': self.end_time,
            'status': self.status,
            'date': self.format_date_for_display(),
            'ticketsSold': self.get_tickets_sold(),
            'totalTickets': self.get_total_tickets(),
            'revenue': self.get_revenue(),
            'tickets': self.get_tickets_dict()
        }
        
    def format_date_for_display(self):
        """Format date for display in frontend"""
        if not self.start_date:
            return ""
            
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        start_month = months[self.start_date.month - 1]
        start_day = self.start_date.day
        start_year = self.start_date.year
        
        if not self.end_date or self.start_date == self.end_date:
            return f"{start_month} {start_day}, {start_year}"
            
        end_month = months[self.end_date.month - 1]
        end_day = self.end_date.day
        end_year = self.end_date.year
        
        if start_year != end_year:
            return f"{start_month} {start_day}, {start_year} - {end_month} {end_day}, {end_year}"
            
        if start_month != end_month:
            return f"{start_month} {start_day} - {end_month} {end_day}, {start_year}"
            
        return f"{start_month} {start_day}-{end_day}, {start_year}"
    
    def get_tickets_sold(self):
        """Calculate total tickets sold across all ticket types"""
        return sum(ticket_type.sold for ticket_type in self.ticket_types)
    
    def get_total_tickets(self):
        """Calculate total tickets available across all ticket types"""
        return sum(ticket_type.quantity for ticket_type in self.ticket_types)
    
    def get_revenue(self):
        """Calculate total revenue from sold tickets"""
        return sum(ticket_type.price * ticket_type.sold for ticket_type in self.ticket_types)
    
    def get_tickets_dict(self):
        """Get ticket information in dictionary format for frontend"""
        tickets = {}
        for ticket_type in self.ticket_types:
            tickets[ticket_type.type_name] = {
                'price': ticket_type.price,
                'quantity': ticket_type.quantity,
                'sold': ticket_type.sold,
                'startDate': ticket_type.start_date.isoformat() if ticket_type.start_date else None,
                'endDate': ticket_type.end_date.isoformat() if ticket_type.end_date else None
            }
        return tickets

# Ticket Type model for different ticket categories (Early Bird, Regular, VIP)
class TicketType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    type_name = db.Column(db.String(50), nullable=False)  # "earlyBird", "regular", "vip"
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    sold = db.Column(db.Integer, nullable=False, default=0)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(20), unique=True, nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    ticket_type_id = db.Column(db.Integer, db.ForeignKey('ticket_type.id'), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_email = db.Column(db.String(100), nullable=False)
    purchase_date = db.Column(db.DateTime, default=datetime.now)
    is_used = db.Column(db.Boolean, default=False)
    
    # Relationships
    event = db.relationship('Event', backref='tickets')
    ticket_type = db.relationship('TicketType', backref='tickets')

    def to_dict(self):
        return {
            'id': self.id,
            'ticketNumber': self.ticket_number,
            'eventId': self.event_id,
            'eventName': self.event.name,
            'ticketType': self.ticket_type.type_name,
            'customerName': self.customer_name,
            'customerEmail': self.customer_email,
            'purchaseDate': self.purchase_date.isoformat(),
            'isUsed': self.is_used
        }

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
# Replace the login_required decorator
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Verify the token
            jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            # If we get here, token is valid
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
            
    return decorated_function


def generate_ticket_number():
    """Generate a unique ticket number in format EVENT-XXXX-XXXX"""
    prefix = ''.join(random.choices(string.ascii_uppercase, k=2))
    first_part = ''.join(random.choices(string.digits, k=4))
    second_part = ''.join(random.choices(string.digits, k=4))
    ticket_number = f"{prefix}-{first_part}-{second_part}"
    
    # Check if the ticket number already exists
    if Ticket.query.filter_by(ticket_number=ticket_number).first():
        # Recursively generate a new one if it exists
        return generate_ticket_number()
    
    return ticket_number
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    admin = Admin.query.filter_by(username=username).first()

    if admin and check_password_hash(admin.password_hash, password):
        # Create the JWT token with timezone-aware datetime
        token = jwt.encode({
            'sub': admin.username,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')

        # Decode the token if it's bytes
        if isinstance(token, bytes):
            token = token.decode('utf-8')

        return jsonify({
            'message': 'Login successful',
            'token': token
        }), 200

    return jsonify({'message': 'Invalid credentials'}), 4011

@app.route('/admin/dashboard', methods=['GET'])
@token_required
def dashboard():
    return jsonify({'message': 'Welcome to the Admin Dashboard'}), 200

@app.route('/logout', methods=['POST'])
@token_required
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

# Event API Routes
@app.route('/api/events', methods=['GET'])
@token_required
def get_events():
    # Parse query parameters for filtering and pagination
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', 10, type=int)
    search_term = request.args.get('search', '')
    status_filter = request.args.get('status', 'all')
    date_filter = request.args.get('date', 'all')
    sort_by = request.args.get('sortBy', 'id')
    sort_dir = request.args.get('sortDir', 'desc')
    
    # Start with base query
    query = Event.query
    
    # Apply search filter
    if search_term:
        query = query.filter((Event.name.ilike(f'%{search_term}%')) | 
                            (Event.venue.ilike(f'%{search_term}%')))
    
    # Apply status filter
    if status_filter != 'all':
        query = query.filter(Event.status.ilike(f'%{status_filter}%'))
    
    # Apply date filter
    today = datetime.now().date()
    if date_filter == 'today':
        query = query.filter(Event.start_date == today)
    elif date_filter == 'this-week':
        # Simple approach - events in the next 7 days
        from datetime import timedelta
        end_of_week = today + timedelta(days=6)
        query = query.filter(Event.start_date.between(today, end_of_week))
    elif date_filter == 'this-month':
        # Events in the current month
        query = query.filter(
            (db.extract('month', Event.start_date) == today.month) &
            (db.extract('year', Event.start_date) == today.year)
        )
    elif date_filter == 'this-year':
        # Events in the current year
        query = query.filter(db.extract('year', Event.start_date) == today.year)
    
    # Apply sorting
    if sort_by == 'name':
        query = query.order_by(Event.name.asc() if sort_dir == 'asc' else Event.name.desc())
    elif sort_by == 'date':
        query = query.order_by(Event.start_date.asc() if sort_dir == 'asc' else Event.start_date.desc())
    elif sort_by == 'revenue':
        # Sorting by revenue is complex since it's calculated - default to newest first
        query = query.order_by(Event.id.desc())
    else:
        # Default sort by ID (newest first)
        query = query.order_by(Event.id.desc())
    
    # Get total count for pagination
    total_events = query.count()
    
    # Apply pagination
    events = query.paginate(page=page, per_page=page_size, error_out=False)
    
    # Format response
    return jsonify({
        'events': [event.to_dict() for event in events.items],
        'totalEvents': total_events
    })

@app.route('/api/events', methods=['POST'])
@token_required
def create_event():
    data = request.get_json()
    
    try:
        # Create new event
        new_event = Event(
            name=data['name'],
            description=data.get('description', ''),
            venue=data['venue'],
            address=data.get('address', ''),
            start_date=datetime.fromisoformat(data['startDate']).date(),
            end_date=datetime.fromisoformat(data['endDate']).date() if data.get('endDate') else None,
            start_time=data['startTime'],
            end_time=data.get('endTime', ''),
            status=determine_event_status(data['startDate'], data.get('endDate'))
        )
        
        db.session.add(new_event)
        db.session.flush()  # Get the new event ID before committing
        
        # Add ticket types
        if 'tickets' in data:
            tickets = data['tickets']
            
            # Early Bird tickets
            if 'earlyBird' in tickets and float(tickets['earlyBird']['price']) > 0:
                early_bird = TicketType(
                    event_id=new_event.id,
                    type_name='earlyBird',
                    price=float(tickets['earlyBird']['price']),
                    quantity=int(tickets['earlyBird']['quantity']),
                    sold=0,
                    start_date=datetime.fromisoformat(tickets['earlyBird']['startDate']).date() if tickets['earlyBird'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['earlyBird']['endDate']).date() if tickets['earlyBird'].get('endDate') else None
                )
                db.session.add(early_bird)
            
            # Regular tickets
            if 'regular' in tickets and float(tickets['regular']['price']) > 0:
                regular = TicketType(
                    event_id=new_event.id,
                    type_name='regular',
                    price=float(tickets['regular']['price']),
                    quantity=int(tickets['regular']['quantity']),
                    sold=0,
                    start_date=datetime.fromisoformat(tickets['regular']['startDate']).date() if tickets['regular'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['regular']['endDate']).date() if tickets['regular'].get('endDate') else None
                )
                db.session.add(regular)
            
            # VIP tickets
            if 'vip' in tickets and float(tickets['vip']['price']) > 0:
                vip = TicketType(
                    event_id=new_event.id,
                    type_name='vip',
                    price=float(tickets['vip']['price']),
                    quantity=int(tickets['vip']['quantity']),
                    sold=0,
                    start_date=datetime.fromisoformat(tickets['vip']['startDate']).date() if tickets['vip'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['vip']['endDate']).date() if tickets['vip'].get('endDate') else None
                )
                db.session.add(vip)
        
        db.session.commit()
        return jsonify({'message': 'Event created successfully', 'event': new_event.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating event: {str(e)}'}), 400

@app.route('/api/events/<int:event_id>', methods=['GET'])
@token_required
def get_event(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())

@app.route('/api/events/<int:event_id>', methods=['PUT'])
@token_required
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json()
    
    try:
        # Update event details
        event.name = data.get('name', event.name)
        event.description = data.get('description', event.description)
        event.venue = data.get('venue', event.venue)
        event.address = data.get('address', event.address)
        
        if 'startDate' in data:
            event.start_date = datetime.fromisoformat(data['startDate']).date()
        
        if 'endDate' in data:
            event.end_date = datetime.fromisoformat(data['endDate']).date() if data['endDate'] else None
        
        event.start_time = data.get('startTime', event.start_time)
        event.end_time = data.get('endTime', event.end_time)
        
        # Recalculate status based on dates
        event.status = determine_event_status(
            data.get('startDate', event.start_date.isoformat()),
            data.get('endDate', event.end_date.isoformat() if event.end_date else None)
        )
        
        # Update ticket types if provided
        if 'tickets' in data:
            tickets = data['tickets']
            
            # Delete existing ticket types
            TicketType.query.filter_by(event_id=event.id).delete()
            
            # Early Bird tickets
            if 'earlyBird' in tickets and float(tickets['earlyBird']['price']) > 0:
                early_bird = TicketType(
                    event_id=event.id,
                    type_name='earlyBird',
                    price=float(tickets['earlyBird']['price']),
                    quantity=int(tickets['earlyBird']['quantity']),
                    sold=int(tickets['earlyBird'].get('sold', 0)),
                    start_date=datetime.fromisoformat(tickets['earlyBird']['startDate']).date() if tickets['earlyBird'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['earlyBird']['endDate']).date() if tickets['earlyBird'].get('endDate') else None
                )
                db.session.add(early_bird)
            
            # Regular tickets
            if 'regular' in tickets and float(tickets['regular']['price']) > 0:
                regular = TicketType(
                    event_id=event.id,
                    type_name='regular',
                    price=float(tickets['regular']['price']),
                    quantity=int(tickets['regular']['quantity']),
                    sold=int(tickets['regular'].get('sold', 0)),
                    start_date=datetime.fromisoformat(tickets['regular']['startDate']).date() if tickets['regular'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['regular']['endDate']).date() if tickets['regular'].get('endDate') else None
                )
                db.session.add(regular)
            
            # VIP tickets
            if 'vip' in tickets and float(tickets['vip']['price']) > 0:
                vip = TicketType(
                    event_id=event.id,
                    type_name='vip',
                    price=float(tickets['vip']['price']),
                    quantity=int(tickets['vip']['quantity']),
                    sold=int(tickets['vip'].get('sold', 0)),
                    start_date=datetime.fromisoformat(tickets['vip']['startDate']).date() if tickets['vip'].get('startDate') else None,
                    end_date=datetime.fromisoformat(tickets['vip']['endDate']).date() if tickets['vip'].get('endDate') else None
                )
                db.session.add(vip)
        
        db.session.commit()
        return jsonify({'message': 'Event updated successfully', 'event': event.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating event: {str(e)}'}), 400

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
@token_required
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    
    try:
        db.session.delete(event)
        db.session.commit()
        return jsonify({'message': 'Event deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting event: {str(e)}'}), 400

# Helper function to determine event status
def determine_event_status(start_date, end_date=None):
    try:
        today = datetime.now().date()
        start = datetime.fromisoformat(start_date).date() if isinstance(start_date, str) else start_date
        end = datetime.fromisoformat(end_date).date() if end_date and isinstance(end_date, str) else (end_date or start)
        
        if today < start:
            return "Upcoming"
        elif today > end:
            return "Completed"
        else:
            return "Active"
    except Exception:
        return "Upcoming"  # Default if dates are invalid
    



@app.route('/api/purchase-ticket', methods=['POST'])
def purchase_ticket():
    data = request.get_json()
    
    try:
        event_id = data.get('eventId')
        ticket_type_name = data.get('ticketType')
        customer_name = data.get('customerName')
        customer_email = data.get('customerEmail')
        
        # Validate input
        if not all([event_id, ticket_type_name, customer_name, customer_email]):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Get the event and ticket type
        event = Event.query.get_or_404(event_id)
        ticket_type = TicketType.query.filter_by(event_id=event_id, type_name=ticket_type_name).first()
        
        if not ticket_type:
            return jsonify({'message': 'Invalid ticket type'}), 400
            
        # Check if tickets are available
        if ticket_type.sold >= ticket_type.quantity:
            return jsonify({'message': 'Sold out'}), 400
            
        # Check if ticket sales are open
        today = datetime.now().date()
        if ticket_type.start_date and today < ticket_type.start_date:
            return jsonify({'message': 'Ticket sales not yet open'}), 400
            
        if ticket_type.end_date and today > ticket_type.end_date:
            return jsonify({'message': 'Ticket sales closed'}), 400
            
        # Generate a unique ticket number
        ticket_number = generate_ticket_number()
        
        # Create a new ticket
        new_ticket = Ticket(
            ticket_number=ticket_number,
            event_id=event_id,
            ticket_type_id=ticket_type.id,
            customer_name=customer_name,
            customer_email=customer_email
        )
        
        # Update the ticket type sold count
        ticket_type.sold += 1
        
        db.session.add(new_ticket)
        db.session.commit()
        
        # Generate and return PDF ticket
        pdf_buffer = generate_ticket_pdf(new_ticket)
        
        # Return the PDF
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"ticket_{ticket_number}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error purchasing ticket: {str(e)}'}), 400

# Add the route to download an existing ticket
@app.route('/api/tickets/<string:ticket_number>/download', methods=['GET'])
def download_ticket(ticket_number):
    ticket = Ticket.query.filter_by(ticket_number=ticket_number).first_or_404()
    
    # Generate PDF ticket
    pdf_buffer = generate_ticket_pdf(ticket)
    
    # Return the PDF
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"ticket_{ticket_number}.pdf",
        mimetype='application/pdf'
    )

# Helper function to generate the PDF ticket
def generate_ticket_pdf(ticket):
    # Create a buffer to receive PDF data
    buffer = io.BytesIO()
    
    # Create the PDF object
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Set up some constants
    margin = 0.5 * inch
    ticket_width = width - 2 * margin
    ticket_height = 4 * inch
    y_position = height - margin - ticket_height
    
    # Draw ticket border
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(2)
    pdf.roundRect(margin, y_position, ticket_width, ticket_height, 10, stroke=1, fill=0)
    
    # Event title
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width/2, y_position + ticket_height - 30, ticket.event.name)
    
    # Date and time
    pdf.setFont("Helvetica", 12)
    event_date_str = ticket.event.format_date_for_display()
    event_time_str = f"{ticket.event.start_time} - {ticket.event.end_time}" if ticket.event.end_time else ticket.event.start_time
    pdf.drawCentredString(width/2, y_position + ticket_height - 60, f"Date: {event_date_str}")
    pdf.drawCentredString(width/2, y_position + ticket_height - 80, f"Time: {event_time_str}")
    
    # Venue
    pdf.drawCentredString(width/2, y_position + ticket_height - 100, f"Venue: {ticket.event.venue}")
    
    # Ticket info
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(margin + 20, y_position + ticket_height - 140, f"Ticket: {ticket.ticket_type.type_name.upper()}")
    pdf.drawString(margin + 20, y_position + ticket_height - 160, f"Price: ${ticket.ticket_type.price:.2f}")
    
    # Customer info
    pdf.setFont("Helvetica", 12)
    pdf.drawString(margin + 20, y_position + ticket_height - 190, f"Name: {ticket.customer_name}")
    pdf.drawString(margin + 20, y_position + ticket_height - 210, f"Email: {ticket.customer_email}")
    
    # Ticket number
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin + 20, y_position + 30, f"Ticket #: {ticket.ticket_number}")
    
    # Generate QR code
    qr_data = f"EVENT:{ticket.event_id}|TICKET:{ticket.id}|NUMBER:{ticket.ticket_number}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to a temporary buffer
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer)
    qr_buffer.seek(0)
    
    # Add QR code to the PDF
    qr_size = 1.5 * inch
    pdf.drawImage(qr_buffer, width - margin - qr_size - 20, y_position + 30, width=qr_size, height=qr_size)
    
    # Add instructions for QR code
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(width - margin - qr_size/2 - 20, y_position + 20, "Scan for entry")
    
    # Add a note at the bottom
    pdf.setFont("Helvetica-Italic", 8)
    pdf.drawCentredString(width/2, margin/2, "This ticket is valid for one-time entry only.")
    
    # Save the PDF
    pdf.showPage()
    pdf.save()
    
    # Return the buffer to the beginning
    buffer.seek(0)
    return buffer

# Add a route to verify tickets at event entry
@app.route('/api/verify-ticket/<string:ticket_number>', methods=['POST'])
@token_required
def verify_ticket(ticket_number):
    ticket = Ticket.query.filter_by(ticket_number=ticket_number).first()
    
    if not ticket:
        return jsonify({'valid': False, 'message': 'Invalid ticket number'}), 404
        
    # Check if the ticket has already been used
    if ticket.is_used:
        return jsonify({'valid': False, 'message': 'Ticket already used', 'ticket': ticket.to_dict()}), 400
        
    # Check if the event is active
    event = ticket.event
    if event.status != "Active":
        return jsonify({'valid': False, 'message': f'Event is {event.status}', 'ticket': ticket.to_dict()}), 400
        
    # Mark the ticket as used
    ticket.is_used = True
    db.session.commit()
    
    return jsonify({
        'valid': True, 
        'message': 'Ticket verified successfully', 
        'ticket': ticket.to_dict()
    })

# Dashboard API Routes
@app.route('/api/dashboard', methods=['GET'])
@token_required
def get_dashboard_data():
    try:
        # Get summary statistics
        total_events = Event.query.count()
        active_events = Event.query.filter_by(status='Active').count()
        upcoming_events = Event.query.filter_by(status='Upcoming').count()
        completed_events = Event.query.filter_by(status='Completed').count()
        
        # Calculate total tickets and revenue
        total_tickets_sold = db.session.query(db.func.sum(TicketType.sold)).scalar() or 0
        total_revenue = db.session.query(
            db.func.sum(TicketType.price * TicketType.sold)
        ).scalar() or 0
        
        # Get upcoming events (limit to 5)
        upcoming = Event.query.filter_by(status='Upcoming').order_by(Event.start_date).limit(5).all()
        
        # Get recent ticket sales (limit to 10)
        recent_tickets = Ticket.query.order_by(Ticket.purchase_date.desc()).limit(10).all()
        
        return jsonify({
            'summary': {
                'totalEvents': total_events,
                'activeEvents': active_events,
                'upcomingEvents': upcoming_events,
                'completedEvents': completed_events,
                'totalTicketsSold': total_tickets_sold,
                'totalRevenue': round(total_revenue, 2)
            },
            'upcomingEvents': [event.to_dict() for event in upcoming],
            'recentTickets': [ticket.to_dict() for ticket in recent_tickets]
        })
    except Exception as e:
        return jsonify({'message': f'Error fetching dashboard data: {str(e)}'}), 500

@app.route('/api/dashboard/revenue', methods=['GET'])
@token_required
def get_revenue_stats():
    period = request.args.get('period', 'weekly')
    
    try:
        today = datetime.now().date()
        
        if period == 'weekly':
            # Get data for the last 7 days
            data = get_revenue_by_days(7)
            label_format = '%a'  # Abbreviated weekday name
        elif period == 'monthly':
            # Get data for the last 30 days
            data = get_revenue_by_days(30)
            label_format = '%d %b'  # Day and abbreviated month
        elif period == 'yearly':
            # Get data by month for the current year
            data = get_revenue_by_months()
            label_format = '%b'  # Abbreviated month name
        else:
            return jsonify({'message': 'Invalid period parameter'}), 400
        
        return jsonify({
            'period': period,
            'data': data
        })
    except Exception as e:
        return jsonify({'message': f'Error fetching revenue stats: {str(e)}'}), 500

def get_revenue_by_days(days):
    result = []
    today = datetime.now().date()
    
    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        
        # Query tickets purchased on this date
        tickets = Ticket.query.filter(
            db.func.date(Ticket.purchase_date) == date
        ).all()
        
        # Calculate revenue
        daily_revenue = sum(ticket.ticket_type.price for ticket in tickets)
        tickets_count = len(tickets)
        
        result.append({
            'date': date.strftime('%Y-%m-%d'),
            'label': date.strftime('%a' if days <= 7 else '%d %b'),
            'revenue': round(daily_revenue, 2),
            'tickets': tickets_count
        })
    
    return result

def get_revenue_by_months():
    result = []
    today = datetime.now().date()
    current_year = today.year
    
    for month in range(1, 13):
        # Query tickets purchased in this month of the current year
        tickets = Ticket.query.filter(
            db.extract('year', Ticket.purchase_date) == current_year,
            db.extract('month', Ticket.purchase_date) == month
        ).all()
        
        # Calculate revenue
        monthly_revenue = sum(ticket.ticket_type.price for ticket in tickets)
        tickets_count = len(tickets)
        
        # Create a date object for the first day of the month
        month_date = datetime(current_year, month, 1).date()
        
        result.append({
            'date': month_date.strftime('%Y-%m-%d'),
            'label': month_date.strftime('%b'),
            'revenue': round(monthly_revenue, 2),
            'tickets': tickets_count
        })
    
    return result
if __name__ == '__main__':
    with app.app_context():
        create_admin()
    app.run(debug=True)