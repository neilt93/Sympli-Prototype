'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  socratesData?: {
    site: string;
    onset: string;
    character: string;
    radiation: string;
    associations: string;
    timeCourse: string;
    exacerbatingFactors: string;
    severity: string;
    additionalContext: string;
  };
  llmResponses: string[];
  functionalImpact: string;
  emotionalImpact: string;
  triggers: string;
  patterns: string;
  treatmentResponse: string;
  progress: string;
}

interface ChatMessage {
  id: string;
  type: 'agent' | 'user';
  content: string;
  timestamp: Date;
  isQuestion?: boolean;
  options?: string[];
  inputType?: 'text' | 'buttons' | 'textarea';
}

const SymptomChat: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSymptomData, setCurrentSymptomData] = useState<SymptomData>({
    symptomType: 'headache',
    isNew: 'new',
    description: '',
    llmResponses: [],
    functionalImpact: '',
    emotionalImpact: '',
    triggers: '',
    patterns: '',
    treatmentResponse: '',
    progress: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user from session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      startChat();
    }
  }, [user]);

  const startChat = () => {
    const initialMessage: ChatMessage = {
      id: '1',
      type: 'agent',
      content: "Hello! I'm here to help you log your symptoms. What are you tracking today?",
      timestamp: new Date(),
      isQuestion: true,
      options: ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'],
      inputType: 'buttons'
    };
    setMessages([initialMessage]);
  };

  const handleButtonClick = async (option: string) => {
    const symptomTypeMap: Record<string, SymptomData['symptomType']> = {
      'Headache': 'headache',
      'Fatigue': 'fatigue',
      'Side Effect': 'side_effect',
      'Pregnancy': 'pregnancy',
      'Other': 'other'
    };

    const symptomType = symptomTypeMap[option];
    setCurrentSymptomData(prev => ({ ...prev, symptomType }));

    // Add user response
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: option,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Get next question
    await getNextQuestion();
  };

  const handleTextSubmit = async () => {
    if (!userInput.trim()) return;

    // Add user response
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Update symptom data based on current question
    updateSymptomData(userInput);

    setUserInput('');
    await getNextQuestion();
  };

  const updateSymptomData = (input: string) => {
    setCurrentSymptomData(prev => {
      const newData = { ...prev };
      
      switch (currentQuestionIndex) {
        case 1: // New or ongoing
          newData.isNew = input.toLowerCase().includes('new') ? 'new' : 'ongoing';
          break;
        case 2: // Description
          newData.description = input;
          break;
        default:
          // For LLM follow-up questions
          if (currentQuestionIndex > 2) {
            const llmIndex = currentQuestionIndex - 3;
            const newLlmResponses = [...prev.llmResponses];
            newLlmResponses[llmIndex] = input;
            newData.llmResponses = newLlmResponses;
            
            // Update specific fields based on question content
            const questionContent = messages[messages.length - 1]?.content.toLowerCase() || '';
            
            if (questionContent.includes('functional impact') || questionContent.includes('daily activities')) {
              newData.functionalImpact = input;
            } else if (questionContent.includes('emotional') || questionContent.includes('stress') || questionContent.includes('anxiety')) {
              newData.emotionalImpact = input;
            } else if (questionContent.includes('triggers') || questionContent.includes('patterns')) {
              if (questionContent.includes('triggers')) {
                newData.triggers = input;
              } else {
                newData.patterns = input;
              }
            } else if (questionContent.includes('treatment') || questionContent.includes('medication')) {
              newData.treatmentResponse = input;
            } else if (questionContent.includes('progress') || questionContent.includes('changed over time')) {
              newData.progress = input;
            }
          }
      }
      
      return newData;
    });
  };

  const getNextQuestion = async () => {
    setIsLoading(true);
    
    try {
      // If this is an ongoing symptom, check for previous similar symptoms
      if (currentQuestionIndex === 1 && currentSymptomData.isNew === 'ongoing') {
        await checkPreviousSymptoms();
      }

      const response = await fetch('/api/symptoms/chat-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          currentSymptomData,
          currentQuestionIndex,
          previousMessages: messages
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const agentMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: data.question,
          timestamp: new Date(),
          isQuestion: true,
          options: data.options,
          inputType: data.inputType || 'text'
        };
        
        setMessages(prev => [...prev, agentMessage]);
        setCurrentQuestionIndex(prev => prev + 1);
        
        // If this is the last question, complete the flow
        if (data.isComplete) {
          await completeSymptomLog();
        }
      } else {
        throw new Error('Failed to get next question');
      }
    } catch (error) {
      console.error('Error getting next question:', error);
      // Fallback to basic questions
      const fallbackQuestions = [
        'Is this a new symptom or something ongoing?',
        'Can you describe what you\'re experiencing?',
        'How is this affecting your daily activities?',
        'Have you noticed any patterns or triggers?',
        'How would you rate the severity on a scale of 1-10?'
      ];
      
      if (currentQuestionIndex < fallbackQuestions.length) {
        const agentMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: fallbackQuestions[currentQuestionIndex],
          timestamp: new Date(),
          isQuestion: true,
          inputType: 'text'
        };
        setMessages(prev => [...prev, agentMessage]);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        await completeSymptomLog();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkPreviousSymptoms = async () => {
    try {
      const { data: previousSymptoms, error } = await supabase
        .from('symptom_logs')
        .select('symptom_data')
        .eq('user_id', user?.id)
        .contains('symptom_data', { symptom: currentSymptomData.symptomType })
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && previousSymptoms.length > 0) {
        const agentMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: `I found ${previousSymptoms.length} previous entries for ${currentSymptomData.symptomType}. Let me ask some follow-up questions based on your history.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      console.error('Error checking previous symptoms:', error);
    }
  };

  const completeSymptomLog = async () => {
    try {
      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          symptomData: currentSymptomData,
          socratesData: currentSymptomData.socratesData,
          reportData: {
            functionalImpact: currentSymptomData.functionalImpact,
            emotionalImpact: currentSymptomData.emotionalImpact,
            triggers: currentSymptomData.triggers,
            patterns: currentSymptomData.patterns,
            treatmentResponse: currentSymptomData.treatmentResponse,
            progress: currentSymptomData.progress
          }
        })
      });

      if (response.ok) {
        const completionMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: 'Thank you! Your symptom has been logged successfully. Is there anything else you\'d like to track today?',
          timestamp: new Date(),
          isQuestion: true,
          options: ['Log Another Symptom', 'View My Symptoms', 'Done for Now'],
          inputType: 'buttons'
        };
        setMessages(prev => [...prev, completionMessage]);
      } else {
        throw new Error('Failed to log symptom');
      }
    } catch (error) {
      console.error('Error completing symptom log:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'agent',
        content: 'Sorry, there was an error saving your symptom. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const renderMessage = (message: ChatMessage) => {
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            message.type === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm">{message.content}</p>
          
          {message.isQuestion && message.options && (
            <div className="mt-3 space-y-2">
              {message.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleButtonClick(option)}
                  disabled={isLoading}
                  className="block w-full text-left px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {message.isQuestion && message.inputType === 'text' && (
            <div className="mt-3">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your response..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!userInput.trim() || isLoading}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Symptom Chat</h2>
          <p className="text-blue-100 text-sm">Your AI health assistant is here to help</p>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-6">
          <AnimatePresence>
            {messages.map(renderMessage)}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.href = '/symptoms'}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View All Symptoms
            </button>
            <button
              onClick={() => window.location.href = '/symptoms/overview'}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Symptom Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChat;
