from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
import jwt
from dotenv import load_dotenv
from models.symptom_log import SymptomLogManager, SymptomLog
from models.functional_impact import FunctionalImpactManager, FunctionalImpactSummary
from database.connection import get_database

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize managers
db = get_database()
symptom_log_manager = SymptomLogManager(db)
functional_impact_manager = FunctionalImpactManager(db)

# Create indexes
symptom_log_manager.create_indexes()
functional_impact_manager.create_indexes()

def verify_token(token):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY'), algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route('/api/symptoms/overview', methods=['GET'])
def get_symptom_overview():
    """Get symptom overview for authenticated user"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required'}), 401
    
    token = auth_header.split(' ')[1]
    user_data = verify_token(token)
    if not user_data:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    userId = user_data.get('user_id')
    if not userId:
        return jsonify({'error': 'User ID not found in token'}), 400
    
    try:
        # Get symptom overview
        symptoms = symptom_log_manager.get_symptom_overview(userId)
        
        # Get functional impact summary
        functional_impact = functional_impact_manager.get_summary_by_user(userId)
        
        # Convert dates to ISO format for JSON serialization
        for symptom in symptoms:
            symptom['firstLogged'] = symptom['firstLogged'].isoformat()
            symptom['mostRecent'] = symptom['mostRecent'].isoformat()
        
        response_data = {
            'symptoms': symptoms,
            'functionalImpact': {
                '_id': str(functional_impact._id),
                'userId': functional_impact.userId,
                'text': functional_impact.text,
                'isUserEdited': functional_impact.isUserEdited,
                'lastUpdatedAt': functional_impact.lastUpdatedAt.isoformat(),
                'createdAt': functional_impact.createdAt.isoformat()
            } if functional_impact else None
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get symptom overview: {str(e)}'}), 500

@app.route('/api/symptoms/summary/generate', methods=['POST'])
def generate_summary():
    """Generate AI summary for functional impact"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required'}), 401
    
    token = auth_header.split(' ')[1]
    user_data = verify_token(token)
    if not user_data:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    userId = user_data.get('user_id')
    if not userId:
        return jsonify({'error': 'User ID not found in token'}), 400
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        # For now, we'll create a simple summary based on the data
        # In a real implementation, this would call an LLM service
        symptoms = data.get('symptomData', [])
        
        if not symptoms:
            summary_text = "No symptom data available to generate summary."
        else:
            # Simple summary generation logic
            total_symptoms = len(symptoms)
            total_logs = sum(s['count'] for s in symptoms)
            
            # Find most frequent symptom
            most_frequent = max(symptoms, key=lambda x: x['count']) if symptoms else None
            
            # Find symptoms with concerning trends
            concerning_trends = [s for s in symptoms if s['trend'] == 'escalating']
            
            summary_parts = [
                f"Based on your symptom tracking data, you have logged {total_logs} symptom occurrences across {total_symptoms} different symptoms."
            ]
            
            if most_frequent:
                summary_parts.append(f"Your most frequently logged symptom is '{most_frequent['symptom']}' with {most_frequent['count']} occurrences.")
            
            if concerning_trends:
                summary_parts.append(f"⚠️ {len(concerning_trends)} symptoms show escalating trends and may require attention.")
            
            summary_parts.append("Consider discussing these patterns with your healthcare provider for personalized insights.")
            
            summary_text = " ".join(summary_parts)
        
        # Create or update the functional impact summary
        functional_impact_manager.update_summary(
            userId=userId,
            text=summary_text,
            isUserEdited=False
        )
        
        return jsonify({
            'message': 'Summary generated successfully',
            'summary': summary_text
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500

@app.route('/api/symptoms/summary', methods=['PATCH'])
def update_summary():
    """Update functional impact summary (user-edited)"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required'}), 401
    
    token = auth_header.split(' ')[1]
    user_data = verify_token(token)
    if not user_data:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    userId = user_data.get('user_id')
    if not userId:
        return jsonify({'error': 'User ID not found in token'}), 400
    
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text field required'}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        # Update the summary
        success = functional_impact_manager.update_summary(
            userId=userId,
            text=text,
            isUserEdited=True
        )
        
        if success:
            return jsonify({
                'message': 'Summary updated successfully',
                'summary': text
            }), 200
        else:
            return jsonify({'error': 'Failed to update summary'}), 500
        
    except Exception as e:
        return jsonify({'error': f'Failed to update summary: {str(e)}'}), 500

@app.route('/api/symptoms/log', methods=['POST'])
def create_symptom_log():
    """Create a new symptom log entry"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required'}), 401
    
    token = auth_header.split(' ')[1]
    user_data = verify_token(token)
    if not user_data:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    userId = user_data.get('user_id')
    if not userId:
        return jsonify({'error': 'User ID not found in token'}), 400
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        # Validate required fields
        required_fields = ['symptom', 'severity', 'context']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create symptom log
        symptom_log = SymptomLog(
            userId=userId,
            symptom=data['symptom'],
            severity=data['severity'],
            tags=data.get('tags', []),
            occurredAt=datetime.fromisoformat(data.get('occurredAt', datetime.utcnow().isoformat())),
            context=data['context'],
            flareId=data.get('flareId')
        )
        
        log_id = symptom_log_manager.create_symptom_log(symptom_log)
        
        return jsonify({
            'message': 'Symptom log created successfully',
            'logId': log_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create symptom log: {str(e)}'}), 500

@app.route('/api/symptoms/logs', methods=['GET'])
def get_symptom_logs():
    """Get symptom logs for authenticated user with optional filtering"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header required'}), 401
    
    token = auth_header.split(' ')[1]
    user_data = verify_token(token)
    if not user_data:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    userId = user_data.get('user_id')
    if not userId:
        return jsonify({'error': 'User ID not found in token'}), 400
    
    try:
        # Get query parameters
        symptom = request.args.get('symptom')
        severity = request.args.get('severity')
        
        # Get logs based on filters
        if symptom and severity:
            logs = symptom_log_manager.get_symptom_logs_by_symptom_and_severity(userId, symptom, severity)
        elif symptom:
            logs = symptom_log_manager.get_symptom_logs_by_symptom(userId, symptom)
        elif severity:
            logs = symptom_log_manager.get_symptom_logs_by_severity(userId, severity)
        else:
            logs = symptom_log_manager.get_symptom_logs_by_user(userId)
        
        # Convert to JSON-serializable format
        logs_data = []
        for log in logs:
            logs_data.append({
                '_id': str(log._id),
                'symptom': log.symptom,
                'severity': log.severity,
                'tags': log.tags,
                'occurredAt': log.occurredAt.isoformat(),
                'context': log.context,
                'flareId': log.flareId,
                'createdAt': log.createdAt.isoformat(),
                'updatedAt': log.updatedAt.isoformat()
            })
        
        return jsonify({
            'logs': logs_data,
            'count': len(logs_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get symptom logs: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
