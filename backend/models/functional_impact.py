from datetime import datetime
from typing import Optional
from pymongo import MongoClient
from bson import ObjectId

class FunctionalImpactSummary:
    def __init__(self, 
                 userId: str,
                 text: str,
                 isUserEdited: bool = False,
                 _id: Optional[str] = None,
                 lastUpdatedAt: Optional[datetime] = None,
                 createdAt: Optional[datetime] = None):
        self._id = _id or str(ObjectId())
        self.userId = userId
        self.text = text
        self.isUserEdited = isUserEdited
        self.lastUpdatedAt = lastUpdatedAt or datetime.utcnow()
        self.createdAt = createdAt or datetime.utcnow()

    def to_dict(self):
        return {
            '_id': ObjectId(self._id) if self._id else ObjectId(),
            'userId': self.userId,
            'text': self.text,
            'isUserEdited': self.isUserEdited,
            'lastUpdatedAt': self.lastUpdatedAt,
            'createdAt': self.createdAt
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            _id=str(data['_id']),
            userId=data['userId'],
            text=data['text'],
            isUserEdited=data['isUserEdited'],
            lastUpdatedAt=data['lastUpdatedAt'],
            createdAt=data['createdAt']
        )

class FunctionalImpactManager:
    def __init__(self, db):
        self.db = db
        self.collection = db.functional_impact_summaries

    def create_indexes(self):
        """Create necessary indexes for efficient querying"""
        self.collection.create_index([("userId", 1)], unique=True)

    def get_or_create_summary(self, userId: str, default_text: str = ""):
        """Get existing summary or create a new one with default text"""
        existing = self.collection.find_one({"userId": userId})
        if existing:
            return FunctionalImpactSummary.from_dict(existing)
        else:
            # Create new summary
            new_summary = FunctionalImpactSummary(
                userId=userId,
                text=default_text,
                isUserEdited=False
            )
            self.create_summary(new_summary)
            return new_summary

    def create_summary(self, summary: FunctionalImpactSummary):
        """Create a new functional impact summary"""
        result = self.collection.insert_one(summary.to_dict())
        return str(result.inserted_id)

    def update_summary(self, userId: str, text: str, isUserEdited: bool = True):
        """Update an existing functional impact summary"""
        result = self.collection.update_one(
            {"userId": userId},
            {
                "$set": {
                    "text": text,
                    "isUserEdited": isUserEdited,
                    "lastUpdatedAt": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def get_summary_by_user(self, userId: str):
        """Get functional impact summary for a specific user"""
        doc = self.collection.find_one({"userId": userId})
        if doc:
            return FunctionalImpactSummary.from_dict(doc)
        return None

    def delete_summary(self, userId: str):
        """Delete functional impact summary for a user"""
        result = self.collection.delete_one({"userId": userId})
        return result.deleted_count > 0
