# 🏥 Sympli Health - AI-Powered Symptom Tracking

A comprehensive health companion app that uses AI to help users track symptoms, generate clinical reports, and prepare for GP appointments.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd sympli-health
npm install
```

### 2. Environment Setup
Create `.env.local` in the project root:
```env
# Supabase (get from supabase.com → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI (get from platform.openai.com)
OPENAI_API_KEY=your_openai_key
```

### 3. Database Setup
Run this SQL in your Supabase SQL editor:
```sql
-- Create symptom_logs table
CREATE TABLE symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_retention_until TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only access their own symptom logs" 
ON symptom_logs FOR ALL 
USING (auth.uid() = user_id);
```

### 4. Run the App
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000`

## 🛠️ Available Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database (if using backend)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python start_backend.py
```

## 📱 Features

- **AI Symptom Assessment**: SOCRATES framework with AI follow-up questions
- **Symptom Timeline**: Track and view your health history
- **GP Report Generation**: Create professional medical summaries
- **User Authentication**: Secure login with Supabase Auth
- **Data Privacy**: HIPAA-compliant data handling

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/              # Utilities & config
│   └── types/            # TypeScript types
├── backend/              # Python backend (optional)
├── public/               # Static assets
└── .env.local           # Environment variables
```

## 🔧 Troubleshooting

### Common Issues:
- **"Module not found"**: Run `npm install`
- **"Environment variables missing"**: Check `.env.local` exists
- **"Database connection failed"**: Verify Supabase credentials
- **"OpenAI API error"**: Check your API key is valid

### Development Tips:
- Use `npm run dev` for hot reloading
- Check browser console for errors
- Verify environment variables are loaded
- Test API endpoints with Postman/Thunder Client

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for better healthcare** 