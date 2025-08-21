# SymptomChat Implementation

## Overview

The SymptomChat component is a comprehensive healthcare roleplay agent that guides users through symptom logging with adaptive questions. It implements a conversational interface that collects detailed symptom information using the Socrates method and provides personalized follow-up questions based on symptom type and user history.

## Features

### 1. Initial Symptom Type Selection
- **First Question**: "What are you tracking today?"
- **Options**: Headache, Fatigue, Side Effect, Pregnancy, Other
- **Purpose**: Categorizes the symptom for targeted follow-up questions

### 2. New vs Ongoing Assessment
- **Second Question**: "Is this a new symptom or something ongoing?"
- **Options**: New, Ongoing
- **Context**: For ongoing symptoms, the system checks previous similar symptoms in the database

### 3. Socrates Method Implementation
The system uses the SOCRATES framework for comprehensive symptom assessment:
- **S**ite: Where exactly is the problem located?
- **O**nset: When did this start?
- **C**haracter: How would you describe the sensation?
- **R**adiation: Does it spread or move to other areas?
- **A**ssociations: What other symptoms occur with this?
- **T**ime course: How has it changed over time?
- **E**xacerbating factors: What makes it better or worse?
- **S**everity: On a scale of 1-10, how severe is it?

### 4. Adaptive Follow-up Questions
Based on symptom type and context, the system asks additional questions:

#### Headache-specific:
- One side vs both sides
- Sensitivity to light or sound

#### Fatigue-specific:
- Physical vs mental vs both
- Whether rest helps

#### Side Effect-specific:
- Medication/treatment causing it
- When treatment started

#### Pregnancy-specific:
- How far along in pregnancy
- First pregnancy or not

### 5. Impact Assessment
- **Functional Impact**: How it affects daily activities
- **Emotional Impact**: How it affects emotions
- **Patterns and Triggers**: What triggers the symptom
- **Treatment Response**: For ongoing symptoms
- **Progress Tracking**: How the symptom has changed

## Database Schema

### Enhanced Symptom Logs Table
The database schema has been updated to support structured data storage:

```sql
CREATE TABLE symptom_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  -- Structured fields for easy querying
  symptom_type varchar(50),           -- 'headache', 'fatigue', etc.
  symptom_name varchar(255),          -- Human-readable name
  is_new boolean,                     -- New vs ongoing
  severity_scale integer,             -- 1-10 scale
  -- Detailed symptom information
  description text,
  location text,
  onset_time text,
  character_description text,
  radiation text,
  associated_symptoms text,
  time_course text,
  exacerbating_factors text,
  -- Impact assessment
  functional_impact text,
  emotional_impact text,
  -- Patterns and triggers
  triggers text,
  patterns text,
  -- Treatment and progress
  treatment_response text,
  progress_description text,
  -- Additional context
  additional_context jsonb,
  -- Full symptom data for backward compatibility
  symptom_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Indexes for Performance
- User ID and creation date
- Symptom type and name
- Composite index for similar symptom queries

## API Endpoints

### 1. Chat Question Generation
**Endpoint**: `POST /api/symptoms/chat-question`

**Purpose**: Generates adaptive questions based on current context

**Request Body**:
```json
{
  "currentSymptomData": {
    "symptomType": "headache",
    "isNew": "new",
    "description": "...",
    "llmResponses": ["..."],
    "functionalImpact": "...",
    "emotionalImpact": "...",
    "triggers": "...",
    "patterns": "...",
    "treatmentResponse": "...",
    "progress": "..."
  },
  "currentQuestionIndex": 2,
  "previousMessages": [...]
}
```

**Response**:
```json
{
  "question": "Where exactly is the problem located?",
  "inputType": "text",
  "options": null,
  "isComplete": false
}
```

### 2. Symptom Logging
**Endpoint**: `POST /api/symptoms/log`

**Purpose**: Saves the completed symptom data

**Request Body**:
```json
{
  "symptomData": {
    "symptomType": "headache",
    "isNew": "new",
    "description": "...",
    "llmResponses": ["..."]
  },
  "socratesData": {
    "site": "...",
    "onset": "...",
    "character": "...",
    "radiation": "...",
    "associations": "...",
    "timeCourse": "...",
    "exacerbatingFactors": "...",
    "severity": "..."
  },
  "reportData": {
    "functionalImpact": "...",
    "emotionalImpact": "...",
    "triggers": "...",
    "patterns": "...",
    "treatmentResponse": "...",
    "progress": "..."
  }
}
```

## Component Structure

### SymptomChat Component
- **State Management**: Manages chat messages, symptom data, and question flow
- **User Interface**: Chat-like interface with message bubbles and input options
- **Question Flow**: Handles button clicks and text inputs
- **Data Persistence**: Saves structured symptom data to database

### Key Functions
1. `startChat()`: Initializes the conversation
2. `handleButtonClick()`: Processes button responses
3. `handleTextSubmit()`: Processes text responses
4. `getNextQuestion()`: Fetches adaptive questions from API
5. `checkPreviousSymptoms()`: Queries database for similar symptoms
6. `completeSymptomLog()`: Saves final symptom data

## Usage

### Basic Implementation
```tsx
import SymptomChat from './components/SymptomChat';

function App() {
  return (
    <div>
      <SymptomChat />
    </div>
  );
}
```

### Test Page
Visit `/test-symptom-chat` to test the component.

## Data Flow

1. **User selects symptom type** → Updates `currentSymptomData.symptomType`
2. **User indicates new/ongoing** → Updates `currentSymptomData.isNew`
3. **User provides description** → Updates `currentSymptomData.description`
4. **Socrates questions** → Collects detailed symptom information
5. **Adaptive follow-ups** → Based on symptom type and context
6. **Impact assessment** → Functional, emotional, patterns, triggers
7. **Data persistence** → Structured data saved to database

## Security and Privacy

- **Authentication**: All API calls require valid JWT tokens
- **Row Level Security**: Database policies ensure users only access their own data
- **GDPR Compliance**: Data retention policies and anonymization functions
- **Audit Logging**: All actions are logged for compliance

## Future Enhancements

1. **AI Integration**: Connect to LLM for more intelligent question generation
2. **Symptom Correlation**: Analyze patterns across multiple symptoms
3. **Treatment Recommendations**: Suggest treatments based on symptom patterns
4. **Integration with EHR**: Export data to electronic health records
5. **Mobile Optimization**: Responsive design for mobile devices

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Ensure user is logged in and token is valid
2. **Database Connection**: Check Supabase configuration
3. **Question Flow**: Verify API endpoints are accessible

### Debug Mode
Enable console logging to track the question flow and data updates.

## Dependencies

- React 18+
- Framer Motion (for animations)
- Supabase (for database and auth)
- TypeScript (for type safety)
- Tailwind CSS (for styling)
