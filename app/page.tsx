'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Sympli" width={120} height={40} />
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollToSection('use-cases')} className="text-gray-600 hover:text-gray-900 transition-colors">
                Use Cases
              </button>
              <button onClick={() => scrollToSection('founders')} className="text-gray-600 hover:text-gray-900 transition-colors">
                Founders
              </button>
              <button onClick={() => router.push('/about')} className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('authToken')
                  localStorage.removeItem('userData')
                  router.push('/auth')
                }}
                className="px-5 py-2 rounded-md bg-[#2F80ED] hover:bg-[#2570D4] text-white text-sm font-medium transition-colors"
              >
                Try Demo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] text-gray-900 mb-6">
            Structured health memory for clearer clinical conversations
          </h1>

          <p className="text-lg md:text-xl leading-relaxed text-gray-500 mb-10 max-w-2xl mx-auto">
            Sympli captures your symptoms over time, organises them into a structured timeline,
            and generates clinically formatted reports — so you arrive at your appointment with clarity.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                localStorage.removeItem('authToken')
                localStorage.removeItem('userData')
                router.push('/auth')
              }}
              className="px-7 py-3 rounded-md bg-[#2F80ED] hover:bg-[#2570D4] text-white font-medium transition-colors"
            >
              Try the Demo
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-7 py-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              How Sympli Works
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From symptom to structured report, in four steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-10">
            {[
              {
                step: '01',
                title: 'Log a Symptom',
                description: 'A patient logs a symptom through a guided conversation. The system asks structured follow-up questions. The patient confirms accuracy at each step.'
              },
              {
                step: '02',
                title: 'Build a Timeline',
                description: 'Each confirmed log is saved to a structured health timeline, creating a continuous record that captures patterns, severity, and context over time.'
              },
              {
                step: '03',
                title: 'Generate a Report',
                description: 'Before an appointment, the patient generates a report. The system asks contextual questions about the consultation reason and produces a draft for review.'
              },
              {
                step: '04',
                title: 'Share with Your Doctor',
                description: 'Once confirmed, the final report is converted into a clinically formatted PDF — structured for faster, clearer consultations.'
              }
            ].map((item, index) => (
              <div key={index} className="text-left">
                <div className="text-sm font-semibold text-[#2F80ED] mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Can Be Used */}
      <section id="use-cases" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              How It Can Be Used
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Practical scenarios where structured health memory makes a difference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Preparing for a GP Appointment',
                description: 'A patient logs symptoms over two weeks and generates a structured summary before the consultation. The doctor receives a clear, chronological overview on arrival.'
              },
              {
                title: 'Long Referral Waiting Lists',
                description: 'A patient on a six-month referral waiting list tracks the progression of symptoms over time and shares a progression report at the follow-up appointment.'
              },
              {
                title: 'Tracking Patterns in Children',
                description: 'A parent tracks recurring symptoms in a child — frequency, severity, triggers — and identifies patterns that might otherwise go unnoticed between appointments.'
              },
              {
                title: 'Recording Medical Advice',
                description: 'A patient records advice given by a doctor and stores it in one organised timeline alongside their own symptom logs, creating a complete health record.'
              }
            ].map((useCase, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-500 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              The Problem
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Medical appointments are short. Important details are lost.
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'GP appointments are often ten minutes or less. Patients forget important details, especially when anxious or unwell.',
              'Symptoms are remembered inaccurately. Timelines become unclear. Important patterns are missed between appointments.',
              'Doctors are forced to work with incomplete information, spending valuable consultation time on history-taking rather than clinical decision-making.',
              'For patients with chronic conditions or those on long NHS waiting lists, months can pass between appointments — context is lost and explanations repeated.'
            ].map((text, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2.5 flex-shrink-0"></div>
                <p className="text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="founders" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Founders
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built by a team focused on improving patient-clinician communication.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-400">NT</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Neil Thompson</h3>
              <p className="text-sm text-[#2F80ED] font-medium mb-3">Co-Founder</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Focused on product strategy and building technology that bridges the gap between patients and clinicians. Committed to creating tools that bring structure and clarity to healthcare communication.
              </p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-400">CF</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Co-Founder</h3>
              <p className="text-sm text-[#2F80ED] font-medium mb-3">Co-Founder</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Bringing clinical insight and operational expertise to ensure Sympli aligns with real-world healthcare workflows and regulatory standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Protection & Privacy */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Data Protection and Privacy
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Patient data is handled with the highest standards of security and compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Encryption</h3>
              <p className="text-gray-500 leading-relaxed">
                All patient data is encrypted in transit and at rest. Communication between the application and backend services uses TLS encryption. Database-level encryption protects stored health records.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">GDPR Compliance</h3>
              <p className="text-gray-500 leading-relaxed">
                Sympli is designed to be fully GDPR compliant. Users can request data export, modification, and complete deletion of their health records at any time.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">User Consent</h3>
              <p className="text-gray-500 leading-relaxed">
                Explicit, informed consent is obtained before any data is collected or processed. Patients maintain full control over what is recorded, stored, and shared.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Ownership</h3>
              <p className="text-gray-500 leading-relaxed">
                Patients own their health data. Sympli acts as a custodian, not an owner. Data is never sold, shared with third parties, or used for purposes beyond the patient's explicit consent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
            Vision
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            Sympli aims to become a structured health memory layer between patients and clinicians.
            The long-term vision is to support more efficient GP consultations, better diagnostic accuracy,
            and improved patient confidence — creating a world where every health story is captured, understood,
            and shared with the clarity it deserves.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('authToken')
              localStorage.removeItem('userData')
              router.push('/auth')
            }}
            className="px-7 py-3 rounded-md bg-[#2F80ED] hover:bg-[#2570D4] text-white font-medium transition-colors"
          >
            Try the Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sympli</h3>
              <p className="text-gray-400 text-sm">Structured Health Memory Platform</p>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <button onClick={() => router.push('/about')} className="hover:text-white transition-colors">About</button>
              <button onClick={() => scrollToSection('founders')} className="hover:text-white transition-colors">Founders</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button>
            </nav>
            <p className="text-gray-500 text-sm">Sympli MED Ltd.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
