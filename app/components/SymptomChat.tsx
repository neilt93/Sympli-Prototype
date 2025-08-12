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
  symptom?: string;
  type?: 'new' | 'ongoing';
  description?: string;
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
  reportData?: any;
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
  const [currentFlow, setCurrentFlow] = useState<'idle' | 'logging' | 'timeline' | 'pdf'>('idle');
  const [symptomData, setSymptomData] = useState<SymptomData>({});
  const [pdfData, setPdfData] = useState<PDFData>({});
  const [currentPDFContent, setCurrentPDFContent] = useState<string>('');
  const [socratesStep, setSocratesStep] = useState<string>('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Initialize with welcome message only once
    if (!hasInitialized) {
      addMessage({
        type: 'ai',
        content: "Hi! I'm Sympli, your health companion. How can I help you today?",
        options: ['Log a Symptom', 'View Timeline', 'Generate GP PDF']
      });
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRandomSocratesIntro = () => {
    const intros = [
      "I'll help gather some information for the doctor. Let me ask you a few questions about your symptoms.",
      "Let me get some details about what you're experiencing so I can prepare everything for the doctor.",
      "I'd like to understand your symptoms better to help the doctor. Can you tell me more about what's happening?",
      "Let me ask you some questions about your symptoms so I can make sure the doctor has all the information they need.",
      "I'll help prepare you for the doctor by gathering some key information about your symptoms.",
      "Let me get a better understanding of your symptoms so I can assist the doctor effectively.",
      "I'd like to ask you a few questions about your symptoms to help the doctor with their assessment.",
      "Let me gather some information about what you're experiencing so the doctor can help you properly."
    ];
    return intros[Math.floor(Math.random() * intros.length)];
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    console.log('🤖 AI Message Added:', {
      type: message.type,
      content: message.content,
      options: message.options,
      timestamp: newMessage.timestamp
    });
    setMessages(prev => [...prev, newMessage]);
  };

  const handleOptionSelect = (option: string) => {
    console.log('🎯 Option Selected:', option);
    console.log('📊 Current Flow State:', currentFlow);
    console.log('📋 Current Symptom Data:', symptomData);
    
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
        console.log('🚀 Starting Symptom Logging Flow');
        startSymptomLogging();
        break;
      case 'View Timeline':
        console.log('📅 Starting Timeline View Flow');
        startTimelineView();
        break;
      case 'Generate GP PDF':
        console.log('📄 Starting PDF Generation Flow');
        startPDFGeneration();
        break;
      default:
        console.log('🔄 Handling Flow Option:', option);
        handleFlowOption(option);
    }
  };

  const startSymptomLogging = () => {
    setCurrentFlow('logging');
    setSymptomData({});
    setSocratesStep('');
    setFollowUpQuestions([]);
    setCurrentFollowUpIndex(0);
    
    setTimeout(() => {
      addMessage({
        type: 'ai',
        content: "Let's log your symptom using clinical best practices. What type of health concern are you experiencing?",
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
        content: "I'll create a comprehensive GP report using your logged symptoms. What's the main reason for your appointment?",
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
    console.log('🔍 Symptom Logging Step:', {
      option,
      hasSymptom: !!symptomData.symptom,
      hasType: !!symptomData.type,
      socratesStep,
      followUpQuestionsLength: followUpQuestions.length,
      currentFollowUpIndex
    });

    if (!symptomData.symptom) {
      // First step: Symptom selection
      console.log('📝 Step 1: Symptom Selection');
      if (option === 'Other') {
        console.log('📝 User selected "Other" - asking for description');
        addMessage({
          type: 'ai',
          content: "What is the problem? Please describe your symptom in detail."
        });
      } else {
        console.log('📝 User selected symptom:', option);
        setSymptomData(prev => ({ ...prev, symptom: option }));
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: "Is this a new symptom or something ongoing?",
            options: ['New', 'Ongoing']
          });
        }, 1000);
      }
    } else if (!symptomData.type) {
      // Second step: New or Ongoing
      console.log('📝 Step 2: New or Ongoing Selection');
      const type = option === 'New' ? 'new' : 'ongoing';
      console.log('📝 User selected type:', type);
      setSymptomData(prev => ({ ...prev, type }));
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: getRandomSocratesIntro(),
        });
      }, 1000);
      setSocratesStep('site');
      console.log('📝 Starting SOCRATES with step: site');
    } else if (socratesStep) {
      // SOCRATES questions
      console.log('📝 SOCRATES Question:', { currentStep: socratesStep, answer: option });
      handleSocratesQuestion(option);
    } else if (followUpQuestions.length > 0 && currentFollowUpIndex < followUpQuestions.length) {
      // Follow-up questions
      console.log('📝 Follow-up Question:', { 
        currentIndex: currentFollowUpIndex, 
        totalQuestions: followUpQuestions.length,
        answer: option 
      });
      handleFollowUpQuestion(option);
    } else if (currentFollowUpIndex >= followUpQuestions.length && followUpQuestions.length > 0) {
      // Generate report
      console.log('📝 Generating Report');
      generateSymptomReport();
    }
  };

  const handleSocratesQuestion = (answer: string) => {
    console.log('🔍 SOCRATES Processing:', { currentStep: socratesStep, answer });
    
    const socratesData = symptomData.socratesData || {
      site: '',
      onset: '',
      character: '',
      radiation: '',
      associations: '',
      timeCourse: '',
      exacerbatingFactors: '',
      severity: '',
      additionalContext: ''
    };

    const questions = [
      { step: 'site', question: 'Where exactly are you experiencing this?', field: 'site' },
      { step: 'onset', question: 'When did this symptom start?', field: 'onset' },
      { step: 'character', question: 'How would you describe the character of this symptom? (e.g., sharp, dull, throbbing, burning)', field: 'character' },
      { step: 'radiation', question: 'Does the pain or symptom radiate to other areas?', field: 'radiation' },
      { step: 'associations', question: 'Are there any associated symptoms? (e.g., nausea, fever, sweating)', field: 'associations' },
      { step: 'timeCourse', question: 'How has this symptom changed over time?', field: 'timeCourse' },
      { step: 'exacerbatingFactors', question: 'What makes this symptom better or worse?', field: 'exacerbatingFactors' },
      { step: 'severity', question: 'On a scale of 1-10, how severe is this symptom?', field: 'severity' },
      { step: 'additionalContext', question: 'Is there anything else you think I should know about this symptom?', field: 'additionalContext' }
    ];

    const currentQuestionIndex = questions.findIndex(q => q.step === socratesStep);
    console.log('🔍 SOCRATES Question Index:', { currentQuestionIndex, totalQuestions: questions.length });
    
    if (currentQuestionIndex >= 0) {
      // Update the current field
      const field = questions[currentQuestionIndex].field as keyof typeof socratesData;
      socratesData[field] = answer;
      console.log('📝 Updated SOCRATES Data:', { field, value: answer, fullData: socratesData });
      
      setSymptomData(prev => ({ 
        ...prev, 
        socratesData: { ...socratesData }
      }));

      // Move to next question or finish SOCRATES
      if (currentQuestionIndex < questions.length - 1) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        setSocratesStep(nextQuestion.step);
        console.log('🔄 Moving to next SOCRATES question:', nextQuestion.step);
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: nextQuestion.question
          });
        }, 1000);
      } else {
        // SOCRATES complete, generate follow-up questions
        console.log('✅ SOCRATES Complete! Moving to follow-up questions');
        setSocratesStep('');
        generateFollowUpQuestions();
      }
    }
  };

  const generateFollowUpQuestions = async () => {
    console.log('🤖 Generating AI follow-up questions based on SOCRATES data:', symptomData.socratesData);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/symptoms/socrates-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symptomData: {
            symptom: symptomData.symptom,
            type: symptomData.type,
            description: symptomData.description
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🤖 AI Generated Questions:', data);
        
        if (data.questions && data.questions.length > 0) {
          setFollowUpQuestions(data.questions);
          setCurrentFollowUpIndex(0);
          
                     setTimeout(() => {
             addMessage({
               type: 'ai',
               content: data.questions[0]
             });
           }, 1000);
        } else {
          console.log('❌ No questions generated by AI, moving to report generation');
          generateSymptomReport();
        }
      } else {
        console.log('❌ API failed, moving to report generation');
        generateSymptomReport();
      }
    } catch (error) {
      console.log('❌ Network error, moving to report generation:', error);
      generateSymptomReport();
    }
  };

  const handleFollowUpQuestion = (answer: string) => {
    // Store the answer (in a real app, you'd save this)
    const currentQuestion = followUpQuestions[currentFollowUpIndex];
    
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(prev => prev + 1);
      const nextQuestion = followUpQuestions[currentFollowUpIndex + 1];
      
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: nextQuestion
        });
      }, 1000);
    } else {
      // All follow-up questions complete
      setCurrentFollowUpIndex(prev => prev + 1);
      generateSymptomReport();
    }
  };

  const generateSymptomReport = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/symptoms/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symptomData: {
            symptom: symptomData.symptom,
            type: symptomData.type,
            description: symptomData.description
          },
          socratesData: symptomData.socratesData
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reportContent = data.reportContent || generateFallbackReport();
        
        setSymptomData(prev => ({ ...prev, reportData: data }));
        
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: `Here's your comprehensive symptom report:\n\n${reportContent}\n\nDoes this look correct?`,
            options: ['Yes, Save', 'No, Edit']
          });
        }, 1000);
      }
    } catch (error) {
      const fallbackReport = generateFallbackReport();
      setTimeout(() => {
        addMessage({
          type: 'ai',
          content: `Here's your comprehensive symptom report:\n\n${fallbackReport}\n\nDoes this look correct?`,
          options: ['Yes, Save', 'No, Edit']
        });
      }, 1000);
    }
  };

  const generateFallbackReport = () => {
    const { symptom, type, socratesData } = symptomData;
    let report = `**Symptom Report: ${symptom}**\n\n`;
    report += `**Type:** ${type === 'new' ? 'New Symptom' : 'Ongoing Symptom'}\n\n`;
    
    if (socratesData) {
      report += `**Clinical Summary:**\n`;
      
      // Create a natural language clinical summary
      let clinicalSummary = `The patient presents with ${socratesData.character} ${symptom.toLowerCase()} `;
      
      if (socratesData.site) {
        clinicalSummary += `localized to the ${socratesData.site} `;
      }
      
      if (socratesData.onset) {
        clinicalSummary += `that began ${socratesData.onset}. `;
      }
      
      if (socratesData.radiation && socratesData.radiation.toLowerCase() !== 'no' && socratesData.radiation.toLowerCase() !== 'none') {
        clinicalSummary += `The pain radiates to ${socratesData.radiation}. `;
      }
      
      if (socratesData.associations && socratesData.associations.toLowerCase() !== 'no' && socratesData.associations.toLowerCase() !== 'none') {
        clinicalSummary += `Associated symptoms include ${socratesData.associations}. `;
      }
      
      if (socratesData.timeCourse) {
        clinicalSummary += `The symptom has ${socratesData.timeCourse} over time. `;
      }
      
      if (socratesData.exacerbatingFactors) {
        clinicalSummary += `Factors that worsen the symptom include ${socratesData.exacerbatingFactors}. `;
      }
      
      if (socratesData.severity) {
        clinicalSummary += `The patient rates the severity as ${socratesData.severity}/10. `;
      }
      
      if (socratesData.additionalContext) {
        clinicalSummary += `Additional context: ${socratesData.additionalContext}. `;
      }
      
      report += clinicalSummary + '\n\n';
      
      // Add key clinical findings in bullet points
      report += `**Key Clinical Findings:**\n`;
      if (socratesData.site) report += `• Location: ${socratesData.site}\n`;
      if (socratesData.onset) report += `• Onset: ${socratesData.onset}\n`;
      if (socratesData.character) report += `• Character: ${socratesData.character}\n`;
      if (socratesData.radiation && socratesData.radiation.toLowerCase() !== 'no' && socratesData.radiation.toLowerCase() !== 'none') {
        report += `• Radiation: ${socratesData.radiation}\n`;
      }
      if (socratesData.severity) report += `• Severity: ${socratesData.severity}/10\n`;
    }
    
    return report;
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
          symptomData: {
            symptom: symptomData.symptom,
            type: symptomData.type,
            description: symptomData.description
          },
          socratesData: symptomData.socratesData,
          reportData: symptomData.reportData
        })
      });

      if (response.ok) {
        addMessage({
          type: 'ai',
          content: "✅ Symptom logged successfully! It's been added to your timeline with comprehensive details.",
          options: ['Log Another Symptom', 'View Timeline', 'Back to Menu']
        });
        setCurrentFlow('idle');
        setSymptomData({});
        setSocratesStep('');
        setFollowUpQuestions([]);
        setCurrentFollowUpIndex(0);
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

  const generatePDFFromSymptoms = async () => {
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
            content: "You haven't logged any symptoms yet. Please log some symptoms first!",
            options: ['Log a Symptom', 'Back to Menu']
          });
          return;
        }

        // Generate report using stored symptoms
        const report = generateReportFromStoredSymptoms(logs, pdfData.appointmentReason);
        
        setCurrentPDFContent(report);
        setTimeout(() => {
          addMessage({
            type: 'ai',
            content: `Here's your GP appointment report:\n\n${report}\n\nWould you like to download this as a PDF?`,
            options: ['Download PDF', 'Edit Report', 'Back to Menu']
          });
        }, 1000);
      } else {
        addMessage({
          type: 'ai',
          content: "❌ Failed to fetch symptoms. Please try again.",
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

  const generateReportFromStoredSymptoms = (logs: any[], appointmentReason: string) => {
    let report = `# GP Appointment Report
**Generated:** ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}

## Appointment Information
- **Reason for Visit:** ${appointmentReason}

## Symptom Summary
`;

    logs.slice(0, 5).forEach((log, index) => {
      const date = new Date(log.created_at).toLocaleDateString('en-GB');
      const severity = log.severity || 'Unknown';
      
      report += `
### Symptom ${index + 1}: ${log.symptom_description}
- **Date:** ${date}
- **Severity:** ${severity}/10

**Clinical Assessment:**
`;
      
      // Add SOCRATES data if available
      if (log.symptom_data?.socrates) {
        const socrates = log.symptom_data.socrates;
        if (socrates.site) report += `- Site: ${socrates.site}\n`;
        if (socrates.onset) report += `- Onset: ${socrates.onset}\n`;
        if (socrates.character) report += `- Character: ${socrates.character}\n`;
        if (socrates.radiation) report += `- Radiation: ${socrates.radiation}\n`;
        if (socrates.associations) report += `- Associations: ${socrates.associations}\n`;
        if (socrates.timeCourse) report += `- Time Course: ${socrates.timeCourse}\n`;
        if (socrates.exacerbatingFactors) report += `- Exacerbating Factors: ${socrates.exacerbatingFactors}\n`;
        if (socrates.severity) report += `- Severity: ${socrates.severity}/10\n`;
        if (socrates.additionalContext) report += `- Additional Context: ${socrates.additionalContext}\n`;
      }
    });

    report += `
## Recommendations for GP
- Review detailed symptom assessments above
- Consider severity levels and impact on daily activities
- Evaluate for any red flag symptoms requiring immediate attention
- Assess need for further investigations or specialist referral

---
*Report generated by Sympli Health Companion*
*For clinical use - please verify all information with the patient*
`;

    return report;
  };

  const handlePDFGeneration = (option: string) => {
    if (!pdfData.appointmentReason) {
      setPdfData(prev => ({ ...prev, appointmentReason: option }));
      generatePDFFromSymptoms();
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
    setSocratesStep('');
    setFollowUpQuestions([]);
    setCurrentFollowUpIndex(0);
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
