'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SocratesQuestioningProps {
  symptomData: {
    symptom: string;
    type: 'new' | 'ongoing';
    description?: string;
  };
  onComplete: (socratesData: SocratesData) => void;
}

export interface SocratesData {
  site: string;
  onset: string;
  character: string;
  radiation: string;
  associations: string;
  timeCourse: string;
  exacerbatingFactors: string;
  severity: string;
  additionalContext: string;
}

const SocratesQuestioning: React.FC<SocratesQuestioningProps> = ({ symptomData, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [socratesData, setSocratesData] = useState<SocratesData>({
    site: '',
    onset: '',
    character: '',
    radiation: '',
    associations: '',
    timeCourse: '',
    exacerbatingFactors: '',
    severity: '',
    additionalContext: ''
  });
  const [loading, setLoading] = useState(false);
  const [llmQuestions, setLlmQuestions] = useState<string[]>([]);
  const [llmResponses, setLlmResponses] = useState<string[]>([]);
  const [currentLlmQuestion, setCurrentLlmQuestion] = useState(0);

  const socratesQuestions = [
    {
      key: 'site' as keyof SocratesData,
      question: 'Where exactly is the problem located?',
      placeholder: 'e.g., left side of head, lower back, right knee...'
    },
    {
      key: 'onset' as keyof SocratesData,
      question: 'When did this start?',
      placeholder: 'e.g., this morning, 2 days ago, gradually over the past week...'
    },
    {
      key: 'character' as keyof SocratesData,
      question: 'How would you describe the sensation?',
      placeholder: 'e.g., sharp pain, dull ache, throbbing, burning, tingling...'
    },
    {
      key: 'radiation' as keyof SocratesData,
      question: 'Does it spread or move to other areas?',
      placeholder: 'e.g., pain travels down my arm, spreads across my chest...'
    },
    {
      key: 'associations' as keyof SocratesData,
      question: 'What other symptoms occur with this?',
      placeholder: 'e.g., nausea, sweating, dizziness, fever...'
    },
    {
      key: 'timeCourse' as keyof SocratesData,
      question: 'How has it changed over time?',
      placeholder: 'e.g., getting worse, staying the same, comes and goes...'
    },
    {
      key: 'exacerbatingFactors' as keyof SocratesData,
      question: 'What makes it better or worse?',
      placeholder: 'e.g., movement, rest, certain foods, stress...'
    },
    {
      key: 'severity' as keyof SocratesData,
      question: 'On a scale of 1-10, how severe is it?',
      placeholder: '1 = mild, 10 = worst possible'
    }
  ];

  useEffect(() => {
    // Generate LLM follow-up questions after Socrates questions are complete
    if (currentQuestion >= socratesQuestions.length && llmQuestions.length === 0) {
      generateLlmQuestions();
    }
  }, [currentQuestion, llmQuestions.length]);

  const generateLlmQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/symptoms/socrates-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptomData,
          socratesData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLlmQuestions(data.questions);
      } else {
        // Fallback to basic questions if LLM fails
        setLlmQuestions([
          'Is there anything else you think is important for your doctor to know?',
          'Have you noticed any patterns or triggers?',
          'How is this affecting your daily activities?'
        ]);
      }
    } catch (error) {
      console.error('Error generating LLM questions:', error);
      // Fallback questions
      setLlmQuestions([
        'Is there anything else you think is important for your doctor to know?',
        'Have you noticed any patterns or triggers?',
        'How is this affecting your daily activities?'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSocratesAnswer = (answer: string) => {
    const currentKey = socratesQuestions[currentQuestion].key;
    setSocratesData(prev => ({
      ...prev,
      [currentKey]: answer
    }));

    if (currentQuestion < socratesQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setCurrentQuestion(socratesQuestions.length); // Move to LLM questions
    }
  };

  const handleLlmAnswer = (answer: string) => {
    setLlmResponses(prev => [...prev, answer]);

    if (currentLlmQuestion < llmQuestions.length - 1) {
      setCurrentLlmQuestion(prev => prev + 1);
    } else {
      // Complete the flow
      const finalData = {
        ...socratesData,
        additionalContext: llmResponses.join(' ')
      };
      onComplete(finalData);
    }
  };

  const handleSkip = () => {
    if (currentQuestion < socratesQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (currentLlmQuestion < llmQuestions.length - 1) {
      setLlmResponses(prev => [...prev, '']);
      setCurrentLlmQuestion(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating personalized questions...</p>
        </div>
      </motion.div>
    );
  }

  if (currentQuestion < socratesQuestions.length) {
    const question = socratesQuestions[currentQuestion];
    return (
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Question {currentQuestion + 1} of {socratesQuestions.length}
              </h3>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / socratesQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="text-lg text-gray-900 mb-4">{question.question}</p>
            <p className="text-sm text-gray-500 mb-6">{question.placeholder}</p>
          </div>

          <div className="space-y-4">
            <textarea
              value={socratesData[question.key]}
              onChange={(e) => setSocratesData(prev => ({
                ...prev,
                [question.key]: e.target.value
              }))}
              rows={3}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={question.placeholder}
            />
            
            <div className="flex justify-between">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip
              </button>
              <button
                onClick={() => handleSocratesAnswer(socratesData[question.key])}
                disabled={!socratesData[question.key].trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (currentLlmQuestion < llmQuestions.length) {
    const question = llmQuestions[currentLlmQuestion];
    return (
      <motion.div
        key={`llm-${currentLlmQuestion}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white shadow sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Follow-up Question {currentLlmQuestion + 1} of {llmQuestions.length}
              </h3>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentLlmQuestion + 1) / llmQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="text-lg text-gray-900 mb-4">{question}</p>
          </div>

          <div className="space-y-4">
            <textarea
              value={llmResponses[currentLlmQuestion] || ''}
              onChange={(e) => {
                const newResponses = [...llmResponses];
                newResponses[currentLlmQuestion] = e.target.value;
                setLlmResponses(newResponses);
              }}
              rows={3}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Your answer..."
            />
            
            <div className="flex justify-between">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip
              </button>
              <button
                onClick={() => handleLlmAnswer(llmResponses[currentLlmQuestion] || '')}
                disabled={!llmResponses[currentLlmQuestion]?.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentLlmQuestion === llmQuestions.length - 1 ? 'Complete' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default SocratesQuestioning;
