'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('home')

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
            {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="text-2xl font-extrabold text-[#2F80ED]">Sympli</div>

            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-700 hover:text-[#2F80ED]">
                How It Works
              </button>
              <button onClick={() => scrollToSection('core-features')} className="text-gray-700 hover:text-[#2F80ED]">
                Core Features
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  // Clear any existing auth state for demo
                  localStorage.removeItem('authToken')
                  localStorage.removeItem('userData')
                  router.push('/auth')
                }}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-1 ring-blue-500/30 transition-transform hover:scale-[1.03]"
              >
                🚀 Try Demo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-24 px-6 hero-wash hero-grid">
        <div className="max-w-[1152px] mx-auto text-center">
          {/* HEADLINE */}
          <h1 className="mx-auto text-[44px] sm:text-[64px] md:text-[88px] font-black tracking-[-0.02em] leading-[0.98] text-gray-900 mb-6">
            Your voice. Your health.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2F80ED] to-[#19B5A3]">Your</span>{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#22C55E] to-[#19B5A3]">story</span>
            {" "}— ready for your doctor.
          </h1>

          {/* SUBTITLE */}
          <p className="text-[18px] md:text-[20px] leading-[1.65] text-slate-500 mb-8 max-w-[760px] mx-auto">
            The world's first Health Memory Platform — capturing your symptoms in your own words and transforming
            them into clear, doctor-ready reports.
          </p>

          {/* VOICE CHIP */}
          <div className="mx-auto mb-6 max-w-[560px] rounded-[12px] border border-slate-200 bg-white/70 backdrop-blur px-5 py-3 shadow-[0_1px_0_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.06)]">
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <span className="text-lg">🎙️</span>
              <em>"I've been having this recurring headache..."</em>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => {
                // Clear any existing auth state for demo
                localStorage.removeItem('authToken')
                localStorage.removeItem('userData')
                router.push('/auth')
              }}
              className="px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-1 ring-blue-500/30 transition-transform hover:scale-[1.04] text-base md:text-lg"
            >
              🚀 Try Demo
            </button>
            
          </div>
        </div>
      </section>

      {/* New Category Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6"
          >
            We're Creating a{' '}
            <span className="text-brandGreen relative">
              New Category
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brandBlue"></div>
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl text-gray-600 mb-16 italic font-light"
          >
            "Not a symptom checker. Not a patient portal. Not a diary. Something entirely new."
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-16"
          >
            <p className="text-xl text-gray-700 mb-12 font-medium">
              For decades, healthcare technology has focused on two moments:
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
                <div className="text-brandBlue font-bold text-2xl mb-4">1.</div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl">Before you see the doctor</h3>
                <p className="text-gray-600 text-lg">forms, checklists, symptom checkers</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
                <div className="text-brandBlue font-bold text-2xl mb-4">2.</div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl">During the appointment</h3>
                <p className="text-gray-600 text-lg">notes, prescriptions, diagnoses</p>
              </div>
            </div>
            
            <p className="text-xl text-gray-700 mb-12 font-medium">
              Everything in between — the actual lived experience of your health — has been ignored.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="bg-gradient-to-r from-blue-50 to-green-50 border border-green-200 rounded-lg p-12 shadow-sm"
          >
            <p className="text-xl text-gray-800 leading-relaxed">
              Sympli creates a new space: the <strong className="font-bold">Health Memory Platform.</strong><br />
              A place where your health story lives in full context, always ready to be shared, always<br />
              in your own words — but translated for clinical clarity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              From voice to doctor — <span className="text-brandGreen">in minutes</span>
            </h2>
            <div className="w-28 h-[3px] bg-brandBlue mx-auto rounded-full mt-2 mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how Sympli transforms your health story into actionable medical insights
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-8 mb-16">
            {[
              {
                icon: "🎤",
                title: "Log Your Symptoms",
                description: "Speak or type naturally"
              },
              {
                icon: "💬",
                title: "Smart Follow-Up",
                description: "Sympli asks simple questions to fill in the details"
              },
              {
                icon: "🔍",
                title: "Health Memory Timeline",
                description: "Every log stored, searchable, and secure"
              },
              {
                icon: "📄",
                title: "Clinician-Ready Report",
                description: "Structured for medical use, ready before your appointment"
              },
              {
                icon: "📤",
                title: "Share Securely",
                description: "Download, email, or send via a private link"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 text-center">
              <div className="text-2xl mb-3">🎤</div>
              <p className="text-gray-800 italic">"I've been having headaches for 3 days..."</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 text-center">
              <div className="text-2xl mb-3">🤖</div>
              <p className="text-gray-800">Smart questions capture key details</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 text-center">
              <div className="text-2xl mb-3">📁</div>
              <p className="text-gray-800">Professional medical summary ready</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="core-features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              Core Features
            </h2>
            <div className="w-28 h-[3px] bg-brandBlue mx-auto rounded-full mt-2 mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to capture, organize, and share your health story.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🎤",
                title: "Voice-First Logging",
                description: "Talk naturally, Sympli does the rest."
              },
              {
                icon: "🧠",
                title: "Smart Follow-Up Questions",
                description: "Captures what matters most for diagnosis."
              },
              {
                icon: "📷",
                title: "Attachment Uploads",
                description: "Photos, test results, and letters in one place."
              },
              {
                icon: "⚠️",
                title: "Red Flag Alerts",
                description: "Highlights urgent symptoms."
              },
              {
                icon: "👥",
                title: "Caregiver Mode",
                description: "Track and manage health for someone else (with consent)."
              },
              {
                icon: "🔍",
                title: "Searchable Health Memory",
                description: "Instantly find past logs and reports."
              },
              {
                icon: "⚙️",
                title: "Integration Ready",
                description: "Can plug into GP systems or third-party platforms."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{feature.icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                    →
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              The Problem We're Solving
            </h2>
            <div className="w-28 h-[3px] bg-brandBlue mx-auto rounded-full mt-2"></div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: "⏰",
                title: "GP appointments are often 10 minutes or less",
                description: "Limited time means rushed conversations and missed details."
              },
              {
                icon: "🧠",
                title: "Patients forget symptoms, timelines, and key details",
                description: "Memory fades, especially when you're anxious or unwell."
              },
              {
                icon: "🩺",
                title: "Doctors waste precious minutes piecing together incomplete stories",
                description: "Time that could be spent on diagnosis and treatment planning."
              },
              {
                icon: "📅",
                title: "Chronic illnesses, long NHS waitlists, and complex conditions make this worse",
                description: "Months between appointments mean forgotten context and repeated explanations."
              }
            ].map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm"
              >
                <div className="flex items-start gap-6">
                  <div className="text-3xl">{problem.icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-xl leading-tight">{problem.title}</h3>
                    <p className="text-gray-600 text-lg leading-relaxed">{problem.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sympli is Different */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              Why Sympli is <span className="text-brandGreen">Different</span>
            </h2>
            <div className="w-28 h-[3px] bg-brandBlue mx-auto rounded-full mt-2 mb-12"></div>
            
            <p className="text-3xl font-bold text-gray-800 mb-12 leading-tight">
              "We're not improving the old system — we're redefining it."
            </p>
            
            <div className="space-y-8 text-xl text-gray-700 mb-16 max-w-4xl mx-auto">
              <p className="leading-relaxed">Sympli isn't a small upgrade to healthcare communication — it's a new foundation.</p>
              <p className="leading-relaxed">Instead of asking patients to remember everything in the moment, we capture the story over time.</p>
              <p className="leading-relaxed">Instead of giving doctors half the picture, we give them exactly what they need — in the right language, at the right time.</p>
            </div>
            
            <div className="bg-green-100 rounded-2xl p-12 mb-16 shadow-sm">
              <p className="text-2xl font-bold text-white bg-green-600 rounded-xl px-8 py-6 inline-block">
                This is more than tech. It's the missing link between life and healthcare.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white border-2 border-gray-200 rounded-xl p-10 shadow-sm"
            >
              <div className="text-5xl mb-6">💙</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Impact for Patients</h3>
              <ul className="space-y-6 text-left">
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">You never forget an important symptom.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">You feel heard — your exact words are captured and valued.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">You spend less of your appointment explaining, and more time discussing next steps.</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white border-2 border-gray-200 rounded-xl p-10 shadow-sm"
            >
              <div className="text-5xl mb-6">🩺</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Impact for Doctors</h3>
              <ul className="space-y-6 text-left">
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">Start every consultation already knowing the patient's story.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">Save time on history-taking, focus more on decision-making.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg leading-relaxed">Receive structured, clinically formatted summaries with key details surfaced.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-16 text-center text-white shadow-lg"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-8">Our Vision</h2>
          <p className="text-2xl max-w-4xl mx-auto leading-relaxed">
            To create a world where every health story is captured, understood, and shared with the clarity it deserves.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-6">Sympli</h3>
            <p className="text-gray-400 mb-12 text-xl">
              The Health Memory Platform
            </p>
            <div className="flex justify-center space-x-8">
              <button 
                onClick={() => {
                  localStorage.removeItem('authToken')
                  localStorage.removeItem('userData')
                  router.push('/auth')
                }}
                className="px-9 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-transform hover:scale-[1.03] shadow-md ring-1 ring-blue-500/30 font-semibold text-lg"
              >
                🚀 Try Demo
              </button>
              
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
