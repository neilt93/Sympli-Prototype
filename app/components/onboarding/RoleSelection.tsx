import { UserRole } from '../../types/onboarding';

interface RoleSelectionProps {
  userRole: UserRole;
  onRoleSelect: (role: UserRole) => void;
}

export default function RoleSelection({ userRole, onRoleSelect }: RoleSelectionProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Who are you using Sympli for today?</h2>
        <p className="text-gray-600">This helps us customize your experience.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Myself Option */}
        <div
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
            userRole === 'myself'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => onRoleSelect('myself')}
        >
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              userRole === 'myself' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Myself</h3>
            <p className="text-gray-600 mb-4">Track your own symptoms and health data</p>
            
            <div className="space-y-2 text-left">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Direct control of your data</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Personal health insights</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Generate your own reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* Someone Else Option */}
        <div
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
            userRole === 'caregiver'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => onRoleSelect('caregiver')}
        >
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              userRole === 'caregiver' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Someone Else</h3>
            <p className="text-gray-600 mb-4">Log symptoms for a family member or patient</p>
            
            <div className="space-y-2 text-left">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Secure consent process</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Clear caregiver identification</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Proper authorization records</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          You can change this setting later in your account preferences.
        </p>
      </div>
    </div>
  );
}

