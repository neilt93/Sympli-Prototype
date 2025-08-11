from datetime import datetime
from typing import Optional, List
from pymongo import MongoClient
from bson import ObjectId

class SymptomLog:
    def __init__(self, 
                 userId: str,
                 symptom: str,
                 severity: str,
                 tags: List[str],
                 occurredAt: datetime,
                 context: str,
                 flareId: Optional[str] = None,
                 _id: Optional[str] = None,
                 createdAt: Optional[datetime] = None,
                 updatedAt: Optional[datetime] = None):
        self._id = _id or str(ObjectId())
        self.userId = userId
        self.symptom = symptom
        self.severity = severity
        self.tags = tags
        self.occurredAt = occurredAt
        self.context = context
        self.flareId = flareId
        self.createdAt = createdAt or datetime.utcnow()
        self.updatedAt = updatedAt or datetime.utcnow()

    def to_dict(self):
        return {
            '_id': ObjectId(self._id) if self._id else ObjectId(),
            'userId': self.userId,
            'symptom': self.symptom,
            'severity': self.severity,
            'tags': self.tags,
            'occurredAt': self.occurredAt,
            'context': self.context,
            'flareId': self.flareId,
            'createdAt': self.createdAt,
            'updatedAt': self.updatedAt
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            _id=str(data['_id']),
            userId=data['userId'],
            symptom=data['symptom'],
            severity=data['severity'],
            tags=data['tags'],
            occurredAt=data['occurredAt'],
            context=data['context'],
            flareId=data.get('flareId'),
            createdAt=data['createdAt'],
            updatedAt=data['updatedAt']
        )

class SymptomLogManager:
    def __init__(self, db):
        self.db = db
        self.collection = db.symptom_logs

    def create_indexes(self):
        """Create necessary indexes for efficient querying"""
        self.collection.create_index([("userId", 1)])
        self.collection.create_index([("symptom", 1)])
        self.collection.create_index([("occurredAt", -1)])
        self.collection.create_index([("userId", 1), ("symptom", 1)])

    def create_symptom_log(self, symptom_log: SymptomLog):
        """Create a new symptom log entry"""
        result = self.collection.insert_one(symptom_log.to_dict())
        return str(result.inserted_id)

    def get_symptom_logs_by_user(self, userId: str, limit: int = 100):
        """Get all symptom logs for a specific user"""
        cursor = self.collection.find({"userId": userId}).sort("occurredAt", -1).limit(limit)
        return [SymptomLog.from_dict(doc) for doc in cursor]

    def get_symptom_logs_by_symptom(self, userId: str, symptom: str):
        """Get all logs for a specific symptom and user"""
        cursor = self.collection.find({
            "userId": userId,
            "symptom": symptom
        }).sort("occurredAt", -1)
        return [SymptomLog.from_dict(doc) for doc in cursor]

    def get_symptom_overview(self, userId: str):
        """Get symptom overview data for a user"""
        pipeline = [
            {"$match": {"userId": userId}},
            {"$group": {
                "_id": "$symptom",
                "firstLogged": {"$min": "$occurredAt"},
                "mostRecent": {"$max": "$occurredAt"},
                "count": {"$sum": 1},
                "logs": {"$push": {
                    "severity": "$severity",
                    "occurredAt": "$occurredAt"
                }}
            }},
            {"$sort": {"mostRecent": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        overview_rows = []
        
        for result in results:
            symptom = result['_id']
            first_logged = result['firstLogged']
            most_recent = result['mostRecent']
            count = result['count']
            logs = result['logs']
            
            # Calculate trend
            trend, trend_emoji, trend_text = self._calculate_trend(logs)
            
            overview_rows.append({
                'symptom': symptom,
                'firstLogged': first_logged,
                'mostRecent': most_recent,
                'count': count,
                'trend': trend,
                'trendEmoji': trend_emoji,
                'trendText': trend_text
            })
        
        return overview_rows

    def get_symptom_logs_by_severity(self, userId: str, severity: str):
        """Get all logs for a specific severity and user"""
        cursor = self.collection.find({
            "userId": userId,
            "severity": severity
        }).sort("occurredAt", -1)
        return [SymptomLog.from_dict(doc) for doc in cursor]

    def get_symptom_logs_by_symptom_and_severity(self, userId: str, symptom: str, severity: str):
        """Get all logs for a specific symptom, severity and user"""
        cursor = self.collection.find({
            "userId": userId,
            "symptom": symptom,
            "severity": severity
        }).sort("occurredAt", -1)
        return [SymptomLog.from_dict(doc) for doc in cursor]

    def _calculate_trend(self, logs):
        """Calculate trend based on severity changes over time"""
        if len(logs) < 2:
            return 'insufficient-data', '❓', 'Insufficient data for trend analysis'
        
        # Sort logs by time
        sorted_logs = sorted(logs, key=lambda x: x['occurredAt'])
        
        # Map severity to numeric values
        severity_map = {
            'none': 0,
            'mild': 1,
            'moderate': 2,
            'severe': 3
        }
        
        # Get start and end severities
        start_severity = severity_map.get(sorted_logs[0]['severity'], 0)
        end_severity = severity_map.get(sorted_logs[-1]['severity'], 0)
        
        # Calculate delta
        delta = end_severity - start_severity
        
        if delta > 0:
            return 'escalating', '📈', 'Symptoms appear to be escalating'
        elif delta < 0:
            return 'improving', '📉', 'Symptoms appear to be improving'
        else:
            return 'stable', '➡️', 'Symptoms appear to be stable'
