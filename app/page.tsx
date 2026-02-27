'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  const goAuth = () => {
    try {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
    } catch {}
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="text-2xl font-extrabold text-green-600">Sympli</div>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#features" className="text-gray-700 hover:text-[hsl(var(--primary))]">Features</a>
              <a href="#problem" className="text-gray-700 hover:text-[hsl(var(--primary))]">Problem</a>
              <a href="#vision" className="text-gray-700 hover:text-[hsl(var(--primary))]">Vision</a>
            </nav>
            <button onClick={goAuth} className="px-5 py-2.5 rounded-lg text-white shadow ring-1 ring-green-600/30 bg-green-600 hover:bg-green-700">
              Try Demo
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-10"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-10 pt-24">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Your voice. Your health. <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">Your story</span>, ready for your doctor.
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
              The world's first Health Memory Platform, capturing your symptoms in your own words and transforming them into clear, doctor ready reports.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 p-6 bg-[hsl(var(--muted))] rounded-lg border max-w-md mx-auto">
            <div className="voice-waveform">
              <div className="voice-wave" /><div className="voice-wave" /><div className="voice-wave" /><div className="voice-wave" /><div className="voice-wave" />
            </div>
            <span className="text-sm text-muted-foreground">"I've been having this recurring headache..."</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goAuth} className="px-7 py-3 rounded-lg text-white bg-green-600 hover:bg-green-700 text-lg">Try Demo</button>
            <button disabled className="px-7 py-3 rounded-lg border text-lg">Pilot Coming Soon</button>
          </div>
        </div>
      </section>

      {/* Category/New Space */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-6xl font-extrabold">We're Creating a <span className="text-[hsl(var(--secondary))]">New Category</span></h2>
          <p className="text-2xl text-gray-600 italic">Not a symptom checker. Not a portal. Not a diary. Something entirely new.</p>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="border rounded-lg p-8 bg-white shadow-sm">
              <div className="text-[hsl(var(--primary))] font-bold text-2xl mb-2">1.</div>
              <h3 className="font-bold mb-1">Before you see the doctor</h3>
              <p className="text-gray-600">forms, checklists, symptom checkers</p>
            </div>
            <div className="border rounded-lg p-8 bg-white shadow-sm">
              <div className="text-[hsl(var(--primary))] font-bold text-2xl mb-2">2.</div>
              <h3 className="font-bold mb-1">During the appointment</h3>
              <p className="text-gray-600">notes, prescriptions, diagnoses</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border rounded-lg p-10 shadow-sm">
            <p className="text-xl text-gray-800">Sympli creates a new space: the <strong>Health Memory Platform</strong> — your health story in context, translated for clinical clarity.</p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-5xl md:text-6xl font-extrabold text-center mb-6">From voice to doctor — in minutes</motion.h2>
          <p className="text-center text-gray-600 mb-12">How Sympli transforms your health story into a doctor‑ready summary</p>
          <div className="grid md:grid-cols-5 gap-8">
            {[{i:'🎤',t:'Log your symptoms',d:'Speak or type naturally'},{i:'💬',t:'Smart follow‑up',d:'Simple questions fill details'},{i:'🔍',t:'Health Memory',d:'Logs stored, searchable, secure'},{i:'📄',t:'Clinician‑ready report',d:'Structured before your appointment'},{i:'📤',t:'Share securely',d:'Download or send privately'}].map((s,idx)=>(
              <div key={idx} className="text-center">
                <div className="text-3xl mb-2">{s.i}</div>
                <h3 className="font-bold">{s.t}</h3>
                <p className="text-sm text-gray-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold">The Problem We're Solving</h2>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {[{i:'⏰',t:'GP appointments are ~10 minutes',d:'Rushed conversations and missed details.'},{i:'🧠',t:'Patients forget details',d:'Memory fades when anxious or unwell.'},{i:'🩺',t:'Doctors piece together stories',d:'Time lost that could go to decisions.'},{i:'📅',t:'Long waits & chronic illness',d:'Months between visits mean lost context.'}].map((p,idx)=>(
            <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{p.i}</div>
                <div className="text-left">
                  <h3 className="font-bold text-xl mb-1">{p.t}</h3>
                  <p className="text-gray-600">{p.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold">Core Features</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[{i:'🎤',t:'Voice‑first logging',d:'Talk naturally, Sympli does the rest.'},{i:'🧠',t:'Smart follow‑up',d:'Captures what matters most.'},{i:'📷',t:'Attachments',d:'Photos, results, letters.'},{i:'⚠️',t:'Red flag checks',d:'Highlights urgent symptoms.'},{i:'👥',t:'Caregiver mode',d:'With consent.'},{i:'🔍',t:'Searchable history',d:'Find past logs and reports.'}].map((f,idx)=>(
            <div key={idx} className="border rounded-lg p-6 bg-white hover:shadow">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{f.i}</div>
                <div className="text-left">
                  <h3 className="font-bold mb-1">{f.t}</h3>
                  <p className="text-gray-600 text-sm">{f.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section id="vision" className="py-24 px-6">
        <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] rounded-2xl p-16 text-center text-white shadow-lg max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Our Vision</h2>
          <p className="text-2xl max-w-4xl mx-auto">To create a world where every health story is captured, understood, and shared with the clarity it deserves.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h3 className="text-3xl font-bold">Sympli</h3>
          <p className="text-gray-400">The Health Memory Platform</p>
          <button onClick={goAuth} className="px-7 py-3 rounded-lg text-white bg-[hsl(var(--primary))] hover:brightness-95">Try Demo</button>
        </div>
      </footer>
    </div>
  )
}
