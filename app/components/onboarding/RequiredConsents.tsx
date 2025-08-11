import { RequiredConsents as RequiredConsentsType } from '../../types/onboarding';

interface RequiredConsentsProps {
  data: RequiredConsentsType;
  onUpdate: (data: RequiredConsentsType) => void;
}

export default function RequiredConsents({ data, onUpdate }: RequiredConsentsProps) {
  const handleCheckboxChange = (field: keyof RequiredConsentsType, checked: boolean) => {
    const updatedData = { ...data, [field]: checked };
    onUpdate(updatedData);
  };

  const requiredConsentsComplete = data.understandsNotDiagnostic && 
                                  data.consentsToStorage && 
                                  data.consentsToSummaryGeneration;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Required Consents</h2>
        <p className="text-gray-600">Please review and agree to the following statements</p>
      </div>

      {/* Required Consents */}
      <div className="space-y-6">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="understandsNotDiagnostic"
            checked={data.understandsNotDiagnostic}
            onChange={(e) => handleCheckboxChange('understandsNotDiagnostic', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
          />
          <div className="ml-3">
            <label htmlFor="understandsNotDiagnostic" className="text-sm font-medium text-gray-900">
              I understand Sympli is not a diagnostic tool
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Sympli helps me track and share my health information but does not provide medical diagnoses or replace professional medical advice.
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="consentsToStorage"
            checked={data.consentsToStorage}
            onChange={(e) => handleCheckboxChange('consentsToStorage', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
          />
          <div className="ml-3">
            <label htmlFor="consentsToStorage" className="text-sm font-medium text-gray-900">
              I consent to secure storage of my health logs
            </label>
            <p className="text-sm text-gray-600 mt-1">
              My health information will be encrypted and securely stored to enable symptom tracking and report generation.
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="consentsToSummaryGeneration"
            checked={data.consentsToSummaryGeneration}
            onChange={(e) => handleCheckboxChange('consentsToSummaryGeneration', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
          />
          <div className="ml-3">
            <label htmlFor="consentsToSummaryGeneration" className="text-sm font-medium text-gray-900">
              I consent to doctor-facing summary generation
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Sympli may generate professional health summaries from my logs that I can choose to share with my healthcare providers.
            </p>
          </div>
        </div>
      </div>

      {/* Optional Research Participation */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="allowsResearchParticipation"
            checked={data.allowsResearchParticipation}
            onChange={(e) => handleCheckboxChange('allowsResearchParticipation', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
          />
          <div className="ml-3">
            <label htmlFor="allowsResearchParticipation" className="text-sm font-medium text-gray-900">
              Allow anonymized data for healthcare research
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Help improve future healthcare tools by allowing your anonymized, de-identified data to be used for research purposes only. This is completely optional and can be changed at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center pt-6">
        <button
          disabled={!requiredConsentsComplete}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            requiredConsentsComplete
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Please complete required consents
        </button>
        <p className="text-sm text-gray-500 mt-2">
          The first three consents are required to use Sympli
        </p>
      </div>
    </div>
  );
}

