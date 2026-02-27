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
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/60">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex h-20 items-center justify-between">
            <a href="/" className="flex items-center">
              <img src="/logo.jpeg" alt="Sympli" className="w-28" style={{ objectFit: 'contain', objectPosition: 'left center' }} />
            </a>

            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('what-you-get')} className="text-gray-600 hover:text-[#34A853] font-medium transition-colors">
                What You Get
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-[#34A853] font-medium transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollToSection('founders')} className="text-gray-600 hover:text-[#34A853] font-medium transition-colors">
                Founders
              </button>
              <button onClick={() => router.push('/about')} className="text-gray-600 hover:text-[#34A853] font-medium transition-colors">
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
                className="px-6 py-2.5 rounded-lg bg-[#34A853] hover:bg-[#2d9249] text-white font-bold transition-all shadow-sm"
              >
                Try Interactive Demo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Copy */}
            <div className="pt-8">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 mb-8">
                Turn symptoms into a GP&#8209;ready timeline and 1&#8209;page report
              </h1>

              <div className="space-y-4 text-lg text-gray-500 mb-10 max-w-lg">
                <p>Track symptoms over time in your own words.</p>
                <p>Build a structured health timeline.</p>
                <p>Generate a clinically formatted PDF before your appointment.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                  onClick={() => {
                    localStorage.removeItem('authToken')
                    localStorage.removeItem('userData')
                    router.push('/auth')
                  }}
                  className="px-8 py-4 rounded-lg bg-[#34A853] hover:bg-[#2d9249] text-white text-xl font-bold transition-all shadow-md flex items-center justify-center gap-3"
                >
                  Try Interactive Demo (2 min)
                </button>
                <button
                  onClick={() => scrollToSection('what-you-get')}
                  className="px-8 py-4 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xl font-bold transition-all flex items-center justify-center gap-3"
                >
                  View Sample Report
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-12">No signup required. Uses example patient data.</p>

              {/* Disclaimer */}
              <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                Sympli is not a medical device and does not provide diagnoses. It is designed to help you communicate your symptom history more clearly to your doctor.
              </p>
            </div>

            {/* Right: Visual mockups */}
            <div className="hidden lg:block relative lg:pl-12">
              {/* Timeline mockup */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-8 max-w-md ml-auto relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#34A853]"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Symptom Timeline</span>
                </div>

                <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                  {[
                    { title: 'Headache', date: 'Mon 10 Feb, 09:30', desc: 'Throbbing pain behind left eye, started after work...', score: '7/10', color: 'bg-orange-50 text-orange-600' },
                    { title: 'Fatigue', date: 'Thu 6 Feb, 14:15', desc: 'Ongoing tiredness, worse in the afternoon...', score: '5/10', color: 'bg-yellow-50 text-yellow-600' },
                    { title: 'Stomach Pain', date: 'Mon 3 Feb, 11:00', desc: 'Mild cramping after meals, no vomiting...', score: '3/10', color: 'bg-green-50 text-green-600' },
                  ].map((item, i) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#34A853]"></div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.color}`}>{item.score}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium mb-1">{item.date}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GP Report card overlay */}
              <div className="absolute -bottom-12 left-0 bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-64 z-20">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm8-14l4 4h-4V4z"/></svg>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GP Report</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-2 bg-gray-100 rounded-full w-full"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-5/6"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-4/6"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-full"></div>
                </div>
                <div className="flex items-center gap-1.5 text-[#34A853]">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-[10px] font-bold">1 page. Chronological. Ready for your GP.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-8">
          <span className="font-medium text-gray-500">Built for NHS patients</span>
          <span className="font-medium text-gray-500">GDPR compliant</span>
          <span className="font-bold text-gray-700">We never sell your data</span>
          <span className="font-medium text-gray-500">EU-hosted infrastructure</span>
        </div>
      </section>

      {/* What You Get */}
      <section id="what-you-get" className="py-24 px-6 md:px-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              What You Get
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Three outputs designed to make your next appointment clearer and more productive.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Guided Symptom Log',
                desc: 'A structured chat walks you through what you are experiencing, when it started, severity, triggers, and impact. Every entry is confirmed by you before saving.'
              },
              {
                title: 'Health Timeline',
                desc: 'Every confirmed log is added to a searchable, chronological timeline. See patterns, severity trends, and functional impact across weeks or months.'
              },
              {
                title: 'GP-Ready PDF Report',
                desc: 'Before your appointment, generate a 1-page clinically formatted summary. Review it, edit it, then download or share. Structured for the way doctors read.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#34A853]/20 transition-all">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 px-6 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              The Problem
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-6 max-w-3xl mx-auto">
            {[
              { bold: '10 minutes is not enough.', rest: 'GP appointments are short. Patients forget details, especially when anxious or unwell.' },
              { bold: 'Symptoms blur over weeks.', rest: 'Timelines become unclear. Severity is hard to recall. Patterns are missed between visits.' },
              { bold: 'Clinicians spend time reconstructing.', rest: 'Valuable consultation time goes to history-taking instead of clinical decision-making.' },
              { bold: 'Waiting lists make it worse.', rest: 'Months pass between NHS appointments. Context is lost. Explanations are repeated from scratch.' }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-[#34A853] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-900">{item.bold}</span> {item.rest}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-700 font-medium">
              A clear timeline changes the conversation.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
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
                description: 'Describe what you are experiencing through a guided chat. Sympli asks structured follow-up questions. You confirm accuracy at each step.'
              },
              {
                step: '02',
                title: 'Build a Timeline',
                description: 'Each confirmed log is saved to your health timeline. Over days and weeks, you build a continuous record of severity, patterns, and context.'
              },
              {
                step: '03',
                title: 'Generate a Report',
                description: 'Before your appointment, Sympli asks why you are going and what matters most. It drafts a structured summary for you to review and edit.'
              },
              {
                step: '04',
                title: 'Share with Your GP',
                description: 'Download a clinically formatted 1-page PDF. Hand it to your doctor or show it on your phone. No app install needed on their end.'
              }
            ].map((item, index) => (
              <div key={index} className="text-left">
                <div className="text-sm font-semibold text-[#34A853] mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Who It Helps
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Real scenarios where structured symptom tracking makes a measurable difference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Preparing for a GP Appointment',
                description: 'You log symptoms over two weeks. Before your appointment, you generate a 1-page summary. Your GP sees a clear chronological overview from the start, not a rushed verbal account.'
              },
              {
                title: 'Long NHS Referral Waiting Lists',
                description: 'Six months between appointments. You track progression of symptoms, severity changes, and what helped. At the follow-up, you hand over a complete record instead of starting from memory.'
              },
              {
                title: 'Tracking Patterns in Children',
                description: 'Your child has recurring stomach aches. You log frequency, severity, and triggers over weeks. Patterns emerge that would otherwise be invisible between appointments.'
              },
              {
                title: 'Managing Chronic Conditions',
                description: 'You live with a long-term condition and see multiple specialists. Sympli gives each clinician the same structured context without you repeating your history every time.'
              }
            ].map((useCase, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-8 hover:border-[#34A853]/30 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-500 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section id="privacy" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Your Data, Your Control
            </h2>
            <p className="text-xl font-medium text-[#34A853] mb-2">
              We never sell, share, or monetise your health data.
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Sympli is designed to meet the highest standards of data protection and patient privacy.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              { title: 'Encrypted', desc: 'All data encrypted in transit (TLS) and at rest. Database-level encryption protects every record.' },
              { title: 'GDPR Compliant', desc: 'Export, modify, or permanently delete your health records at any time. Full data subject rights.' },
              { title: 'You Own It', desc: 'You are the owner. Sympli is the custodian. Nothing is used beyond your explicit consent.' },
              { title: 'EU Hosted', desc: 'Infrastructure hosted within the EU. No data transfers outside compliant jurisdictions.' }
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="founders" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Founders
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built by a team combining clinical insight with product engineering, focused on improving patient-clinician communication.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-400">NT</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Neil Tripathi</h3>
              <p className="text-sm text-[#34A853] font-medium mb-3">Co-Founder &middot; Product &amp; Engineering</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Focused on product strategy and building the technology that bridges the gap between patients and clinicians. Committed to creating tools that bring structure and clarity to healthcare communication.
              </p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-400">VO</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Victor Ofodile</h3>
              <p className="text-sm text-[#34A853] font-medium mb-3">Co-Founder &middot; Clinical &amp; Operations</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Bringing clinical insight and operational expertise from Imperial College London to ensure Sympli aligns with real-world healthcare workflows and regulatory standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Is Sympli a medical device?',
                a: 'No. Sympli does not provide diagnoses, medical advice, or treatment recommendations. It is a communication tool that helps you record and present your symptom history to your doctor more clearly.'
              },
              {
                q: 'Do I need to create an account?',
                a: 'You can try the interactive demo without signing up. To save your timeline and generate reports for real appointments, you will need to create a free account.'
              },
              {
                q: 'Can my GP access my data directly?',
                a: 'No. Sympli generates a PDF report that you choose to share. Your GP does not need an app or login. You hand them the report or show it on your phone.'
              },
              {
                q: 'How is my data protected?',
                a: 'All data is encrypted in transit and at rest, hosted on EU infrastructure, and fully GDPR compliant. You can export or permanently delete your data at any time. We never sell or share your information.'
              },
              {
                q: 'Is it free?',
                a: 'Sympli is currently free during our early access period. We will always have a free tier for basic symptom logging and report generation.'
              }
            ].map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-[40px] p-12 md:p-16 text-center shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Walk into your next appointment with clarity
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-10 max-w-xl mx-auto">
            Track symptoms, build a timeline, and generate a structured report your GP can read in 60 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                localStorage.removeItem('authToken')
                localStorage.removeItem('userData')
                router.push('/auth')
              }}
              className="px-10 py-5 rounded-xl bg-[#34A853] text-white text-xl font-bold hover:bg-[#2d9249] transition-all shadow-lg"
            >
              Try Interactive Demo (2 min)
            </button>
            <button
              onClick={() => scrollToSection('what-you-get')}
              className="px-10 py-5 rounded-xl border border-white/20 text-white text-xl font-bold hover:bg-white/10 transition-all"
            >
              See What You Get
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-6">No signup required. Uses example patient data.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sympli</h3>
              <p className="text-gray-400 text-sm mb-3">Structured Health Memory Platform</p>
              <p className="text-gray-500 text-sm">Sympli MED Ltd.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Product</h4>
                <nav className="flex flex-col gap-2 text-sm text-gray-400">
                  <button onClick={() => scrollToSection('what-you-get')} className="text-left hover:text-white transition-colors">What You Get</button>
                  <button onClick={() => scrollToSection('how-it-works')} className="text-left hover:text-white transition-colors">How It Works</button>
                  <button onClick={() => scrollToSection('use-cases')} className="text-left hover:text-white transition-colors">Use Cases</button>
                  <button onClick={() => scrollToSection('faq')} className="text-left hover:text-white transition-colors">FAQ</button>
                </nav>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Company</h4>
                <nav className="flex flex-col gap-2 text-sm text-gray-400">
                  <button onClick={() => router.push('/about')} className="text-left hover:text-white transition-colors">About</button>
                  <button onClick={() => scrollToSection('founders')} className="text-left hover:text-white transition-colors">Founders</button>
                  <button onClick={() => scrollToSection('privacy')} className="text-left hover:text-white transition-colors">Privacy &amp; Security</button>
                </nav>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Legal</h4>
                <nav className="flex flex-col gap-2 text-sm text-gray-400">
                  <span className="text-gray-500">Privacy Policy (coming soon)</span>
                  <span className="text-gray-500">Terms of Service (coming soon)</span>
                </nav>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-xs text-gray-500">
            Sympli is not a medical device. It does not provide diagnoses or medical advice.
          </div>
        </div>
      </footer>
    </div>
  )
}
