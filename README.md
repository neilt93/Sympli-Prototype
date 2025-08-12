# 🏥 Sympli Health - AI-Powered Symptom Tracking

A comprehensive health companion app that uses AI to help users track symptoms, generate clinical reports, and prepare for GP appointments.

## 🚀 Quick Start

### One Command Setup
```bash
./start.sh
```

### Manual Setup
```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## ✨ Features

### 🤖 AI-Powered Symptom Assessment
- **SOCRATES Framework**: Clinical symptom evaluation
- **AI Roleplay**: NHS clinic assistant simulation
- **Contextual Questions**: Intelligent follow-up based on symptoms

### 📊 Symptom Management
- **Timeline View**: Chronological symptom tracking
- **Analytics Dashboard**: Trend analysis and insights
- **Detailed Records**: Complete clinical assessments

### 📄 Report Generation
- **GP Reports**: Professional medical summaries
- **Clinical Documentation**: Structured symptom assessments
- **Download Options**: Export reports for appointments

### 🔐 Security & Privacy
- **User Authentication**: Secure login system
- **Data Protection**: GDPR-compliant data handling
- **Row Level Security**: User-specific data access

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel (recommended)

## 🔧 Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Log Symptoms**: Use the guided symptom assessment
3. **View Timeline**: Track your health history
4. **Generate Reports**: Create GP appointment summaries
5. **Download**: Export reports for medical appointments

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy automatically

### Other Options
- **Netlify**: Great alternative
- **Railway**: Full-stack ready
- **Render**: Simple & reliable

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/              # Utilities & config
│   └── types/            # TypeScript types
├── public/               # Static assets
├── start.sh             # Quick start script
└── DEPLOYMENT_GUIDE.md  # Deployment instructions
```

## 🔒 Privacy & Security

- **HIPAA Compliant**: Medical data protection
- **GDPR Ready**: European privacy standards
- **Secure Storage**: Encrypted data handling
- **User Control**: Full data ownership

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Documentation**: Check this README first
- **Issues**: Report bugs on GitHub
- **Deployment**: See `DEPLOYMENT_GUIDE.md`

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for better healthcare** 