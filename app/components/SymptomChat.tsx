'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  options?: string[];
  onOptionSelect?: (option: string) => void;
  isEditable?: boolean;
  onEdit?: (content: string) => void;
}

interface SymptomData {
  topic?: string;
  description?: string;
  isNew?: boolean;
  severity?: string;
  duration?: string;
  location?: string;
  triggers?: string;
  notes?: string;
}

interface PDFData {
  appointmentReason?: string;
  doctorUnderstanding?: string;
  medicationsTried?: string;
  recentTests?: string;
  relevantSymptoms?: string[];
}

export default function SymptomChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingOption, setIsProcessingOption] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<'idle' | 'logging' | 'timeline' | 'pdf'>('idle');
  const [symptomData, setSymptomData] = useState<SymptomData>({});
  const [pdfData, setPdfData] = useState<PDFData>({});
  const [currentPDFContent, setCurrentPDFContent] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with welcome message
    addMessage({
      type: 'ai',
      content: "Hi! I'm Sympli, your health companion. How can I help you today?",
      options: ['Log a Symptom', 'View Timeline', 'Generate GP PDF']
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleOptionSelect = (option: string) => {
    // Check for menu command
    if (option.toLowerCase() === 'menu') {
      addMessage({
        type: 'user',
        content: option
      });
      goBackToMenu();
      return;
    }

    addMessage({
      type: 'user',
      content: option
    });

    switch (option) {
      case 'Log a Symptom':
        startSymptomLogging();
        break;
      case 'View Timeline':
        startTimelineView();
        break;
      case 'Generate GP PDF':
        startPDFGeneration();
        break;
      default:
        handleFlowOption(option);
    }
  };

  const startSymptomLogging = () => {
    setCurrentFlow('logging');
    setSymptomData({});
    
    setTimeout(() => {
      addMessage({
        type: 'ai',
        content: "Let's log your symptom. What type of health concern are you experiencing?",
        options: ['Headache', 'Pain', 'Digestive Issues', 'Fatigue', 'Other']
      });
    }, 1000);
  };

  const startTimelineView = () => {
    setCurrentFlow('timeline');
    
    setTimeout(() => {
      addMessage({
        type: 'ai',
        content: "Here are your recent symptom logs. You can search by keyword or browse chronologically.",
        options: ['Search by Keyword', 'View Recent', 'View All']
      });
    }, 1000);
  };

  const startPDFGeneration = () => {
    setCurrentFlow('pdf');
    
    setTimeout(() => {
      addMessage({
        type: 'ai',
        content: "I'll help you create a comprehensive report for your GP. Let's start with the basics.",
        options: ['Start PDF Generation']
      });
    }, 1000);
  };

  const handleFlowOption = (option: string) => {
    if (currentFlow === 'logging') {
      handleSymptomLogging(option);
    } else if (currentFlow === 'timeline') {
      handleTimelineView(option);
    } else if (currentFlow === 'pdf') {
      handlePDFGeneration(option);
    }
  };

  const handleSymptomLogging = (option: string) => {
    if (!symptomData.topic) {
      setSymptomData(prev => ({ ...prev, topic: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: `Tell me about your ${option.toLowerCase()}. Describe it in your own words.`
        });
      }, 1000);
    } else if (!symptomData.description) {
      setSymptomData(prev => ({ ...prev, description: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Is this a new symptom or something ongoing?",
          options: ['New', 'Ongoing']
        });
      }, 1000);
    } else if (!symptomData.isNew) {
      const isNew = option === 'New';
      setSymptomData(prev => ({ ...prev, isNew }));
      
      setTimeout(() => {
        if (isNew) {
          addMessage({
            type: 'ai',
            content: "Since this is new, let me ask a few more questions. How severe is it?",
            options: ['Mild', 'Moderate', 'Severe']
          });
        } else {
          addMessage({
            type: 'ai',
            content: "How long have you been experiencing this?",
            options: ['Days', 'Weeks', 'Months', 'Years']
          });
        }
      }, 1000);
    } else if (!symptomData.severity && symptomData.isNew) {
      setSymptomData(prev => ({ ...prev, severity: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Where exactly are you feeling this?",
          options: ['Head', 'Chest', 'Abdomen', 'Back', 'Limbs', 'Other']
        });
      }, 1000);
    } else if (!symptomData.duration && !symptomData.isNew) {
      setSymptomData(prev => ({ ...prev, duration: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "How severe is it?",
          options: ['Mild', 'Moderate', 'Severe']
        });
      }, 1000);
    } else if (!symptomData.severity && !symptomData.isNew) {
      setSymptomData(prev => ({ ...prev, severity: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Where exactly are you feeling this?",
          options: ['Head', 'Chest', 'Abdomen', 'Back', 'Limbs', 'Other']
        });
      }, 1000);
    } else if (!symptomData.location) {
      setSymptomData(prev => ({ ...prev, location: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "What triggers or makes it worse? (If nothing specific, say 'None')"
        });
      }, 1000);
    } else if (!symptomData.triggers) {
      setSymptomData(prev => ({ ...prev, triggers: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Any additional notes or context you'd like to add?"
        });
      }, 1000);
    } else if (!symptomData.notes) {
      setSymptomData(prev => ({ ...prev, notes: option }));
      
      // Generate summary
      setTimeout(() => {
        const summary = generateSymptomSummary();
        addMessage({
          type: 'ai',
          content: `Here's a summary of what you've told me:\n\n${summary}\n\nDoes this look correct?`,
          options: ['Yes, Save', 'No, Edit']
        });
      }, 1000);
    }
  };

  const generateSymptomSummary = () => {
    const { topic, description, isNew, severity, duration, location, triggers, notes } = symptomData;
    
    let summary = `**${topic}**\n`;
    summary += `Description: ${description}\n`;
    summary += `Type: ${isNew ? 'New' : 'Ongoing'}\n`;
    if (duration && !isNew) summary += `Duration: ${duration}\n`;
    if (severity) summary += `Severity: ${severity}\n`;
    if (location) summary += `Location: ${location}\n`;
    if (triggers && triggers !== 'None') summary += `Triggers: ${triggers}\n`;
    if (notes) summary += `Notes: ${notes}\n`;
    
    return summary;
  };

  const handleTimelineView = async (option: string) => {
    if (option === 'Search by Keyword') {
      addMessage({
        type: 'ai',
        content: "What keyword would you like to search for?"
      });
    } else {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/symptoms/logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const logs = data.symptomLogs || [];
          
          if (logs.length === 0) {
            addMessage({
              type: 'ai',
              content: "You haven't logged any symptoms yet. Would you like to log your first symptom?",
              options: ['Log a Symptom', 'Back to Menu']
            });
          } else {
            let timelineContent = "Here are your recent symptom logs:\n\n";
            
            logs.slice(0, 5).forEach((log: any, index: number) => {
              const date = new Date(log.created_at).toLocaleDateString('en-GB');
              timelineContent += `• ${log.symptom_description} (${date}) - ${log.severity} severity\n`;
            });
            
            if (logs.length > 5) {
              timelineContent += `\n... and ${logs.length - 5} more entries`;
            }
            
            addMessage({
              type: 'ai',
              content: timelineContent,
              options: ['View All', 'Search by Keyword', 'Back to Menu']
            });
          }
        } else {
          addMessage({
            type: 'ai',
            content: "❌ Failed to fetch timeline. Please try again.",
            options: ['Try Again', 'Back to Menu']
          });
        }
      } catch (error) {
        addMessage({
          type: 'ai',
          content: "❌ Network error. Please try again.",
          options: ['Try Again', 'Back to Menu']
        });
      }
    }
  };

  const handlePDFGeneration = (option: string) => {
    if (option === 'Start PDF Generation') {
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "What's the main reason for your appointment?"
        });
      }, 1000);
    } else if (!pdfData.appointmentReason) {
      setPdfData(prev => ({ ...prev, appointmentReason: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "What do you want the doctor to understand about your situation?"
        });
      }, 1000);
    } else if (!pdfData.doctorUnderstanding) {
      setPdfData(prev => ({ ...prev, doctorUnderstanding: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "What medications or remedies have you tried?"
        });
      }, 1000);
    } else if (!pdfData.medicationsTried) {
      setPdfData(prev => ({ ...prev, medicationsTried: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Have you had any recent tests or investigations?"
        });
      }, 1000);
    } else if (!pdfData.recentTests) {
      setPdfData(prev => ({ ...prev, recentTests: option }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: "Which symptoms from your history are most relevant to this appointment?",
          options: ['All Recent Symptoms', 'Select Specific Symptoms']
        });
      }, 1000);
    } else if (!pdfData.relevantSymptoms) {
      if (option === 'All Recent Symptoms') {
        setPdfData(prev => ({ ...prev, relevantSymptoms: [] }));
        generatePDF();
      } else {
        // In a real app, you'd show a list of symptoms to select from
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: "Please type the symptoms you'd like to include (comma-separated):"
          });
        }, 1000);
      }
    } else if (pdfData.relevantSymptoms && pdfData.relevantSymptoms.length === 0) {
      // Handle specific symptom selection
      const symptoms = option.split(',').map(s => s.trim());
      setPdfData(prev => ({ ...prev, relevantSymptoms: symptoms }));
      generatePDF();
    }
  };

  const downloadPDF = (content: string) => {
    // Create a simple PDF-like download
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `gp-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generatePDF = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/symptoms/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pdfData)
      });

      if (response.ok) {
        const data = await response.json();
        
        setCurrentPDFContent(data.pdfContent);
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: `Here's your GP appointment report:\n\n${data.pdfContent}\n\nWould you like to download this as a PDF?`,
            options: ['Download PDF', 'Edit Report', 'Back to Menu']
          });
        }, 1000);
      } else {
        addMessage({
          type: 'ai',
          content: "❌ Failed to generate PDF. Please try again.",
          options: ['Try Again', 'Back to Menu']
        });
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: "❌ Network error. Please try again.",
        options: ['Try Again', 'Back to Menu']
      });
    }
  };

  const goBackToMenu = () => {
    setCurrentFlow('idle');
    setSymptomData({});
    setPdfData({});
    setCurrentPDFContent('');
    addMessage({
      type: 'ai',
      content: "How can I help you today?",
      options: ['Log a Symptom', 'View Timeline', 'Generate GP PDF']
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Check for menu command
    if (userInput.toLowerCase() === 'menu') {
      addMessage({
        type: 'user',
        content: userInput
      });
      goBackToMenu();
      setIsLoading(false);
      return;
    }

    addMessage({
      type: 'user',
      content: userInput
    });

    // Handle different flows
    if (currentFlow === 'logging') {
      handleSymptomLogging(userInput);
    } else if (currentFlow === 'timeline') {
      handleTimelineView(userInput);
    } else if (currentFlow === 'pdf') {
      handlePDFGeneration(userInput);
    }

    setIsLoading(false);
  };

  const saveSymptom = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symptomDescription: symptomData.description,
          severity: symptomData.severity || 'Unknown',
          duration: symptomData.isNew ? 'New' : 'Ongoing',
          location: symptomData.location || 'General',
          triggers: symptomData.triggers || 'None',
          notes: symptomData.notes || ''
        })
      });

      if (response.ok) {
        addMessage({
          type: 'ai',
          content: "✅ Symptom logged successfully! It's been added to your timeline.",
          options: ['Log Another Symptom', 'View Timeline', 'Back to Menu']
        });
        setCurrentFlow('idle');
        setSymptomData({});
      } else {
        addMessage({
          type: 'ai',
          content: "❌ Failed to save symptom. Please try again.",
          options: ['Try Again', 'Back to Menu']
        });
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: "❌ Network error. Please try again.",
        options: ['Try Again', 'Back to Menu']
      });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {message.options && (
                  <div className="mt-3 space-y-2">
                    {message.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (option === 'Yes, Save') {
                            saveSymptom();
                          } else if (option === 'Back to Menu') {
                            goBackToMenu();
                          } else if (option === 'Download PDF') {
                            if (currentPDFContent) {
                              downloadPDF(currentPDFContent);
                              addMessage({
                                type: 'ai',
                                content: "📄 PDF downloaded successfully!",
                                options: ['Back to Menu']
                              });
                            } else {
                              addMessage({
                                type: 'ai',
                                content: "No PDF content to download yet.",
                                options: ['Back to Menu']
                              });
                            }
                          } else if (option === 'Edit Report') {
                            setPdfData({});
                            addMessage({
                              type: 'ai',
                              content: "Let's start over with the PDF generation. What's the main reason for your appointment?"
                            });
                          } else {
                            handleOptionSelect(option);
                          }
                        }}
                        className="block w-full text-left px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl">
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

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        
        {/* Privacy Statement */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Private & HIPAA-compliant
          </div>
        </div>
      </div>
    </div>
  );
}
