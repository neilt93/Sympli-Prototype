interface DataProtectionProps {
  onComplete: () => void;
}

export default function DataProtection({ onComplete }: DataProtectionProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Protection & Consent</h2>
        <p className="text-gray-600">Your privacy and data security are our top priorities</p>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">End-to-End Encryption</h3>
          <p className="text-gray-600 text-sm">Your health data is encrypted both in transit and at rest</p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">GDPR Compliant</h3>
          <p className="text-gray-600 text-sm">Full compliance with European data protection regulations</p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Storage</h3>
          <p className="text-gray-600 text-sm">Data stored in certified, medical-grade cloud infrastructure</p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Sharing</h3>
          <p className="text-gray-600 text-sm">We never share your data without your explicit consent</p>
        </div>
      </div>

      {/* How Sympli Protects Your Data */}
      <div className="space-y-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">How Sympli Protects Your Data</h3>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg">
          <p className="text-blue-800 text-sm mb-4">
            We encrypt your information using industry-standard protocols, comply with GDPR regulations, and never share your data without your consent. Your health information remains private and secure at all times.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <span className="text-blue-800 text-sm">All data is encrypted with AES-256 encryption</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <span className="text-blue-800 text-sm">You can delete your data at any time</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <span className="text-blue-800 text-sm">We comply with HIPAA, GDPR, and other privacy regulations</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <span className="text-blue-800 text-sm">Data is only processed for your health tracking and reporting</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <span className="text-blue-800 text-sm">No advertising or third-party data sharing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center pt-4">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          I Understand & Continue
        </button>
      </div>
    </div>
  );
}

