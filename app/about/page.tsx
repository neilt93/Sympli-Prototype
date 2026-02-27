'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Sympli" width={120} height={40} priority />
            </button>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </button>
              <span className="text-gray-900">About</span>
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

      {/* Page Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">

          {/* Introduction */}
          <section className="mb-16">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">About Sympli</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Sympli is a voice-first health memory platform designed to help patients communicate more
              clearly during medical appointments. It transforms everyday symptom experiences into structured
              clinical summaries that doctors can read quickly and understand immediately.
            </p>
          </section>

          {/* The Problem */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Problem</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Medical appointments are short. Patients often forget important details. Symptoms are
                remembered inaccurately. Timelines become unclear. Important patterns are missed. Doctors
                are forced to work with incomplete information.
              </p>
              <p>
                This creates frustration for both patients and clinicians.
              </p>
            </div>
          </section>

          {/* The Solution */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Solution</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Sympli allows patients to log symptoms through structured voice or chat-based conversations.
                Each entry is confirmed, organised, and stored in a health timeline. When needed, Sympli
                generates a clinically structured report that summarises key patterns, timelines, and
                relevant history.
              </p>
              <p>
                Instead of relying on memory, patients arrive with clarity.
              </p>
            </div>
          </section>

          {/* How Sympli Works */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How Sympli Works</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                A patient logs a symptom through a guided chat flow. The system asks structured follow-up
                questions. The patient confirms accuracy at each step. The log is saved to a structured
                health timeline.
              </p>
              <p>
                Before an appointment, the patient generates a report. The system asks contextual questions
                about the reason for consultation and what the patient wants the doctor to understand. A
                draft version of the report is generated. The patient can review and edit it. Once confirmed,
                the final version is converted into a PDF.
              </p>
              <p>
                The result is a structured, clinically formatted summary that supports faster and clearer
                consultations.
              </p>
            </div>
          </section>

          {/* Who It Is For */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who It Is For</h2>
            <div className="space-y-3">
              {[
                'Patients with chronic conditions',
                'Patients on long NHS waiting lists',
                'Individuals managing complex or invisible conditions',
                'Parents tracking children\'s health',
                'Carers supporting family members'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#2F80ED] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Vision */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vision</h2>
            <p className="text-gray-600 leading-relaxed">
              Sympli aims to become a structured health memory layer between patients and clinicians. The
              long-term vision is to support more efficient GP consultations, better diagnostic accuracy,
              and improved patient confidence.
            </p>
          </section>

          {/* CTA */}
          <div className="pt-8 border-t border-gray-200">
            <div className="flex items-center gap-4">
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
                onClick={() => router.push('/')}
                className="px-7 py-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sympli</h3>
              <p className="text-gray-400 text-sm">Structured Health Memory Platform</p>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <button onClick={() => router.push('/')} className="hover:text-white transition-colors">Home</button>
              <span className="text-white">About</span>
            </nav>
            <p className="text-gray-500 text-sm">Sympli MED Ltd.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
