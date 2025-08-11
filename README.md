# 🏥 Sympli - Voice-First AI Health Companion

Sympli is a comprehensive voice-first AI health companion that helps patients log symptoms, track patterns, and generate structured, clinically-usable reports for GPs — all within a simple, chat-style interface with MongoDB integration.

## 🎯 Product Overview

### Main Product Flow (Everything Happens in Chat)

1. **Onboarding**
   - Multilingual, consent-based
   - Collects basic history (allergies, past medical issues, etc.)

2. **After Onboarding — 3 Core Actions**
   - **Log a Symptom**: Voice/text input with AI-guided symptom logging
   - **Generate a PDF Report**: Structured reports for GP visits
   - **View Symptom Timeline**: Browse and search past symptom logs

### Key Features

- **Voice-First Interface**: Speech-to-text input with microphone button
- **MongoDB Integration**: Persistent data storage with proper indexing
- **AI-Driven**: Intelligent follow-up questions based on symptom type
- **PDF Generation**: Professional reports with Jinja2 templating
- **Symptom Tracking**: Timeline view with search and filtering
- **Privacy-First**: Secure data handling with user consent
- **Real-time Processing**: Live voice transcription and AI responses

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- OpenAI API key
- MongoDB (local or Atlas)

### Installation

1. **Clone or download the project files**

2. **Set up environment variables**
   ```bash
   # OpenAI API key
   export OPENAI_API_KEY="your-api-key-here"
   
   # MongoDB connection (optional - defaults to localhost)
   export MONGO_URI="mongodb://localhost:27017/"
   ```
   
   Or create a `.env` file:
   ```
   OPENAI_API_KEY=your-api-key-here
   MONGO_URI=mongodb://localhost:27017/
   ```

3. **Install MongoDB (if using local)**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # macOS with Homebrew
   brew install mongodb-community
   
   # Windows: Download from mongodb.com
   ```

4. **Run the application**
   ```bash
   # On Unix/Linux/macOS:
   chmod +x start.sh
   ./start.sh
   
   # On Windows:
   python setup_mongodb.py
   python app.py
   ```

5. **Access the application**
   - Open your browser to `http://localhost:7860`
   - The app will also provide a public URL for sharing

## 📁 Project Structure

```
Sympli project/
├── app.py                 # Main application logic with voice input
├── setup_mongodb.py      # MongoDB database setup script
├── prompts.md            # AI prompt templates
├── report_template.html  # PDF generation template
├── requirements.txt      # Python dependencies
├── start.sh             # Launch script
├── SYMP.csv             # Symptom data mapping
├── env.example          # Environment variables template
└── README.md           # This file
```

## 🆕 New Features

### 🎤 Voice Input
- **Speech-to-Text**: Click the microphone button to speak
- **OpenAI Whisper**: Uses OpenAI's Whisper API for high-accuracy transcription
- **Natural Language**: Speak naturally about your symptoms
- **Error Handling**: Graceful fallback for unclear audio

### 🗄️ MongoDB Integration
- **Persistent Storage**: All data saved to MongoDB
- **User Sessions**: Unique user IDs for data isolation
- **Optimized Indexes**: Fast queries for symptom history
- **Sample Data**: Pre-loaded test data for demonstration

### 📊 Enhanced Data Structure
- **Structured Symptoms**: Rich symptom data with metadata
- **User Profiles**: Comprehensive user information storage
- **Report History**: Track all generated PDF reports
- **Data Analytics**: Ready for future analytics features

## 🔧 Core Components

### 1. Chat Interface (`app.py`)
- Gradio-based web interface
- OpenAI GPT-4 integration
- Chat history management
- Symptom logging flow

### 2. AI Prompts (`prompts.md`)
- System prompts for different flows
- Onboarding conversation templates
- Symptom logging follow-up questions
- PDF generation prompts

### 3. PDF Generation (`report_template.html`)
- Jinja2 template for structured reports
- Professional medical report layout
- Patient information sections
- Symptom timeline formatting

### 4. Symptom Data (`SYMP.csv`)
- Symptom categories and severity levels
- Common triggers and follow-up questions
- Clinical relevance mapping

## 💬 Usage Flows

### 1. Onboarding Flow
```
User → "Hi" → AI welcomes and explains purpose
AI → Asks for consent and privacy agreement
AI → Collects basic medical history
AI → Confirms onboarding completion
```

### 2. Symptom Logging Flow
```
User → Selects symptom or describes issue
AI → Asks "New or ongoing?"
AI → Context-aware follow-up questions
AI → Creates summary for confirmation
AI → Saves to symptom timeline
```

### 3. Timeline View Flow
```
User → "Show my timeline" or searches
AI → Displays recent symptom logs
AI → Allows filtering and searching
AI → Shows detailed entries on request
```

### 4. PDF Generation Flow
```
User → "Generate PDF report"
AI → Asks 4 context questions
AI → Pulls relevant symptom logs
AI → Builds report section by section
AI → Generates downloadable PDF
```

## 🛠️ Development

### Running Locally
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
export OPENAI_API_KEY="your-key"

# Run the app
python app.py
```

### Deploying to Hugging Face Spaces
1. Push your code to a GitHub repository
2. Create a new Space on Hugging Face
3. Connect your repository
4. Add your OpenAI API key as a secret
5. Deploy!

### Customization

#### Adding New Symptoms
Edit `SYMP.csv` to add new symptoms:
```csv
symptom,category,severity_level,common_triggers,follow_up_questions
New Symptom,Category,severity,triggers,questions
```

#### Modifying AI Prompts
Edit `prompts.md` to customize conversation flows and responses.

#### Customizing PDF Template
Modify `report_template.html` to change the PDF layout and styling.

## 🔒 Privacy & Security

- **Data Storage**: Currently in-memory (resets on restart)
- **API Security**: Uses OpenAI's secure API
- **User Consent**: Built-in consent collection
- **Data Control**: Users can clear chat history

## 🚧 Current Limitations

- **Data Persistence**: Chat history is not persistent
- **User Authentication**: No user accounts yet
- **Multi-language**: English only
- **Voice Interface**: Text-based only (despite "voice-first" branding)

## 🎯 Future Enhancements

- [ ] Persistent data storage
- [ ] User authentication
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Mobile app
- [ ] GP integration
- [ ] Symptom analytics
- [ ] Medication tracking

## 📞 Support

For questions or issues:
- Check the prompts in `prompts.md`
- Review the ChatGPT threads mentioned in the email
- Ensure your OpenAI API key is valid
- Check the console for error messages

## 📄 License

This project is for educational and development purposes. Please ensure compliance with healthcare regulations when deploying in clinical settings.

---

**Built with ❤️ for better healthcare communication** 