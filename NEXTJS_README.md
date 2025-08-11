# 🏥 Sympli Health - Next.js PWA

A modern, responsive Progressive Web App (PWA) built with Next.js 14, designed for voice-first AI health companion functionality.

## 🚀 Features

- **Progressive Web App (PWA)** - Installable, offline-capable web application
- **Voice-First Interface** - Voice commands and dictation support
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Real-time Chat** - AI-powered health conversations
- **Health Timeline** - Track symptoms and health events
- **Reports Generation** - Comprehensive health reports
- **Dark Mode Support** - User preference for theme
- **Offline Capability** - Service worker for offline functionality
- **Push Notifications** - Health reminders and updates

## 🛠️ Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Charts**: Chart.js with React Chart.js
- **PWA**: next-pwa with Workbox
- **HTTP Client**: Axios
- **Animations**: Framer Motion

## 📁 Project Structure

```
app/
├── layout.tsx              # Root layout with PWA meta tags
├── page.tsx                # Home page component
├── globals.css             # Global styles and Tailwind imports
├── chat/                   # Chat interface pages
├── timeline/               # Health timeline pages
├── reports/                # Health reports pages
└── settings/               # User settings pages
public/
├── manifest.json           # PWA manifest
├── icons/                  # PWA icons
└── favicon.ico            # App favicon
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm 8.0.0 or higher

### Quick Start (Windows)

1. **Run the start script:**
   ```bash
   start-nextjs.bat
   ```

   This will automatically:
   - Check Node.js installation
   - Install dependencies
   - Start the development server

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Start production server:**
   ```bash
   npm start
   ```

## 🔧 Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run pwa:build` - Build with PWA optimizations

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS for utility-first styling with custom configurations:

- **Custom Colors**: Primary health-themed color palette
- **Custom Animations**: Smooth transitions and micro-interactions
- **PWA Utilities**: Safe area insets and mobile-specific utilities
- **Responsive Design**: Mobile-first approach with custom breakpoints

### Custom CSS Classes

```css
.btn-primary          # Primary button styling
.btn-secondary       # Secondary button styling
.btn-danger          # Danger button styling
.card                # Card container styling
.input-field         # Input field styling
.health-status-*     # Health status indicators
```

## 📱 PWA Features

### Manifest

- **App Name**: Sympli Health
- **Display Mode**: Standalone
- **Theme Color**: Primary blue (#0ea5e9)
- **Orientation**: Portrait primary
- **Categories**: Health, Medical, Productivity

### Service Worker

- **Runtime Caching**: OpenAI API, fonts, and static assets
- **Offline Support**: Cached responses for offline use
- **Background Sync**: Queue actions when offline
- **Push Notifications**: Health reminders and updates

### Install Experience

- **Install Prompt**: Automatic detection and user-friendly prompt
- **App Shortcuts**: Quick access to key features
- **Home Screen**: Native app-like experience

## 🔌 Backend Integration

The frontend connects to the Python Flask backend:

- **API Endpoint**: `http://localhost:7860`
- **Authentication**: JWT-based auth system
- **Real-time Chat**: WebSocket or HTTP polling
- **Voice Processing**: OpenAI Whisper integration
- **Data Storage**: MongoDB with GDPR compliance

## 📱 Mobile Optimization

- **Touch-friendly**: Large touch targets and gestures
- **Safe Areas**: Support for notches and home indicators
- **Responsive**: Mobile-first design approach
- **Performance**: Optimized for mobile devices

## 🌙 Dark Mode

- **System Preference**: Automatically follows system theme
- **Custom Colors**: Tailored dark theme palette
- **Smooth Transitions**: Animated theme switching

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
2. **Set environment variables**
3. **Deploy automatically on push**

### Other Platforms

- **Netlify**: Static export with PWA support
- **AWS Amplify**: Full-stack deployment
- **Docker**: Containerized deployment

## 🔒 Security

- **HTTPS Required**: PWA features require secure context
- **Content Security Policy**: Restrict resource loading
- **Input Validation**: Sanitize user inputs
- **API Security**: Secure backend communication

## 📊 Performance

- **Lighthouse Score**: Optimized for PWA metrics
- **Core Web Vitals**: Fast loading and interaction
- **Bundle Analysis**: Optimized JavaScript bundles
- **Image Optimization**: Next.js automatic optimization

## 🧪 Testing

- **Unit Tests**: Component testing with Jest
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing
- **PWA Testing**: Lighthouse PWA audit

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ by the Sympli Health Team**
