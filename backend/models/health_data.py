from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class SymptomSeverity(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"

class SymptomDuration(str, Enum):
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"
    YEARS = "years"

class VitalType(str, Enum):
    BLOOD_PRESSURE = "blood_pressure"
    HEART_RATE = "heart_rate"
    TEMPERATURE = "temperature"
    OXYGEN_SATURATION = "oxygen_saturation"
    WEIGHT = "weight"
    HEIGHT = "height"
    BMI = "bmi"
    BLOOD_SUGAR = "blood_sugar"
    RESPIRATORY_RATE = "respiratory_rate"

class MedicationFrequency(str, Enum):
    DAILY = "daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    AS_NEEDED = "as_needed"
    CUSTOM = "custom"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class ReportType(str, Enum):
    SYMPTOM_SUMMARY = "symptom_summary"
    VITAL_TRENDS = "vital_trends"
    MEDICATION_REVIEW = "medication_review"
    HEALTH_OVERVIEW = "health_overview"
    GP_REPORT = "gp_report"
    SPECIALIST_REPORT = "specialist_report"

# Symptom Models
class Symptom(BaseModel):
    id: str = Field(alias="_id", description="Symptom unique identifier")
    user_id: str = Field(..., description="User ID")
    name: str = Field(..., description="Symptom name")
    description: Optional[str] = Field(None, description="Detailed description")
    severity: SymptomSeverity = Field(..., description="Symptom severity level")
    duration: SymptomDuration = Field(..., description="How long the symptom has been present")
    duration_value: int = Field(..., description="Numeric value for duration")
    body_location: Optional[str] = Field(None, description="Body location of symptom")
    triggers: List[str] = Field(default=[], description="What triggers the symptom")
    alleviating_factors: List[str] = Field(default=[], description="What makes it better")
    associated_symptoms: List[str] = Field(default=[], description="Other symptoms that occur with this")
    impact_on_daily_life: str = Field(..., description="How it affects daily activities")
    recorded_at: datetime = Field(default_factory=datetime.utcnow, description="When symptom was recorded")
    voice_note_url: Optional[str] = Field(None, description="URL to voice recording")
    ai_analysis: Optional[dict] = Field(None, description="AI analysis of the symptom")
    tags: List[str] = Field(default=[], description="Tags for categorization")
    is_resolved: bool = Field(default=False, description="Whether symptom is resolved")
    resolved_at: Optional[datetime] = Field(None, description="When symptom was resolved")
    notes: Optional[str] = Field(None, description="Additional notes")

class SymptomCreate(BaseModel):
    name: str = Field(..., description="Symptom name")
    description: Optional[str] = Field(None, description="Detailed description")
    severity: SymptomSeverity = Field(..., description="Symptom severity level")
    duration: SymptomDuration = Field(..., description="How long the symptom has been present")
    duration_value: int = Field(..., description="Numeric value for duration")
    body_location: Optional[str] = Field(None, description="Body location of symptom")
    triggers: List[str] = Field(default=[], description="What triggers the symptom")
    alleviating_factors: List[str] = Field(default=[], description="What makes it better")
    associated_symptoms: List[str] = Field(default=[], description="Other symptoms that occur with this")
    impact_on_daily_life: str = Field(..., description="How it affects daily activities")
    voice_note_url: Optional[str] = Field(None, description="URL to voice recording")
    tags: List[str] = Field(default=[], description="Tags for categorization")
    notes: Optional[str] = Field(None, description="Additional notes")

class SymptomUpdate(BaseModel):
    description: Optional[str] = None
    severity: Optional[SymptomSeverity] = None
    duration: Optional[SymptomDuration] = None
    duration_value: Optional[int] = None
    body_location: Optional[str] = None
    triggers: Optional[List[str]] = None
    alleviating_factors: Optional[List[str]] = None
    associated_symptoms: Optional[List[str]] = None
    impact_on_daily_life: Optional[str] = None
    voice_note_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_resolved: Optional[bool] = None
    notes: Optional[str] = None

# Vital Signs Models
class VitalSign(BaseModel):
    id: str = Field(alias="_id", description="Vital sign unique identifier")
    user_id: str = Field(..., description="User ID")
    type: VitalType = Field(..., description="Type of vital sign")
    value: float = Field(..., description="Numeric value of the vital sign")
    unit: str = Field(..., description="Unit of measurement")
    systolic: Optional[float] = Field(None, description="Systolic blood pressure")
    diastolic: Optional[float] = Field(None, description="Diastolic blood pressure")
    recorded_at: datetime = Field(default_factory=datetime.utcnow, description="When vital was recorded")
    notes: Optional[str] = Field(None, description="Additional notes")
    source: str = Field(default="manual", description="Source of measurement (manual, device, ai)")
    device_id: Optional[str] = Field(None, description="Device identifier if applicable")
    is_abnormal: bool = Field(default=False, description="Whether the value is outside normal range")
    normal_range_min: Optional[float] = Field(None, description="Minimum normal value")
    normal_range_max: Optional[float] = Field(None, description="Maximum normal value")

class VitalSignCreate(BaseModel):
    type: VitalType = Field(..., description="Type of vital sign")
    value: float = Field(..., description="Numeric value of the vital sign")
    unit: str = Field(..., description="Unit of measurement")
    systolic: Optional[float] = Field(None, description="Systolic blood pressure")
    diastolic: Optional[float] = Field(None, description="Diastolic blood pressure")
    notes: Optional[str] = Field(None, description="Additional notes")
    source: str = Field(default="manual", description="Source of measurement")
    device_id: Optional[str] = Field(None, description="Device identifier if applicable")

class VitalSignUpdate(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    notes: Optional[str] = None
    is_abnormal: Optional[bool] = None

# Medication Models
class Medication(BaseModel):
    id: str = Field(alias="_id", description="Medication unique identifier")
    user_id: str = Field(..., description="User ID")
    name: str = Field(..., description="Medication name")
    generic_name: Optional[str] = Field(None, description="Generic name of the medication")
    dosage: str = Field(..., description="Dosage information")
    frequency: MedicationFrequency = Field(..., description="How often to take")
    custom_frequency: Optional[str] = Field(None, description="Custom frequency if not standard")
    start_date: datetime = Field(..., description="When medication was started")
    end_date: Optional[datetime] = Field(None, description="When medication should end")
    prescribed_by: Optional[str] = Field(None, description="Who prescribed the medication")
    pharmacy: Optional[str] = Field(None, description="Pharmacy information")
    refill_reminder: bool = Field(default=False, description="Whether to remind for refills")
    refill_date: Optional[datetime] = Field(None, description="When refill is needed")
    side_effects: List[str] = Field(default=[], description="Known side effects")
    interactions: List[str] = Field(default=[], description="Drug interactions")
    instructions: Optional[str] = Field(None, description="Special instructions")
    is_active: bool = Field(default=True, description="Whether medication is currently active")
    notes: Optional[str] = Field(None, description="Additional notes")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When record was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class MedicationCreate(BaseModel):
    name: str = Field(..., description="Medication name")
    generic_name: Optional[str] = Field(None, description="Generic name of the medication")
    dosage: str = Field(..., description="Dosage information")
    frequency: MedicationFrequency = Field(..., description="How often to take")
    custom_frequency: Optional[str] = Field(None, description="Custom frequency if not standard")
    start_date: datetime = Field(..., description="When medication was started")
    end_date: Optional[datetime] = Field(None, description="When medication should end")
    prescribed_by: Optional[str] = Field(None, description="Who prescribed the medication")
    pharmacy: Optional[str] = Field(None, description="Pharmacy information")
    refill_reminder: bool = Field(default=False, description="Whether to remind for refills")
    refill_date: Optional[datetime] = Field(None, description="When refill is needed")
    side_effects: List[str] = Field(default=[], description="Known side effects")
    interactions: List[str] = Field(default=[], description="Drug interactions")
    instructions: Optional[str] = Field(None, description="Special instructions")
    notes: Optional[str] = Field(None, description="Additional notes")

class MedicationUpdate(BaseModel):
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[MedicationFrequency] = None
    custom_frequency: Optional[str] = None
    end_date: Optional[datetime] = None
    prescribed_by: Optional[str] = None
    pharmacy: Optional[str] = None
    refill_reminder: Optional[bool] = None
    refill_date: Optional[datetime] = None
    side_effects: Optional[List[str]] = None
    interactions: Optional[List[str]] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

# Appointment Models
class Appointment(BaseModel):
    id: str = Field(alias="_id", description="Appointment unique identifier")
    user_id: str = Field(..., description="User ID")
    title: str = Field(..., description="Appointment title")
    description: Optional[str] = Field(None, description="Appointment description")
    doctor_name: str = Field(..., description="Doctor or healthcare provider name")
    specialty: Optional[str] = Field(None, description="Medical specialty")
    location: str = Field(..., description="Appointment location")
    scheduled_at: datetime = Field(..., description="Scheduled date and time")
    duration_minutes: int = Field(default=30, description="Appointment duration in minutes")
    status: AppointmentStatus = Field(default=AppointmentStatus.SCHEDULED, description="Appointment status")
    notes: Optional[str] = Field(None, description="Additional notes")
    symptoms_to_discuss: List[str] = Field(default=[], description="Symptoms to discuss")
    questions_to_ask: List[str] = Field(default=[], description="Questions to ask")
    reminders: List[datetime] = Field(default=[], description="Reminder times")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When appointment was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class AppointmentCreate(BaseModel):
    title: str = Field(..., description="Appointment title")
    description: Optional[str] = Field(None, description="Appointment description")
    doctor_name: str = Field(..., description="Doctor or healthcare provider name")
    specialty: Optional[str] = Field(None, description="Medical specialty")
    location: str = Field(..., description="Appointment location")
    scheduled_at: datetime = Field(..., description="Scheduled date and time")
    duration_minutes: int = Field(default=30, description="Appointment duration in minutes")
    notes: Optional[str] = Field(None, description="Additional notes")
    symptoms_to_discuss: List[str] = Field(default=[], description="Symptoms to discuss")
    questions_to_ask: List[str] = Field(default=[], description="Questions to ask")
    reminders: List[datetime] = Field(default=[], description="Reminder times")

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    location: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    symptoms_to_discuss: Optional[List[str]] = None
    questions_to_ask: Optional[List[str]] = None
    reminders: Optional[List[datetime]] = None

# Health Report Models
class HealthReport(BaseModel):
    id: str = Field(alias="_id", description="Report unique identifier")
    user_id: str = Field(..., description="User ID")
    title: str = Field(..., description="Report title")
    type: ReportType = Field(..., description="Type of health report")
    content: str = Field(..., description="Report content in markdown format")
    summary: str = Field(..., description="Brief summary of the report")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="When report was generated")
    date_range_start: Optional[datetime] = Field(None, description="Start date for report data")
    date_range_end: Optional[datetime] = Field(None, description="End date for report data")
    symptoms_included: List[str] = Field(default=[], description="Symptoms included in report")
    vitals_included: List[str] = Field(default=[], description="Vitals included in report")
    medications_included: List[str] = Field(default=[], description="Medications included in report")
    appointments_included: List[str] = Field(default=[], description="Appointments included in report")
    ai_generated: bool = Field(default=True, description="Whether report was AI generated")
    reviewed_by_user: bool = Field(default=False, description="Whether user has reviewed the report")
    shared_with: List[str] = Field(default=[], description="Who the report has been shared with")
    export_formats: List[str] = Field(default=["pdf"], description="Available export formats")
    is_archived: bool = Field(default=False, description="Whether report is archived")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When record was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class HealthReportCreate(BaseModel):
    title: str = Field(..., description="Report title")
    type: ReportType = Field(..., description="Type of health report")
    content: str = Field(..., description="Report content in markdown format")
    summary: str = Field(..., description="Brief summary of the report")
    date_range_start: Optional[datetime] = Field(None, description="Start date for report data")
    date_range_end: Optional[datetime] = Field(None, description="End date for report data")
    symptoms_included: List[str] = Field(default=[], description="Symptoms included in report")
    vitals_included: List[str] = Field(default=[], description="Vitals included in report")
    medications_included: List[str] = Field(default=[], description="Medications included in report")
    appointments_included: List[str] = Field(default=[], description="Appointments included in report")
    ai_generated: bool = Field(default=True, description="Whether report was AI generated")
    export_formats: List[str] = Field(default=["pdf"], description="Available export formats")

class HealthReportUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    reviewed_by_user: Optional[bool] = None
    shared_with: Optional[List[str]] = None
    is_archived: Optional[bool] = None

# Voice Recording Models
class VoiceRecording(BaseModel):
    id: str = Field(alias="_id", description="Recording unique identifier")
    user_id: str = Field(..., description="User ID")
    filename: str = Field(..., description="Audio file filename")
    file_url: str = Field(..., description="URL to the audio file")
    duration_seconds: float = Field(..., description="Recording duration in seconds")
    file_size_bytes: int = Field(..., description="File size in bytes")
    recording_type: str = Field(..., description="Type of recording (symptom, note, etc.)")
    transcription: Optional[str] = Field(None, description="AI transcription of the audio")
    ai_analysis: Optional[dict] = Field(None, description="AI analysis results")
    associated_record_id: Optional[str] = Field(None, description="ID of associated health record")
    recorded_at: datetime = Field(default_factory=datetime.utcnow, description="When recording was made")
    is_processed: bool = Field(default=False, description="Whether AI processing is complete")
    processing_status: str = Field(default="pending", description="Processing status")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When record was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class VoiceRecordingCreate(BaseModel):
    filename: str = Field(..., description="Audio file filename")
    file_url: str = Field(..., description="URL to the audio file")
    duration_seconds: float = Field(..., description="Recording duration in seconds")
    file_size_bytes: int = Field(..., description="File size in bytes")
    recording_type: str = Field(..., description="Type of recording")
    associated_record_id: Optional[str] = Field(None, description="ID of associated health record")

# Health Goal Models
class HealthGoal(BaseModel):
    id: str = Field(alias="_id", description="Goal unique identifier")
    user_id: str = Field(..., description="User ID")
    title: str = Field(..., description="Goal title")
    description: str = Field(..., description="Goal description")
    category: str = Field(..., description="Goal category (fitness, nutrition, mental health, etc.)")
    target_value: Optional[float] = Field(None, description="Target numeric value")
    current_value: Optional[float] = Field(None, description="Current progress value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    start_date: datetime = Field(..., description="When goal was started")
    target_date: Optional[datetime] = Field(None, description="Target completion date")
    is_completed: bool = Field(default=False, description="Whether goal is completed")
    completed_at: Optional[datetime] = Field(None, description="When goal was completed")
    progress_percentage: float = Field(default=0.0, description="Progress percentage (0-100)")
    milestones: List[dict] = Field(default=[], description="Goal milestones")
    notes: Optional[str] = Field(None, description="Additional notes")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When goal was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class HealthGoalCreate(BaseModel):
    title: str = Field(..., description="Goal title")
    description: str = Field(..., description="Goal description")
    category: str = Field(..., description="Goal category")
    target_value: Optional[float] = Field(None, description="Target numeric value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    start_date: datetime = Field(..., description="When goal was started")
    target_date: Optional[datetime] = Field(None, description="Target completion date")
    milestones: List[dict] = Field(default=[], description="Goal milestones")
    notes: Optional[str] = Field(None, description="Additional notes")

class HealthGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    target_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    progress_percentage: Optional[float] = None
    milestones: Optional[List[dict]] = None
    notes: Optional[str] = None
