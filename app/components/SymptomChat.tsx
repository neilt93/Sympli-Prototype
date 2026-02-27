'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Mic, Square } from 'lucide-react';

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  userDescription: string; // New field for user's own words description
  rawTranscript: string; // Raw patient response with proper grammar
  processedTranscript: string; // Processed transcript for clinical use
  customName?: string;
  customDate?: string;
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
  type: 'agent' | 'user' | 'system';
  content: string;
  timestamp: Date;
  isQuestion?: boolean;
  options?: string[];
  inputType?: 'text' | 'buttons' | 'textarea';
  answered?: boolean;
  selectedOption?: string;
  renderType?: 'timeline';
  logs?: Array<{
    id: string;
    created_at: string;
    symptom_type?: string;
    symptom_name?: string;
    severity_scale?: number;
    functional_impact?: string;
    description?: string;
    emotional_impact?: string;
    location?: string;
    onset_time?: string;
    character_description?: string;
    additional_context?: any;
    symptom_data?: any;
  }>;
}

const defaultSymptom: SymptomData = {
  symptomType: 'other',
  isNew: 'new',
  description: '',
  userDescription: '', // Initialize new field
  rawTranscript: '', // Initialize raw transcript
  processedTranscript: '', // Initialize processed transcript
  llmResponses: [],
  functionalImpact: '',
  emotionalImpact: '',
  triggers: '',
  patterns: '',
  treatmentResponse: '',
  progress: ''
};

type SymptomChatProps = {
  token?: string;
  onComplete?: () => void;
  onCancel?: () => void;
};

const SymptomChat: React.FC<SymptomChatProps> = ({ token: propToken, onComplete, onCancel }) => {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const initialPrologueMessage: ChatMessage = {
    id: 'prologue',
    type: 'agent',
    content: "Hi, I'm Sympli, your voice-first health companion. I'm here to help you track symptoms, spot patterns, and prepare for appointments — all in your own words.",
    timestamp: new Date(),
  };
  const initialMenuMessage: ChatMessage = {
    id: 'menu-0',
    type: 'agent',
    content: 'What would you like to do today?',
    timestamp: new Date(),
    isQuestion: true,
    options: ['Log a Symptom', 'Generate PDF Report', 'View Timeline'],
    inputType: 'buttons'
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialPrologueMessage, initialMenuMessage]);
  const [chatForSave, setChatForSave] = useState<Array<{ role: 'agent'|'user'|'system'; content: string }>>([
    { role: 'agent', content: initialPrologueMessage.content },
    { role: 'agent', content: initialMenuMessage.content }
  ]);
  const [currentSymptomData, setCurrentSymptomData] = useState<SymptomData>({ ...defaultSymptom });
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const questionIndexRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState('');
  const questionAbortRef = useRef<AbortController | null>(null);
  const newId = () => (globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random()));
  const awaitingOtherConfirmRef = useRef<{ candidate: string } | null>(null);
  const awaitingSimilarConfirmRef = useRef<boolean>(false);

  // Function to process raw transcript with proper grammar
  const processTranscriptWithGrammar = async (rawText: string): Promise<string> => {
    try {
      const response = await fetch('/api/symptoms/process-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ rawTranscript: rawText })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.processedTranscript || rawText;
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
    
    // Fallback: return original text if processing fails
    return rawText;
  };

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [audioLevel, setAudioLevel] = useState(0);
  const [timelineView, setTimelineView] = useState<'chat' | 'camera-roll'>('chat');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSymptomFilter, setSelectedSymptomFilter] = useState<string>('all');
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [symptomGroups, setSymptomGroups] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Post-save choice flag
  const awaitingPostSaveRef = useRef(false);
  const awaitingTimelineSearchRef = useRef(false);
  const timelineAllCountRef = useRef(5);
  const gpFlowStateRef = useRef<{ step: number; answers: Record<string, string> } | null>(null);
  const awaitingOtherNameRef = useRef(false);
  const awaitingDateSelectionRef = useRef(false);
  const awaitingUserDescriptionRef = useRef(false);
  const sessionStartIdxRef = useRef(0);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setUser(session.user);
      } catch {}
    };
    getUser();
  }, []);

  useEffect(() => {
    // Load timeline logs when component mounts
    loadTimelineLogs();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const pushAgentQuestion = (text: string, options?: string[], inputType: 'text' | 'buttons' | 'textarea' = 'text') => {
    const safeText = (() => {
      try {
        if (typeof text === 'string') {
          return text;
        } else if (text && typeof text === 'object') {
          // Check for the specific problematic object structure
          const textObj = text as any;
          if ('reportData' in textObj || 'custom_date' in textObj || 'custom_name' in textObj || 
              'llmResponses' in textObj || 'socratesData' in textObj || 'raw_transcript' in textObj ||
              'user_description' in textObj || 'processed_transcript' in textObj) {
            console.warn('Detected problematic object passed to pushAgentQuestion:', textObj);
            return `[Object data detected] ${JSON.stringify(textObj, null, 2)}`;
          }
          return JSON.stringify(text, null, 2);
        } else {
          return String(text || '');
        }
      } catch (error) {
        console.error('Error processing text in pushAgentQuestion:', error, text);
        return 'Error processing text';
      }
    })();
    setMessages(prev => [...prev, { id: newId(), type: 'agent', content: safeText, timestamp: new Date(), isQuestion: true, options, inputType }]);
    setChatForSave(prev => [...prev, { role: 'agent', content: safeText }]);
  };

  const showMainMenu = () => {
    // reset flow state
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    setCurrentSymptomData({ ...defaultSymptom });
    awaitingPostSaveRef.current = false;
    awaitingTimelineSearchRef.current = false;
    awaitingOtherNameRef.current = false;
    awaitingUserDescriptionRef.current = false;
    gpFlowStateRef.current = null;
    setIsLoading(false);
    setUserInput('');
    // Append in desired order: system notice first, then menu question
    setMessages(prev => [
      ...prev,
      { id: newId(), type: 'system', content: 'Returned to main menu.', timestamp: new Date() },
      { id: newId(), type: 'agent', content: 'What would you like to do today?', timestamp: new Date(), isQuestion: true, options: ['Log a Symptom', 'Generate PDF Report', 'View Timeline'], inputType: 'buttons' }
    ]);
  };

  const resetForNewLog = () => {
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    setCurrentSymptomData({ ...defaultSymptom });
    sessionStartIdxRef.current = messages.length;
    // Step 1: Initial Questions - Start with symptom type selection buttons
    pushAgentQuestion('What specific symptom would you like to log?', ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'], 'buttons');
  };

  const markMessageAnswered = (messageId: string, selected: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, answered: true, selectedOption: selected } : m));
  };

  const handleTopChoice = async (choice: string, messageId: string) => {
    markMessageAnswered(messageId, choice);
    setMessages(prev => [...prev, { id: newId(), type: 'user', content: choice, timestamp: new Date() }]);
    setChatForSave(prev => [...prev, { role: 'user', content: choice }]);
    if (choice === 'Log a Symptom') return resetForNewLog();
    if (choice === 'Generate PDF Report') { startGPFlow(); return; }
    if (choice === 'View Timeline') {
      router.push('/timeline');
      return;
    }
  };

  const handleButtonClick = async (option: string, messageId: string, event?: React.MouseEvent) => {
    // Prevent double clicks
    const button = event?.target as HTMLButtonElement;
    if (button?.disabled) return;
    if (button) button.disabled = true;

    // Handle confirmation for custom name from "Other" flow
    // Handle confirmation for similar previous logs
    if (awaitingSimilarConfirmRef.current && (option === 'Yes, same pain' || option === 'No, different')) {
      awaitingSimilarConfirmRef.current = false;
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      setChatForSave(prev => [...prev, { role: 'user', content: option }]);
      if (option === 'No, different') {
        const updatedData = { ...currentSymptomData, isNew: 'new' as const };
        setCurrentSymptomData(updatedData);
        questionIndexRef.current = 2;
        setCurrentQuestionIndex(2);
        await getNextQuestion(2, undefined, updatedData);
        return;
      }
      // same pain → continue ongoing flow
      questionIndexRef.current = 2;
      setCurrentQuestionIndex(2);
      await getNextQuestion(2);
      return;
    }
    if (awaitingOtherConfirmRef.current && (option === 'Yes' || option === 'No')) {
      if (option === 'Yes') {
        const candidate = awaitingOtherConfirmRef.current.candidate;
        awaitingOtherConfirmRef.current = null;
        markMessageAnswered(messageId, option);
        setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
        setCurrentSymptomData(prev => ({ ...prev, customName: candidate }));
        pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
        questionIndexRef.current = 0;
        setCurrentQuestionIndex(0);
        return;
      } else {
        awaitingOtherConfirmRef.current = null;
        awaitingOtherNameRef.current = true;
        markMessageAnswered(messageId, option);
        setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
        pushAgentQuestion('No problem — what should I call it?', undefined, 'text');
        return;
      }
    }
    // Handle GP PDF flow actions FIRST to avoid falling through to symptom flow
    if (gpFlowStateRef.current && ['Confirm', 'Re-record', 'Download PDF', 'Edit anything', 'Back to menu'].includes(option)) {
      if (option === 'Back to menu') { markMessageAnswered(messageId, option); showMainMenu(); return; }
      if (option === 'Confirm') {
        markMessageAnswered(messageId, option);
        setMessages(prev => [...prev,
          { id: newId(), type: 'agent', content: `Preview – Executive Summary and Most Recent Entries will be generated based on your logs.`, timestamp: new Date() },
          { id: newId(), type: 'agent', content: `Ready to generate your PDF now?`, timestamp: new Date(), isQuestion: true, inputType: 'buttons', options: ['Download PDF', 'Edit anything', 'Back to menu'] }
        ]);
        return;
      }
      if (option === 'Re-record') { markMessageAnswered(messageId, option); gpFlowStateRef.current = { step: 0, answers: {} }; askNextGPQuestion(0); return; }
      if (option === 'Edit anything') { markMessageAnswered(messageId, option); gpFlowStateRef.current = { step: 0, answers: gpFlowStateRef.current?.answers || {} }; askNextGPQuestion(0); return; }
      if (option === 'Download PDF') {
        markMessageAnswered(messageId, option);
        try {
          const token = await getAuthToken();
          const st = gpFlowStateRef.current;
          let res = await fetch('/api/symptoms/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
            body: JSON.stringify({
              appointmentDate: st?.answers.appointmentDate || '',
              appointmentReason: st?.answers.appointmentReason || '',
              doctorUnderstanding: st?.answers.doctorUnderstanding || '',
              medicationsTried: st?.answers.medicationsTried || '',
              recentTests: st?.answers.recentTests || '',
              relevantSymptoms: []
            })
          });
          const data = await res.json();
          if (res.ok && data.pdfDataUri) {
            // Build filename: <name-or-email>-<YYYY-MM-DD>.pdf (prefer appointment date)
            const rawName = (user?.user_metadata?.full_name || user?.email || 'sympli-report').toString();
            const safeName = rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sympli-report';
            const appt = st?.answers?.appointmentDate;
            let d = new Date();
            if (appt) {
              const parsed = new Date(appt);
              if (!isNaN(parsed.getTime())) d = parsed;
            }
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const filename = `${safeName}-${yyyy}-${mm}-${dd}.pdf`;
            const ok = await robustDownload(data.pdfDataUri, filename);
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (ok) {
              if (isMobile) {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isAndroid = /Android/.test(navigator.userAgent);
                
                if (isIOS) {
                  pushAgentQuestion('Your PDF is opening in a new tab. To save it: tap the share button (square with arrow) and select "Save to Files" or "Add to Photos".');
                } else if (isAndroid) {
                  pushAgentQuestion('Your PDF is opening. If it doesn\'t download automatically, tap the three dots menu and select "Download" or "Save to device".');
                } else {
                  pushAgentQuestion('Your PDF is opening in a new tab. On mobile, you may need to use your browser\'s download option to save it to your device.');
                }
                
                // Add a direct download link for mobile users
                pushAgentQuestion('If the PDF didn\'t open, try this direct download link:', undefined, 'text');
                // Add clickable download link
                setTimeout(() => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = data.pdfDataUri;
                  downloadLink.download = filename;
                  downloadLink.textContent = '📱 Click here to download PDF';
                  downloadLink.style.display = 'block';
                  downloadLink.style.margin = '10px 0';
                  downloadLink.style.padding = '10px';
                  downloadLink.style.backgroundColor = '#007bff';
                  downloadLink.style.color = 'white';
                  downloadLink.style.textDecoration = 'none';
                  downloadLink.style.borderRadius = '5px';
                  downloadLink.style.textAlign = 'center';
                  
                  // Find the last message and append the link
                  const messagesContainer = document.querySelector('.messages-container');
                  if (messagesContainer) {
                    const lastMessage = messagesContainer.lastElementChild;
                    if (lastMessage) {
                      lastMessage.appendChild(downloadLink);
                    }
                  }
                }, 100);
              } else {
                pushAgentQuestion('Your PDF is downloading.');
              }
            } else {
              pushAgentQuestion('I generated the PDF, but your browser blocked the download. Please allow popups or try again.');
              
              // Provide direct download link as fallback
              if (isMobile) {
                pushAgentQuestion('Try this direct download link:', undefined, 'text');
                // Add clickable download link
                setTimeout(() => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = data.pdfDataUri;
                  downloadLink.download = filename;
                  downloadLink.textContent = '📱 Click here to download PDF';
                  downloadLink.style.display = 'block';
                  downloadLink.style.margin = '10px 0';
                  downloadLink.style.padding = '10px';
                  downloadLink.style.backgroundColor = '#007bff';
                  downloadLink.style.color = 'white';
                  downloadLink.style.textDecoration = 'none';
                  downloadLink.style.borderRadius = '5px';
                  downloadLink.style.textAlign = 'center';
                  
                  // Find the last message and append the link
                  const messagesContainer = document.querySelector('.messages-container');
                  if (messagesContainer) {
                    const lastMessage = messagesContainer.lastElementChild;
                    if (lastMessage) {
                      lastMessage.appendChild(downloadLink);
                    }
                  }
                }, 100);
              }
            }
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          } else {
            pushAgentQuestion('Sorry, I could not generate the PDF right now.');
            pushAgentQuestion('Try again?', ['Download PDF', 'Back to menu'], 'buttons');
          }
        } catch {
          pushAgentQuestion('Sorry, I could not generate the PDF right now.');
          pushAgentQuestion('Try again?', ['Download PDF', 'Back to menu'], 'buttons');
        }
        return;
      }
    }
    // Handle post-save choice first
    if (awaitingPostSaveRef.current && (option === 'Yes' || option === 'No')) {
      markMessageAnswered(messageId, option);
      awaitingPostSaveRef.current = false;
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      if (option === 'Yes') {
        return resetForNewLog();
      } else {
        pushAgentQuestion('All set. You can return here anytime to log more symptoms.');
        showMainMenu();
        return;
      }
    }

    // Handle main-menu style options when not from the original intro
    if (['Log a Symptom', 'Generate PDF Report', 'View Timeline'].includes(option)) {
      // Grey out the menu buttons by marking this message answered and echo the user's selection
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
      if (option === 'Log a Symptom') { return resetForNewLog(); }
      if (option === 'Generate PDF Report') { startGPFlow(); return; }
      if (option === 'View Timeline') { router.push('/timeline'); return; }
    }

    // Echo user selection for generic options only; skip for symptom/new-ongoing handled below
    if (!['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other', 'New', 'Ongoing'].includes(option)) {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
    }

    // OLD TIMELINE CONTROLS - COMMENTED OUT (replaced by dedicated Timeline page)
    // Timeline controls - handle these separately from GP flow and symptom logging
    // if (['View Recent', 'View All', 'Search', 'View More', 'Back to menu'].includes(option)) {
    //   if (option === 'Back to menu') { showMainMenu(); return; }
    //   if (option === 'Search') {
    //     awaitingTimelineSearchRef.current = true;
    //     pushAgentQuestion('Enter a keyword to search your logs:');
    //     return;
    //   }
    //   if (option === 'View More') { timelineAllCountRef.current = timelineAllCountRef.current + 10; await showTimelineInChat('all', undefined, timelineAllCountRef.current); return; }
    //   if (option === 'View All') { timelineAllCountRef.current = 5; await showTimelineInChat('all', undefined, timelineAllCountRef.current); return; }
    //   if (option === 'View Recent') { await showTimelineInChat('recent'); return; }
    // }

    // Handle main menu options
    if (['Log a Symptom', 'Generate PDF Report', 'View Timeline'].includes(option)) {
      if (option === 'View Timeline') {
        router.push('/timeline');
        return;
      }
      if (option === 'Generate PDF Report') {
        startGPFlow();
        return;
      }
      if (option === 'Log a Symptom') {
        pushAgentQuestion('What specific symptom would you like to log?', ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'], 'buttons');
        return;
      }
    }

    // GP flow controls (only when in GP flow state)
    if (gpFlowStateRef.current && ['Confirm', 'Re-record', 'Download PDF', 'Edit anything', 'GP Summary', 'Triage Form Helper', 'Pre-Appointment Guide', 'In-Appointment Sheet'].includes(option)) {
      if (option === 'Confirm' && gpFlowStateRef.current) {
        const payload = {
          appointmentReason: gpFlowStateRef.current.answers.appointmentReason || '',
          doctorUnderstanding: gpFlowStateRef.current.answers.doctorUnderstanding || '',
          medicationsTried: gpFlowStateRef.current.answers.medicationsTried || '',
          recentTests: gpFlowStateRef.current.answers.recentTests || '',
          relevantSymptoms: []
        };
        // Preview sections
        setMessages(prev => [...prev,
          { id: Date.now().toString(), type: 'agent', content: `Preview – Executive Summary and Most Recent Entries will be generated based on your logs.`, timestamp: new Date() },
          { id: (Date.now()+1).toString(), type: 'agent', content: `What type of document would you like to generate?`, timestamp: new Date(), isQuestion: true, inputType: 'buttons', options: ['GP Summary', 'Triage Form Helper', 'Pre-Appointment Guide', 'In-Appointment Sheet', 'Back to menu'] }
        ]);
        return;
      }
      if (option === 'Re-record') { gpFlowStateRef.current = { step: 0, answers: {} }; askNextGPQuestion(0); return; }
      if (['Download PDF', 'GP Summary', 'Triage Form Helper', 'Pre-Appointment Guide', 'In-Appointment Sheet'].includes(option)) {
        setIsLoading(true);
        try {
          let token = await getAuthToken();
          const st = gpFlowStateRef.current;
          
          // Map option names to document types
          const documentTypeMap: Record<string, string> = {
            'Download PDF': 'gp-summary',
            'GP Summary': 'gp-summary',
            'Triage Form Helper': 'triage-form',
            'Pre-Appointment Guide': 'pre-appointment',
            'In-Appointment Sheet': 'in-appointment'
          };
          
          let res = await fetch('/api/symptoms/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
            body: JSON.stringify({
              appointmentDate: st?.answers.appointmentDate || '',
              appointmentReason: st?.answers.appointmentReason || '',
              doctorUnderstanding: st?.answers.doctorUnderstanding || '',
              medicationsTried: st?.answers.medicationsTried || '',
              recentTests: st?.answers.recentTests || '',
              relevantSymptoms: [],
              documentType: documentTypeMap[option] || 'gp-summary'
            })
          });
          // If unauthorized, refresh session and retry once
          if (res.status === 401) {
            try {
              await supabase.auth.refreshSession();
              const { data: { session } } = await supabase.auth.getSession();
              token = session?.access_token || token;
              res = await fetch('/api/symptoms/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
                body: JSON.stringify({
                  appointmentDate: st?.answers.appointmentDate || '',
                  appointmentReason: st?.answers.appointmentReason || '',
                  doctorUnderstanding: st?.answers.doctorUnderstanding || '',
                  medicationsTried: st?.answers.medicationsTried || '',
                  recentTests: st?.answers.recentTests || '',
                  relevantSymptoms: []
                })
              });
            } catch {}
          }
          const data = await res.json();
          if (res.ok && data.pdfDataUri) {
            // Build filename: <name-or-email>-<YYYY-MM-DD>.pdf (prefer appointment date)
            const rawName = (user?.user_metadata?.full_name || user?.email || 'sympli-report').toString();
            const safeName = rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sympli-report';
            const appt = st?.answers?.appointmentDate;
            let d = new Date();
            if (appt) {
              const parsed = new Date(appt);
              if (!isNaN(parsed.getTime())) d = parsed;
            }
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const filename = `${safeName}-${yyyy}-${mm}-${dd}.pdf`;
            const ok = await robustDownload(data.pdfDataUri, filename);
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (ok) {
              if (isMobile) {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isAndroid = /Android/.test(navigator.userAgent);
                
                if (isIOS) {
                  pushAgentQuestion('Your PDF is opening in a new tab. To save it: tap the share button (square with arrow) and select "Save to Files" or "Add to Photos".');
                } else if (isAndroid) {
                  pushAgentQuestion('Your PDF is opening. If it doesn\'t download automatically, tap the three dots menu and select "Download" or "Save to device".');
                } else {
                  pushAgentQuestion('Your PDF is opening in a new tab. On mobile, you may need to use your browser\'s download option to save it to your device.');
                }
                
                // Add a direct download link for mobile users
                pushAgentQuestion('If the PDF didn\'t open, try this direct download link:', undefined, 'text');
                // Add clickable download link
                setTimeout(() => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = data.pdfDataUri;
                  downloadLink.download = filename;
                  downloadLink.textContent = '📱 Click here to download PDF';
                  downloadLink.style.display = 'block';
                  downloadLink.style.margin = '10px 0';
                  downloadLink.style.padding = '10px';
                  downloadLink.style.backgroundColor = '#007bff';
                  downloadLink.style.color = 'white';
                  downloadLink.style.textDecoration = 'none';
                  downloadLink.style.borderRadius = '5px';
                  downloadLink.style.textAlign = 'center';
                  
                  // Find the last message and append the link
                  const messagesContainer = document.querySelector('.messages-container');
                  if (messagesContainer) {
                    const lastMessage = messagesContainer.lastElementChild;
                    if (lastMessage) {
                      lastMessage.appendChild(downloadLink);
                    }
                  }
                }, 100);
              } else {
                pushAgentQuestion('Your PDF is downloading.');
              }
            } else {
              pushAgentQuestion('I generated the PDF, but your browser blocked the download. Please allow popups or try again.');
              
              // Provide direct download link as fallback
              if (isMobile) {
                pushAgentQuestion('Try this direct download link:', undefined, 'text');
                // Add clickable download link
                setTimeout(() => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = data.pdfDataUri;
                  downloadLink.download = filename;
                  downloadLink.textContent = '📱 Click here to download PDF';
                  downloadLink.style.display = 'block';
                  downloadLink.style.margin = '10px 0';
                  downloadLink.style.padding = '10px';
                  downloadLink.style.backgroundColor = '#007bff';
                  downloadLink.style.color = 'white';
                  downloadLink.style.textDecoration = 'none';
                  downloadLink.style.borderRadius = '5px';
                  downloadLink.style.textAlign = 'center';
                  
                  // Find the last message and append the link
                  const messagesContainer = document.querySelector('.messages-container');
                  if (messagesContainer) {
                    const lastMessage = messagesContainer.lastElementChild;
                    if (lastMessage) {
                      lastMessage.appendChild(downloadLink);
                    }
                  }
                }, 100);
              }
            }
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          } else {
            pushAgentQuestion('Sorry, I could not generate the PDF right now.');
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          }
        } catch {
          pushAgentQuestion('Sorry, I could not generate the PDF right now.');
          pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
        } finally {
          setIsLoading(false);
        }
        return;
      }
      if (option === 'Edit anything') { gpFlowStateRef.current = { step: 0, answers: gpFlowStateRef.current?.answers || {} }; askNextGPQuestion(0); return; }
    }

    const symptomTypeMap: Record<string, SymptomData['symptomType']> = {
      'Headache': 'headache', 'Fatigue': 'fatigue', 'Side Effect': 'side_effect', 'Pregnancy': 'pregnancy', 'Other': 'other'
    };

    // Step 1: Symptom type selection
    if (['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'].includes(option)) {
      // Mark the symptom selection question as answered and record user choice
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
      const selectedType = symptomTypeMap[option];
      setCurrentSymptomData(prev => ({ ...prev, symptomType: selectedType }));
      // Ask for user description after symptom type selection
      awaitingUserDescriptionRef.current = true;
      pushAgentQuestion('Please describe the symptom as much as you can, in your own words.', undefined, 'textarea');
      return;
    }

    // Helper function to proceed to the next question based on symptom type
    const proceedToNextQuestion = () => {
      console.log('🔄 proceedToNextQuestion called, symptomType:', currentSymptomData.symptomType);
      if (currentSymptomData.symptomType === 'other') {
        awaitingOtherNameRef.current = true;
        pushAgentQuestion('Which symptom would you like to log? Please name it in your own words.', undefined, 'text');
      } else {
        console.log('🔄 Asking New/Ongoing question');
        pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
        questionIndexRef.current = 0; // we will skip API base later
        setCurrentQuestionIndex(0);
      }
    };

    // Step 1.5: Date selection
    if (awaitingDateSelectionRef.current && ['Today', 'Previous Date'].includes(option)) {
      console.log('🗓️ Date selection clicked:', option, 'awaitingDateSelectionRef:', awaitingDateSelectionRef.current);
      awaitingDateSelectionRef.current = false;
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
      
      if (option === 'Previous Date') {
        // Ask for the specific date
        pushAgentQuestion('What date did this symptom occur? (e.g., "3 days ago", "last Monday", "15th August")', undefined, 'text');
        return;
      } else {
        // Today - proceed to new/ongoing question in new flow
        console.log('🗓️ Proceeding to new/ongoing question for Today selection');
        questionIndexRef.current = 3;
        setCurrentQuestionIndex(3);
        pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
      }
      return;
    }

    // Step 2: New/Ongoing selection
    if (['New', 'Ongoing'].includes(option)) {
      // Mark current question as answered and record user choice
      markMessageAnswered(messageId, option);
      const userMsg = { id: Date.now().toString(), type: 'user' as const, content: option, timestamp: new Date() };
      const localMessages = [...messages, userMsg];
      setMessages(prev => [...prev, userMsg]);
      
      // Set default symptom type to 'other' for new flow if not already set
      const updatedData = { 
        ...currentSymptomData, 
        isNew: option.toLowerCase() as 'new' | 'ongoing',
        symptomType: currentSymptomData.symptomType || 'other'
      };
      setCurrentSymptomData(updatedData);
      
      if (option === 'New') {
        // Step 2A: Free Description for new symptoms
        questionIndexRef.current = 4;
        setCurrentQuestionIndex(4);
        pushAgentQuestion('Please describe your symptom in as much detail as you can, in your own words.', undefined, 'textarea');
      } else {
        // Step 2B: Comparison flow for ongoing symptoms
        setIsLoading(true);
        pushAgentQuestion('Checking for similar previous symptoms...');
        const asked = await checkPreviousSymptoms(true);
        if (asked) {
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        // If no previous symptoms found, ask for description
        questionIndexRef.current = 4;
        setCurrentQuestionIndex(4);
        pushAgentQuestion('Please describe your symptom in as much detail as you can, in your own words.', undefined, 'textarea');
      }
      return;
    }

    // Default: continue
    await getNextQuestion();
  };

  const handleTextSubmit = async () => {
    if (!userInput.trim() || isLoading) return;
    const text = userInput.trim();

    // Global commands
    if (/^(exit|quit|back|menu)$/i.test(text)) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: text, timestamp: new Date() }]);
      showMainMenu();
      setUserInput('');
      return;
    }

    // Grey out the most recent unanswered agent question (if any) and build a local history snapshot
    const updated = [...messages];
    for (let i = updated.length - 1; i >= 0; i--) {
      const m = updated[i];
      if (m.type === 'agent' && m.isQuestion && !m.answered) {
        updated[i] = { ...m, answered: true } as any;
        break;
      }
    }
    const safeText = (() => {
      try {
        if (typeof text === 'string') {
          return text;
        } else if (text && typeof text === 'object') {
          return JSON.stringify(text, null, 2);
        } else {
          return String(text || '');
        }
      } catch (error) {
        console.error('Error processing text in handleTextSubmit:', error, text);
        return 'Error processing text';
      }
    })();
    const userMsg: ChatMessage = { id: newId(), type: 'user', content: safeText, timestamp: new Date() };
    const localMessages = [...updated, userMsg];
    setMessages(localMessages);
    setChatForSave(prev => [...prev, { role: 'user', content: safeText }]);
    // Capture structured fields based on the last question asked
    try {
      const lastQ = (() => {
        for (let i = updated.length - 1; i >= 0; i--) {
          const m = updated[i];
          if (m.type === 'agent' && m.isQuestion) return m.content || '';
        }
        return '';
      })().toString().toLowerCase();
      // Severity extraction
      if (/\b(0\s*[–-]?\s*10|scale|severity)\b/.test(lastQ)) {
        const m = text.match(/\b(10|[0-9])\b/);
        if (m) {
          setCurrentSymptomData(prev => ({
            ...prev,
            socratesData: {
              site: prev.socratesData?.site || '',
              onset: prev.socratesData?.onset || '',
              character: prev.socratesData?.character || '',
              radiation: prev.socratesData?.radiation || '',
              associations: prev.socratesData?.associations || '',
              timeCourse: prev.socratesData?.timeCourse || '',
              exacerbatingFactors: prev.socratesData?.exacerbatingFactors || '',
              severity: String(m[1]),
              additionalContext: prev.socratesData?.additionalContext || ''
            }
          }));
        }
      }
      // Functional impact capture
      if (/\b(affect|impact|daily|work|sleep|exercise)\b/.test(lastQ)) {
        setCurrentSymptomData(prev => ({ ...prev, functionalImpact: text }));
      }
    } catch {}

    // OLD TIMELINE SEARCH - COMMENTED OUT (replaced by dedicated Timeline page)
    // If awaiting a timeline search query
    // if (awaitingTimelineSearchRef.current) {
    //   awaitingTimelineSearchRef.current = false;
    //   setUserInput('');
    //   await showTimelineInChat('search', text);
    //   return;
    // }

    // GP PDF 5-question flow
    if (gpFlowStateRef.current) {
      const st = gpFlowStateRef.current;
      const keys = ['appointmentDate','appointmentReason','doctorUnderstanding','medicationsTried','recentTests'];
      const key = keys[st.step];
      st.answers[key] = text;
      st.step += 1;
      setUserInput('');
      if (st.step < keys.length) {
        askNextGPQuestion(st.step);
      } else {
        // Confirm answers
        const summary = `You said:\n• Date: ${st.answers.appointmentDate || '—'}\n• Reason: ${st.answers.appointmentReason || '—'}\n• What GP should understand: ${st.answers.doctorUnderstanding || '—'}\n• Meds/home remedies tried: ${st.answers.medicationsTried || '—'}\n• Tests/measurements: ${st.answers.recentTests || '—'}\nIs that correct?`;
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: summary, timestamp: new Date(), isQuestion: true, options: ['Confirm', 'Re-record', 'Back to menu'], inputType: 'buttons' }]);
      }
      return;
    }

    // Step 1: Handle initial symptom description
    if (questionIndexRef.current === 0 && !awaitingUserDescriptionRef.current) {
      // Store the raw symptom description
      setCurrentSymptomData(prev => ({ 
        ...prev, 
        userDescription: text,
        rawTranscript: text
      }));
      setUserInput('');
      
      // Step 1.2: Ask for title
      questionIndexRef.current = 1;
      setCurrentQuestionIndex(1);
      pushAgentQuestion('What would you like to title this log? (e.g., "Migraine attack", "Stomach pain")', undefined, 'text');
      return;
    }

    // Step 1.2: Handle log title
    if (questionIndexRef.current === 1) {
      setCurrentSymptomData(prev => ({ 
        ...prev, 
        customName: text
      }));
      setUserInput('');
      
      // Step 1.3: Ask about date
      questionIndexRef.current = 2;
      setCurrentQuestionIndex(2);
      awaitingDateSelectionRef.current = true;
      pushAgentQuestion('Is this for today or a previous date?', ['Today', 'Previous Date'], 'buttons');
      return;
    }

    // Step 2A/2B: Handle free description input
    if (questionIndexRef.current === 4) {
      // Store raw transcript and process with proper grammar
      const processedTranscript = await processTranscriptWithGrammar(text);
      
      setCurrentSymptomData(prev => ({ 
        ...prev, 
        userDescription: text,
        rawTranscript: text,
        processedTranscript: processedTranscript
      }));
      setUserInput('');
      
      // Step 3: Subcategorize content and ask follow-up questions
      questionIndexRef.current = 5;
      setCurrentQuestionIndex(5);
      await getNextQuestion(5);
      return;
    }

    // Handle user description input (for ongoing symptoms - legacy)
    if (awaitingUserDescriptionRef.current) {
      awaitingUserDescriptionRef.current = false;
      
      // Store raw transcript and process with proper grammar
      const processedTranscript = await processTranscriptWithGrammar(text);
      
      setCurrentSymptomData(prev => ({ 
        ...prev, 
        userDescription: text,
        rawTranscript: text,
        processedTranscript: processedTranscript
      }));
      setUserInput('');
      
      // Proceed to follow-up questions (date already handled in main flow)
      questionIndexRef.current = 5;
      setCurrentQuestionIndex(5);
      await getNextQuestion(5);
      return;
    }

    // Handle date input for previous symptoms (when user types a date)
    if (awaitingDateSelectionRef.current) {
      awaitingDateSelectionRef.current = false;
      // Parse the date input and store it
      const parsedDate = parseDateInput(text);
      setCurrentSymptomData(prev => ({ ...prev, customDate: parsedDate }));
      setUserInput('');
      
      // Step 1.4: Ask about new/ongoing status
      questionIndexRef.current = 3;
      setCurrentQuestionIndex(3);
      pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
      return;
    }

    // Capture custom name for 'Other' and propose a clinical term then confirm
    if (awaitingOtherNameRef.current) {
      awaitingOtherNameRef.current = false;
      const lowered = text.toLowerCase();
      const mappedType: SymptomData['symptomType'] | null =
        lowered.includes('pregnan') ? 'pregnancy' : null;
      const canonicalise = async (s: string): Promise<string> => {
        try {
          const resp = await fetch('/api/symptoms/canonicalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: s }) });
          const data = await resp.json();
          return String(data?.term || s).trim();
        } catch { return s.toLowerCase().trim(); }
      };
      const candidate = await canonicalise(text);
      if (mappedType) setCurrentSymptomData(prev => ({ ...prev, symptomType: mappedType }));
      awaitingOtherConfirmRef.current = { candidate };
      setUserInput('');
      pushAgentQuestion(`Do you want me to log this as “${candidate}”?`, ['Yes', 'No'], 'buttons');
      return;
    }

    updateSymptomData(text);
    setUserInput('');
    await getNextQuestion(undefined, localMessages);
  };

  // Helper functions for timeline organization
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(d.setDate(diff));
  };

  const formatWeekRange = (weekStart: Date): string => {
    const weekEnd = getWeekEnd(weekStart);
    const startStr = weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const endStr = weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${startStr} - ${endStr}`;
  };

  const getWeekOptions = (): Array<{ value: string; label: string }> => {
    const options = [];
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    
    // Current week
    options.push({ value: 'current', label: `This week (${formatWeekRange(currentWeekStart)})` });
    
    // Previous weeks
    for (let i = 1; i <= 8; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      options.push({ 
        value: weekStart.toISOString(), 
        label: `${i === 1 ? 'Last week' : `${i} weeks ago`} (${formatWeekRange(weekStart)})` 
      });
    }
    
    return options;
  };

  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  const groupLogsByWeek = (logs: any[]): Record<string, any[]> => {
    const grouped: Record<string, any[]> = {};
    
    logs.forEach(log => {
      const logDate = new Date(log.created_at);
      const weekStart = getWeekStart(logDate);
      const weekKey = weekStart.toISOString();
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(log);
    });
    
    // Sort logs within each week by date (newest first)
    Object.keys(grouped).forEach(weekKey => {
      grouped[weekKey].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    
    return grouped;
  };

  const filterLogsBySymptom = (logs: any[], symptomFilter: string): any[] => {
    if (symptomFilter === 'all') return logs;
    
    return logs.filter(log => {
      const symptomType = log.symptom_type || '';
      const symptomName = log.symptom_name || '';
      const customName = log.symptom_data?.customName || '';
      
      return symptomType === symptomFilter || 
             symptomName.toLowerCase().includes(symptomFilter.toLowerCase()) ||
             customName.toLowerCase().includes(symptomFilter.toLowerCase());
    });
  };

  const loadTimelineLogs = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/symptoms/logs?limit=1000', { 
        headers: { 'Authorization': `Bearer ${token || ''}` } 
      });
      const data = await res.json();
      const logs = data.logs || [];
      
      // Extract unique symptom groups
      const groups = new Set<string>();
      logs.forEach(log => {
        const type = log.symptom_type || 'other';
        if (type !== 'other') {
          groups.add(type);
        }
      });
      setSymptomGroups(Array.from(groups).sort());
      
      setTimelineLogs(logs);
    } catch (error) {
      console.error('Error loading timeline logs:', error);
    }
  };

  // Helper function to parse date input
  const parseDateInput = (input: string): string => {
    const text = input.toLowerCase().trim();
    const now = new Date();
    
    // Handle relative dates
    if (text.includes('today')) return now.toISOString();
    if (text.includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString();
    }
    if (text.includes('day ago') || text.includes('days ago')) {
      const match = text.match(/(\d+)\s*days?\s*ago/);
      if (match) {
        const days = parseInt(match[1]);
        const date = new Date(now);
        date.setDate(date.getDate() - days);
        return date.toISOString();
      }
    }
    if (text.includes('week ago') || text.includes('weeks ago')) {
      const match = text.match(/(\d+)\s*weeks?\s*ago/);
      if (match) {
        const weeks = parseInt(match[1]);
        const date = new Date(now);
        date.setDate(date.getDate() - (weeks * 7));
        return date.toISOString();
      }
    }
    if (text.includes('month ago') || text.includes('months ago')) {
      const match = text.match(/(\d+)\s*months?\s*ago/);
      if (match) {
        const months = parseInt(match[1]);
        const date = new Date(now);
        date.setMonth(date.getMonth() - months);
        return date.toISOString();
      }
    }
    
    // Handle day names
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < 7; i++) {
      if (text.includes(dayNames[i])) {
        const targetDay = i === 0 ? 1 : i; // Monday = 1, Sunday = 0
        const currentDay = now.getDay();
        const daysDiff = (currentDay - targetDay + 7) % 7;
        const date = new Date(now);
        date.setDate(date.getDate() - daysDiff);
        return date.toISOString();
      }
    }
    
    // Default to today if we can't parse
    return now.toISOString();
  };

  const updateSymptomData = (input: string) => {
    setCurrentSymptomData(prev => {
      const updated = { ...prev };
      const idx = questionIndexRef.current;
      if (idx === 1) updated.isNew = input.toLowerCase().includes('new') ? 'new' : 'ongoing';
      else if (idx === 2) updated.description = input;
      else if (idx > 2) {
        const llm = [...prev.llmResponses];
        llm[idx - 3] = input;
        updated.llmResponses = llm;
      }
      return updated;
    });
  };

  const getNextQuestion = async (
    overrideIndex?: number,
    overrideMessages?: ChatMessage[],
    overrideSymptomData?: SymptomData
  ) => {
    if (isLoading) return; // prevent concurrent
    try { questionAbortRef.current?.abort(); } catch {}
    const ac = new AbortController();
    questionAbortRef.current = ac;
    setIsLoading(true);
    const idx = overrideIndex !== undefined ? overrideIndex : questionIndexRef.current;
    try {
      if (idx === 1 && currentSymptomData.isNew === 'ongoing' && user?.id) await checkPreviousSymptoms();

      const response = await fetch('/api/symptoms/chat-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAuthToken()}` },
        body: JSON.stringify({
          currentSymptomData: overrideSymptomData ? overrideSymptomData : currentSymptomData,
          currentQuestionIndex: idx,
          previousMessages: overrideMessages || messages
        }),
        signal: ac.signal
      });

      if (response.ok) {
        const data = await response.json();
        pushAgentQuestion(data.question, data.options, data.inputType || 'text');
        questionIndexRef.current = idx + 1;
        setCurrentQuestionIndex(questionIndexRef.current);
        if (data.isComplete) await completeSymptomLog();
      } else {
        // No fallbacks; surface API error to user
        console.error('Chat-question API returned non-OK status');
        pushAgentQuestion('API error');
      }
    } catch (e: any) {
      // No fallbacks; surface API error to user
      if (e?.name === 'AbortError') {
        // Aborted due to newer input, ignore
      } else {
        console.error('Chat-question API error');
        pushAgentQuestion('API error');
      }
    } finally {
      setIsLoading(false);
      questionAbortRef.current = null;
    }
  };

  const checkPreviousSymptoms = async (offerConfirm?: boolean) => {
    try {
      console.log('🔍 checkPreviousSymptoms called with:', {
        offerConfirm,
        symptomType: currentSymptomData.symptomType,
        userId: user?.id
      });
      
      const { data: previousSymptoms, error } = await supabase
        .from('symptom_logs')
        .select('id, created_at, symptom_type, symptom_name, severity_scale, functional_impact, triggers, patterns, treatment_response, progress_description, description, symptom_data, additional_context')
        .eq('user_id', user?.id)
        .eq('symptom_type', currentSymptomData.symptomType)
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('🔍 Previous symptoms query result:', { previousSymptoms, error });
      
      if (!error && previousSymptoms && previousSymptoms.length > 0) {
        // Get the most recent log for ongoing flow
        const mostRecent = previousSymptoms[0];
        const lastDate = new Date(mostRecent.created_at).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
        
        // Extract presenting complaint summary (1-2 lines)
        const presentingComplaint = mostRecent.symptom_data?.processedTranscript || 
                                   mostRecent.additional_context?.processed_transcript ||
                                   mostRecent.description || 
                                   mostRecent.symptom_name || 
                                   'symptoms';
        
        // Create a short summary (1-2 lines, max 120 chars)
        const summary = presentingComplaint.length > 120 
          ? presentingComplaint.substring(0, 117) + '...'
          : presentingComplaint;
        
        if (offerConfirm) {
          // New ongoing flow: Reference last log and ask for changes
          setMessages(prev => [
            ...prev,
            { 
              id: newId(), 
              type: 'agent', 
              content: `Last time you logged ${mostRecent.symptom_name || currentSymptomData.symptomType} was on ${lastDate}. You described it as: "${summary}"`, 
              timestamp: new Date() 
            },
            { 
              id: newId(), 
              type: 'agent', 
              content: 'Has anything changed since then? Please describe in your own words.', 
              timestamp: new Date(), 
              isQuestion: true, 
              inputType: 'textarea' 
            }
          ]);
          
          // Set flag to indicate we're in ongoing flow
          awaitingUserDescriptionRef.current = true;
          return true;
        } else {
          setMessages(prev => [...prev, { id: newId(), type: 'system', content: `Found ${previousSymptoms.length} previous entries for ${currentSymptomData.symptomType}.`, timestamp: new Date() }]);
        }
      }
    } catch (error) {
      console.error('Error checking previous symptoms:', error);
    }
    return false;
  };

  const completeSymptomLog = async () => {
    try {
      console.log('🔍 Debug - currentSymptomData:', currentSymptomData);
      console.log('🔍 Debug - symptomType being sent:', currentSymptomData.symptomType);
      
      // Extract Q&A from session messages first
      const sessionMessages = messages.slice(sessionStartIdxRef.current);
      type QA = { label: string; answer: string };
      const inferLabel = (q: string): string | null => {
        const s = q.toLowerCase();
        if (/\bwhere|location|site\b/.test(s)) return 'Location';
        if (/\bonset|when did|start|how long|duration\b/.test(s)) return 'Onset';
        if (/\bcharacter|type|feel like|describe\b/.test(s)) return 'Character';
        if (/\bradiat/.test(s)) return 'Radiation';
        if (/\bassociated|other symptoms|with it\b/.test(s)) return 'Associated Symptoms';
        if (/\bpattern|timing|intermittent|constant\b/.test(s)) return 'Pattern';
        if (/\btrigger|reliev|what makes.*(better|worse)|helps\b/.test(s)) return 'Triggers/Relievers';
        if (/\bseverity|0\s*[-–—]\s*10|0–10|0-10\b/.test(s)) return 'Severity';
        if (/\bimpact|affect.*(work|sleep|exercise|daily)\b/.test(s)) return 'Functional Impact';
        if (/\bemotion|feel emotionally|mood\b/.test(s)) return 'Emotional Impact';
        return null;
      };
      const qa: QA[] = [];
      for (let i = 0; i < sessionMessages.length; i++) {
        const m = sessionMessages[i];
        if (m.type === 'agent' && m.isQuestion) {
          const label = inferLabel(m.content || '');
          if (!label) continue;
          const answer = (() => {
            for (let j = i + 1; j < sessionMessages.length; j++) {
              const n = sessionMessages[j];
              if (n.type === 'user') return n.content.trim();
              if (n.type === 'agent' && n.isQuestion) break;
            }
            return '';
          })();
          if (answer) qa.push({ label, answer });
        }
      }
      
      // Generate tags
      const tags: string[] = [];
      const typeTag = (currentSymptomData.customName || currentSymptomData.symptomType || 'symptom').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (typeTag) tags.push(`#${typeTag}`);
      
      // Severity tag - check both Q&A and socratesData
      const sev = (() => {
        // First try Q&A
        const sevQA = qa.find(x => x.label === 'Severity');
        if (sevQA) {
          const n = parseInt(sevQA.answer.match(/\b(\d{1,2})\b/)?.[1] || '');
          if (!isNaN(n)) {
            if (n <= 3) return '#mild';
            if (n <= 6) return '#moderate';
            return '#severe';
          }
        }
        // Fallback to socratesData
        if (currentSymptomData.socratesData?.severity) {
          const n = parseInt(currentSymptomData.socratesData.severity);
          if (!isNaN(n)) {
            if (n <= 3) return '#mild';
            if (n <= 6) return '#moderate';
            return '#severe';
          }
        }
        return '';
      })();
      if (sev) tags.push(sev);
      
      // Impact tags
      if (qa.find(x => x.label === 'Functional Impact')) tags.push('#functional-impact');
      if (qa.find(x => x.label === 'Emotional Impact')) tags.push('#emotional-impact');
      
      // Status tag
      const statusTag = currentSymptomData.isNew === 'new' ? '#new-symptom' : '#ongoing-symptom';
      tags.push(statusTag);
      
      // System pattern tag - check both Q&A answers and main description
      const presenting = (currentSymptomData.processedTranscript || currentSymptomData.description || '').trim();
      const sysTag = (() => {
        const allText = [
          presenting,
          currentSymptomData.description || '',
          currentSymptomData.userDescription || '',
          ...qa.map(x => x.answer)
        ].join(' ').toLowerCase();
        
        if (/cough|breath|wheeze|chest/.test(allText)) return '#respiratory-pattern';
        if (/stomach|abdominal|nausea|vomit|bowel|diarrhoea|diarrhea/.test(allText)) return '#digestive-pattern';
        if (/knee|hip|shoulder|neck|back|leg|arm|joint|muscle/.test(allText)) return '#musculoskeletal-pattern';
        if (/headache|migraine|head/.test(allText)) return '#neurological-pattern';
        if (/fatigue|tired|exhaust/.test(allText)) return '#fatigue-pattern';
        if (/pain|ache|discomfort|sore/.test(allText)) return '#pain-pattern';
        if (/swelling|inflammation|stiffness/.test(allText)) return '#inflammatory-pattern';
        if (/anxiety|depression|stress|mood/.test(allText)) return '#mental-health-pattern';
        if (/sleep|insomnia|rest/.test(allText)) return '#sleep-pattern';
        if (/appetite|hunger|nausea/.test(allText)) return '#appetite-pattern';
        return '';
      })();
      if (sysTag) tags.push(sysTag);
      
      const response = await fetch('/api/symptoms/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAuthToken()}` },
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
          },
          tags: tags,
          chatTranscript: chatForSave.slice(-200) // cap size
        })
      });
      if (response.ok) {
        // Build a concise summary of the just-logged symptom
        const displaySymptom = (() => {
          if (currentSymptomData.symptomType === 'other' && currentSymptomData.customName) return currentSymptomData.customName;
          const map: Record<string, string> = { headache: 'Headache', fatigue: 'Fatigue', side_effect: 'Side effect', pregnancy: 'Pregnancy', other: 'Other' };
          return map[currentSymptomData.symptomType] || 'Symptom';
        })();
        const status = currentSymptomData.isNew === 'new' ? 'new' : 'ongoing';
        const desc = (currentSymptomData.description || '').trim();
        const impact = (currentSymptomData.functionalImpact || '').trim();
        const triggers = (currentSymptomData.triggers || '').trim();
        const pattern = (currentSymptomData.patterns || '').trim();
        const treatment = (currentSymptomData.treatmentResponse || '').trim();
        const progress = (currentSymptomData.progress || '').trim();
        const recentNotes = (() => {
          const arr = currentSymptomData.llmResponses || [];
          const slice = arr.slice(-3).filter(Boolean);
          return slice.length ? slice.map((s) => `- ${String(s).trim()}`).join('\n') : '';
        })();
        const lines: string[] = [];
        lines.push(`Summary of this log:`);
        lines.push(`• Symptom: ${displaySymptom} (${status})`);
        if (desc) lines.push(`• Description: ${desc}`);
        if (impact) lines.push(`• Impact: ${impact}`);
        if (triggers) lines.push(`• Triggers: ${triggers}`);
        if (pattern) lines.push(`• Pattern: ${pattern}`);
        if (treatment) lines.push(`• Treatment response: ${treatment}`);
        if (progress) lines.push(`• Progress: ${progress}`);
        if (recentNotes) {
          lines.push('• Recent notes:');
          lines.push(recentNotes);
        }
        const summaryText = lines.join('\n');
        // Build Final Log Format per spec using chat history since the current session start
        // Presenting complaint - use processed transcript if available, otherwise fall back to description
        const presenting = (currentSymptomData.processedTranscript || currentSymptomData.description || '').trim();
        const pc = presenting ? presenting.charAt(0).toUpperCase() + presenting.slice(1) : (currentSymptomData.customName || displaySymptom);
        const ts = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '');
        const normalise = (text: string): string => {
          const t = String(text || '').trim();
          if (!t) return t;
          const lower = t.toLowerCase();
          if (['no', 'none', 'nil', 'n/a'].includes(lower)) return 'None';
          let fixed = t
            .replace(/\ba\s*onth\b/gi, 'a month')
            .replace(/\bteh\b/gi, 'the')
            .replace(/\bsevr?e\b/gi, 'severe');
          if (/[^a-zA-Z0-9\s\-,:.'()]/.test(fixed)) return `"${t}"`;
          return fixed;
        };
        const followupLines = qa.map(q => `- ${q.label}: ${normalise(q.answer)}`);
        const finalLog = [
          'Final Log Format (Structured, Chat-Generated)',
          '',
          `Title: ${currentSymptomData.customName || displaySymptom}`,
          `Date: ${currentSymptomData.customDate ? new Date(currentSymptomData.customDate).toLocaleDateString('en-GB') : 'Today'}`,
          `Status: ${currentSymptomData.isNew === 'new' ? 'New' : 'Ongoing'}`,
          '',
          'Presenting Complaint:',
          `"${pc}"`,
          '',
          '---',
          '',
          'Follow-Up Summary:',
          ...followupLines,
          '',
          '---',
          'Tags:',
          tags.join(' '),
          '',
          '---',
          'Attachments:',
          'None',
          '',
          '---',
          '✅ Confirmed by User: Yes',
          '✅ Consent Given: Yes',
          `🕒 Timestamp: ${ts} BST`,
          '',
          '---'
        ].join('\n');
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: finalLog, timestamp: new Date() }]);

        awaitingPostSaveRef.current = true;
        pushAgentQuestion('Thank you! Your symptom has been logged successfully. Would you like to log another?', ['Yes', 'No'], 'buttons');
      } else {
        pushAgentQuestion('Sorry, there was an error saving your symptom. Please try again.');
      }
    } catch {
      pushAgentQuestion('Sorry, there was an error saving your symptom. Please try again.');
    }
  };

  const getAuthToken = async () => {
    if (propToken) return propToken;
    try { const { data: { session } } = await supabase.auth.getSession(); if (session?.access_token) return session.access_token; } catch {}
    if (typeof window !== 'undefined') { const t = localStorage.getItem('authToken'); if (t) return t; }
    return undefined;
  };

  const robustDownload = async (dataUri: string, filename: string): Promise<boolean> => {
    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    console.log('📱 Mobile detection:', { isMobile, isIOS, isAndroid });
    
    try {
      // Method 1: Direct download (works on desktop)
      if (!isMobile) {
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      }
    } catch (error) {
      console.log('❌ Direct download failed:', error);
    }
    
    try {
      // Method 2: Blob download with mobile-specific handling
      const resp = await fetch(dataUri);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      
      console.log('📄 Blob created:', { size: blob.size, type: blob.type });
      
      if (isMobile) {
        // For iOS, try to open in new tab first
        if (isIOS) {
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            // Show instructions for iOS users
            setTimeout(() => {
              alert('PDF opened in new tab. To save: tap the share button (square with arrow) and select "Save to Files" or "Add to Photos".');
            }, 1000);
            return true;
          }
        }
        
        // For Android, try direct download first
        if (isAndroid) {
          try {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            a.setAttribute('target', '_blank');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return true;
          } catch (error) {
            console.log('❌ Android direct download failed:', error);
          }
        }
        
        // Fallback: open in new tab for all mobile
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          setTimeout(() => {
            alert('PDF opened in new tab. Please use your browser\'s download option to save the PDF to your device.');
          }, 500);
          return true;
        }
      }
      
      // Desktop fallback: regular blob download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (error) {
      console.log('❌ Blob download failed:', error);
    }
    
    try {
      // Method 3: Open data URI in new tab (last resort)
      const newWindow = window.open(dataUri, '_blank');
      if (newWindow) {
        if (isMobile) {
          setTimeout(() => {
            alert('PDF opened in new tab. Please use your browser\'s download option to save the PDF to your device.');
          }, 500);
        }
        return true;
      }
    } catch (error) {
      console.log('❌ New tab open failed:', error);
    }
    
    return false;
  };

  // Voice recording
  const startRecording = async () => {
    try {
      setMicError(null);
      setIsRecording(true); // Set immediately to show feedback
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.start(100); // Collect data every 100ms for better responsiveness
      updateAudioLevel();
    } catch (err) {
      console.error('Recording error:', err);
      setMicError('Microphone permission denied or unavailable');
      setIsRecording(false);
    }
  };
  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
    setIsRecording(false);
  };
  const toggleRecording = async () => {
    if (isRecording || isTranscribing) {
      stopRecording();
    } else {
      await startRecording();
    }
  };
  const transcribeAudio = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      const form = new FormData();
      form.append('audio', new File([blob], 'recording.webm', { type: 'audio/webm' }));
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setMicError(data.error || 'Transcription failed');
        return;
      }
      setUserInput(prev => (prev ? prev + ' ' : '') + data.text);
    } catch (err) {
      console.error('Transcription error:', err);
      setMicError('Transcription error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isAnsweredQuestion = !!message.isQuestion && !!message.answered;
    const bubbleCls = isUser
      ? 'bg-white border border-gray-300'
      : (isAnsweredQuestion ? 'bg-gray-50 border border-gray-200' : 'bg-white');
    return (
      <motion.div key={message.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xl w-fit rounded-lg px-4 py-3 shadow-sm ${bubbleCls}`}>
          <p className={`text-sm ${isAnsweredQuestion ? 'text-gray-600' : 'text-gray-800'} whitespace-pre-wrap`}>
            {(() => {
              try {
                // Additional defensive check for objects with the specific keys from the error
                if (message.content && typeof message.content === 'object') {
                  const content = message.content as any;
                  if ('reportData' in content || 'custom_date' in content || 'custom_name' in content || 
                      'llmResponses' in content || 'socratesData' in content || 'raw_transcript' in content ||
                      'user_description' in content || 'processed_transcript' in content) {
                    console.warn('Detected object with specific keys being rendered as message content:', content);
                    return `[Object data - ID: ${message.id}] ${JSON.stringify(content, null, 2)}`;
                  }
                  return JSON.stringify(content, null, 2);
                }
                if (typeof message.content === 'string') {
                  return message.content;
                } else {
                  return String(message.content || '');
                }
              } catch (error) {
                console.error('Error rendering message content:', error, message.content);
                return `Error rendering content for message ${message.id}`;
              }
            })()}
          </p>
          {/* OLD TIMELINE RENDERING - COMMENTED OUT (replaced by dedicated Timeline page) 
          {message.renderType === 'timeline' && message.logs && (
            <div className="mt-3 space-y-2">
              {message.logs.map((log) => {
                const sevVal = typeof log.severity_scale === 'number' ? log.severity_scale : undefined;
                const isExpanded = expandedLogs.has(log.id);
                const badge = (() => {
                  if (typeof sevVal !== 'number') return null;
                  const cls = sevVal <= 3
                    ? 'bg-gray-100 text-gray-700'
                    : sevVal <= 6
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-700';
                  return <span className={`text-[10px] px-2 py-0.5 rounded ${cls}`}>Severity {sevVal}/10</span>;
                })();
                
                const toggleExpanded = () => {
                  setExpandedLogs(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(log.id)) {
                      newSet.delete(log.id);
                    } else {
                      newSet.add(log.id);
                    }
                    return newSet;
                  });
                };

                // Get presenting complaint for compact display
                const presentingComplaint = log.symptom_data?.processedTranscript || 
                                          log.additional_context?.processed_transcript ||
                                          log.description || 
                                          log.symptom_name || 
                                          log.symptom_type;
                
                // Truncate presenting complaint to 120 chars for compact view
                const shortComplaint = presentingComplaint.length > 120 
                  ? presentingComplaint.substring(0, 117) + '...'
                  : presentingComplaint;

                return (
                  <div key={log.id} className="border border-gray-200 rounded-md bg-white px-3 py-2">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{log.symptom_name || log.symptom_type}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {badge}
                      </div>
                    </div>
                    
                    {/* Compact view - always show presenting complaint */}
                    {/* <div className="mt-2 text-xs text-gray-600">
                      <div className="font-medium text-gray-700 mb-1">Presenting Complaint:</div>
                      <div className="pl-2">{shortComplaint}</div>
                    </div>
                    
                    {/* Collapsed view */}
                    {/* {!isExpanded && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
                        <button
                          onClick={toggleExpanded}
                          className="ml-auto text-blue-600 hover:underline text-xs"
                        >
                          View Full Details
                        </button>
                        <button
                          onClick={async () => {
                            const name = prompt('Edit symptom name', String(log.symptom_name || ''));
                            if (name === null) return;
                            const res = await fetch(`/api/symptoms/logs/${log.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAuthToken()}` }, body: JSON.stringify({ symptom_name: name }) });
                            if (res.ok) {
                              const data = await res.json();
                              setMessages(prev => prev.map(m => m.id === message.id ? { ...m, logs: (m.logs || []).map((l: any) => l.id === log.id ? { ...l, symptom_name: data.log.symptom_name } : l) } : m));
                            }
                          }}
                          className="text-blue-600 hover:underline text-xs"
                        >Edit</button>
                      </div>
                    )} */}
                    
                    {/* Expanded view */}
                    {/* {isExpanded && (
                      <div className="mt-3 space-y-2 text-xs text-gray-700">
                        <div className="border-t pt-2">
                          <div className="font-medium text-gray-800 mb-1">Presenting Complaint:</div>
                          <div className="pl-2">
                            {log.symptom_data?.processedTranscript || 
                             log.additional_context?.processed_transcript || 
                             log.symptom_name || 
                             log.symptom_type}
                          </div>
                        </div>
                        
                        {log.description && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Description:</div>
                            <div className="pl-2">{log.description}</div>
                          </div>
                        )}
                        
                        {log.functional_impact && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Functional Impact:</div>
                            <div className="pl-2">{log.functional_impact}</div>
                          </div>
                        )}
                        
                        {log.emotional_impact && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Emotional Impact:</div>
                            <div className="pl-2">{log.emotional_impact}</div>
                          </div>
                        )}
                        
                        {log.location && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Location:</div>
                            <div className="pl-2">{log.location}</div>
                          </div>
                        )}
                        
                        {log.onset_time && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Onset:</div>
                            <div className="pl-2">{log.onset_time}</div>
                          </div>
                        )}
                        
                        {log.character_description && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Character:</div>
                            <div className="pl-2">{log.character_description}</div>
                          </div>
                        )}
                        
                        {log.additional_context && (
                          <div>
                            <div className="font-medium text-gray-800 mb-1">Additional Context:</div>
                            <div className="pl-2">
                              {typeof log.additional_context === 'string' 
                                ? log.additional_context 
                                : <pre className="text-xs">{JSON.stringify(log.additional_context, null, 2)}</pre>
                              }
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <button
                            onClick={toggleExpanded}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Show Less
                          </button>
                          <button
                            onClick={async () => {
                              const name = prompt('Edit symptom name', String(log.symptom_name || ''));
                              if (name === null) return;
                              const res = await fetch(`/api/symptoms/logs/${log.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAuthToken()}` }, body: JSON.stringify({ symptom_name: name }) });
                              if (res.ok) {
                                const data = await res.json();
                                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, logs: (m.logs || []).map((l: any) => l.id === log.id ? { ...l, symptom_name: data.log.symptom_name } : l) } : m));
                              }
                            }}
                            className="text-blue-600 hover:underline text-xs"
                          >Edit</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          */}
          {message.isQuestion && message.options && (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {message.options.map((option, idx) => {
                const disabled = !!message.answered;
                const isSelected = message.selectedOption === option;
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={(e) => handleButtonClick(option, message.id, e)}
                    className={`text-left px-3 py-2 text-sm rounded-md border ${isSelected ? 'bg-gray-200 border-gray-300 text-gray-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'} ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderCameraRollTimeline = () => {
    const filteredLogs = filterLogsBySymptom(timelineLogs, selectedSymptomFilter);
    const groupedLogs = groupLogsByWeek(filteredLogs);
    
    // Get current week logs for default view
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekKey = currentWeekStart.toISOString();
    const defaultWeekKey = selectedWeek === 'current' ? currentWeekKey : selectedWeek;
    
    const weekLogs = groupedLogs[defaultWeekKey] || [];
    const sortedWeeks = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-[#F2FBF6] rounded-xl shadow-sm border border-[#CDEEDB] overflow-hidden">
          {/* Header */}
          <div className="bg-[#2EB872] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">📅</div>
              <div>
                <div className="text-white font-semibold">Timeline View</div>
                <div className="text-white/90 text-xs">Camera roll style organization</div>
              </div>
            </div>
            <button
              onClick={() => setTimelineView('chat')}
              className="text-white/90 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              Back to Chat
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Week Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Week:</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#2EB872] focus:border-transparent"
                >
                  {getWeekOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#2EB872] focus:border-transparent"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Symptom Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Symptom:</label>
                <select
                  value={selectedSymptomFilter}
                  onChange={(e) => setSelectedSymptomFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#2EB872] focus:border-transparent"
                >
                  <option value="all">All Symptoms</option>
                  {symptomGroups.map(group => (
                    <option key={group} value={group}>
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="p-4">
            {weekLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📅</div>
                <div className="text-lg font-medium mb-2">No logs for this week</div>
                <div className="text-sm">Try selecting a different week or symptom filter</div>
              </div>
              ) : (
              <div className="space-y-6">
                {/* Week Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {formatWeekRange(new Date(defaultWeekKey))}
                  </h2>
                  <p className="text-gray-600">{weekLogs.length} symptom{weekLogs.length !== 1 ? 's' : ''} logged</p>
                </div>

                {/* Logs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weekLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    const sevVal = typeof log.severity_scale === 'number' ? log.severity_scale : undefined;
                    
                    const badge = (() => {
                      if (typeof sevVal !== 'number') return null;
                      const cls = sevVal <= 3
                        ? 'bg-gray-100 text-gray-700'
                        : sevVal <= 6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-700';
                      return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>Severity {sevVal}/10</span>;
                    })();

                    const toggleExpanded = () => {
                      setExpandedLogs(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(log.id)) {
                          newSet.delete(log.id);
                        } else {
                          newSet.add(log.id);
                        }
                        return newSet;
                      });
                    };

                    return (
                      <div key={log.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Log Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {log.symptom_name || log.symptom_type}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(log.created_at).toLocaleDateString('en-GB', { 
                                  weekday: 'short', 
                                  day: '2-digit', 
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {badge}
                            </div>
                          </div>
                          
                          {/* Quick Info */}
                          <div className="space-y-1 text-sm text-gray-600">
                            {log.functional_impact && (
                              <div className="truncate">💼 {log.functional_impact}</div>
                            )}
                            {log.emotional_impact && (
                              <div className="truncate">😊 {log.emotional_impact}</div>
                            )}
                            {log.location && (
                              <div className="truncate">📍 {log.location}</div>
                            )}
                          </div>
                        </div>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <div className="space-y-3 text-sm text-gray-700">
                              {log.description && (
                                <div>
                                  <div className="font-medium text-gray-800 mb-1">Description:</div>
                                  <div className="pl-2">{log.description}</div>
                                </div>
                              )}
                              
                              {log.onset_time && (
                                <div>
                                  <div className="font-medium text-gray-800 mb-1">Onset:</div>
                                  <div className="pl-2">{log.onset_time}</div>
                                </div>
                              )}
                              
                              {log.character_description && (
                                <div>
                                  <div className="font-medium text-gray-800 mb-1">Character:</div>
                                  <div className="pl-2">{log.character_description}</div>
                                </div>
                              )}
                              
                              {log.additional_context && (
                                <div>
                                  <div className="font-medium text-gray-800 mb-1">Additional Context:</div>
                                  <div className="pl-2">
                                    {typeof log.additional_context === 'string' 
                                      ? log.additional_context 
                                      : <pre className="text-xs">{JSON.stringify(log.additional_context, null, 2)}</pre>
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                              <button
                                onClick={toggleExpanded}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Show Less
                              </button>
                              <button
                                onClick={async () => {
                                  const name = prompt('Edit symptom name', String(log.symptom_name || ''));
                                  if (name === null) return;
                                  const res = await fetch(`/api/symptoms/logs/${log.id}`, { 
                                    method: 'PATCH', 
                                    headers: { 
                                      'Content-Type': 'application/json', 
                                      'Authorization': `Bearer ${await getAuthToken()}` 
                                    }, 
                                    body: JSON.stringify({ symptom_name: name }) 
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setTimelineLogs(prev => prev.map(l => 
                                      l.id === log.id ? { ...l, symptom_name: data.log.symptom_name } : l
                                    ));
                                  }
                                }}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expand Button */}
                        {!isExpanded && (
                          <div className="p-3 bg-gray-50 border-t border-gray-100">
                            <button
                              onClick={toggleExpanded}
                              className="w-full text-center text-blue-600 hover:underline text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Week Navigation */}
                <div className="flex items-center justify-center space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const currentIndex = sortedWeeks.indexOf(defaultWeekKey);
                      if (currentIndex < sortedWeeks.length - 1) {
                        setSelectedWeek(sortedWeeks[currentIndex + 1]);
                      }
                    }}
                    disabled={sortedWeeks.indexOf(defaultWeekKey) >= sortedWeeks.length - 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous Week
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    {sortedWeeks.indexOf(defaultWeekKey) + 1} of {sortedWeeks.length} weeks
                  </span>
                  
                  <button
                    onClick={() => {
                      const currentIndex = sortedWeeks.indexOf(defaultWeekKey);
                      if (currentIndex > 0) {
                        setSelectedWeek(sortedWeeks[currentIndex - 1]);
                      }
                    }}
                                         disabled={sortedWeeks.indexOf(defaultWeekKey) <= 0}
                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Next Week →
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const startGPFlow = () => {
    gpFlowStateRef.current = { step: 0, answers: {} };
    askNextGPQuestion(0);
  };

  const askNextGPQuestion = (step: number) => {
    const prompts = [
      { q: 'What is the exact date and time of your appointment?', hint: 'e.g. 04/08/2025 09:30 (DD/MM/YYYY HH:MM)' },
      { q: "What’s the reason for your appointment?", hint: 'e.g. Ongoing stomach pain, medication side effect, mental health check-in' },
      { q: "What’s the most important thing you want the GP to take away from this appointment?", hint: "e.g. I'm scared it’s something serious / I want to understand what’s causing the pain / I need clarity before my holiday" },
      { q: 'Have you used any medications or home remedies?', hint: 'e.g. Paracetamol, hot water bottle, cutting out dairy, using inhaler more often' },
      { q: 'Have you had any tests, scans or done anything like measuring temperature or blood pressure?', hint: 'e.g. Took a COVID test, checked blood sugar, had a chest X-ray, no tests yet' }
    ];
    const p = prompts[step];
    if (!p) return;
    const hint = p.hint ? `e.g. ${p.hint.replace(/^e\.g\.\s*/i, '')}` : '';
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: `${p.q}\n${hint}`, timestamp: new Date(), isQuestion: true, inputType: 'text' }]);
  };

  // OLD TIMELINE FUNCTION - COMMENTED OUT (replaced by dedicated Timeline page)
  // const showTimelineInChat = async (mode: 'recent' | 'all' | 'search', query?: string, count?: number) => {
  //   try {
  //     const token = await getAuthToken();
  //     let logs: any[] = [];
      
  //     if (mode === 'search' && query) {
  //       // Use new search API
  //       const res = await fetch('/api/symptoms/search', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${token || ''}`
  //         },
  //         body: JSON.stringify({ query })
  //       });
  //       const data = await res.json();
  //       logs = data.results || [];
  //     } else {
  //       // Use existing logs API for recent/all
  //       let url = '/api/symptoms/logs';
  //       if (mode === 'recent') url += '?recent=5';
  //       if (mode === 'all') url += `?limit=${count || 5}`;
  //       const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token || ''}` } });
  //       const data = await res.json();
  //       logs = data.logs || [];
  //     }
      
  //     const effectiveCount = count || 5;
  //     const optionsList = ['View Recent', 'View All', 'Search', 'Back to menu'] as string[];
  //     if (mode === 'all' && logs.length >= effectiveCount) {
  //       optionsList.unshift('View More');
  //     }
      
  //     let content = '';
  //     if (mode === 'search') {
  //       if (logs.length === 0) {
  //         content = `No matches found for "${query}". Showing your 5 most recent logs.`;
  //         // Get recent logs as fallback
  //         const res = await fetch('/api/symptoms/logs?recent=5', { 
  //           headers: { 'Authorization': `Bearer ${token || ''}` } 
  //         });
  //         const data = await res.json();
  //         logs = data.logs || [];
  //       } else {
  //         content = `Found ${logs.length} result${logs.length === 1 ? '' : 's'} for "${query}":`;
  //       }
  //     } else {
  //       content = `Here ${logs.length === 1 ? 'is your most recent log' : 'are your recent logs'}:`;
  //     }
      
  //     setMessages(prev => [
  //       ...prev,
  //       {
  //         id: Date.now().toString(),
  //         type: 'agent',
  //         content,
  //         timestamp: new Date(),
  //         renderType: 'timeline',
  //         logs
  //       },
  //       {
  //         id: (Date.now() + 1).toString(),
  //         type: 'agent',
  //         content: 'What would you like to do next?',
  //         timestamp: new Date(),
  //         isQuestion: true,
  //         inputType: 'buttons',
  //         options: optionsList
  //       }
  //     ]);
  //   } catch (error) {
  //     console.error('Error loading timeline:', error);
  //     pushAgentQuestion('Sorry, I couldn\'t load your timeline just now.');
  //   }
  // };

  useEffect(() => {
    // Handle Download PDF action by intercepting button label via top-level handler
  }, []);

  // Load timeline logs when component mounts or timeline view changes
  useEffect(() => {
    if (timelineView === 'camera-roll') {
      loadTimelineLogs();
    }
  }, [timelineView]);

  // Render the appropriate view
  if (timelineView === 'camera-roll') {
    return renderCameraRollTimeline();
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-[#F2FBF6] rounded-xl shadow-sm border border-[#CDEEDB] overflow-hidden">
        <div className="bg-[#2EB872] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">💬</div>
            <div>
              <div className="text-white font-semibold">Sympli</div>
              <div className="text-white/90 text-xs">Voice-first health companion</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="min-h-[24rem] max-h-[36rem] overflow-y-auto">
            <AnimatePresence>{messages.map(renderMessage)}</AnimatePresence>
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
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

          {/* Voice Recording Interface */}
          {isRecording && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 relative">
                    {/* Audio visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                        <Square size={24} className="text-white" />
                      </div>
                    </div>
                    {/* Audio level bars */}
                    <div className="absolute inset-0 flex items-center justify-center space-x-1">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-red-400 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(4, (audioLevel / 255) * 50 + Math.sin(Date.now() * 0.01 + i) * 10)}px`,
                            opacity: 0.6 + (i * 0.05)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-gray-800 mb-2">Listening...</div>
                  <div className="text-sm text-gray-600">Tap to stop recording</div>
                </div>
                <button
                  onClick={stopRecording}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Text Input Interface */}
          <div className={`mt-3 flex items-center ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
                placeholder={isTranscribing ? "Transcribing..." : "Type your response (type 'menu' to return)..."}
                className="w-full text-sm outline-none"
                disabled={isRecording || isTranscribing}
              />
            </div>
            <button
              onClick={handleTextSubmit}
              disabled={isLoading || !userInput.trim() || isRecording || isTranscribing}
              className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white ${isLoading || !userInput.trim() || isRecording || isTranscribing ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#2EB872] hover:bg-[#26a564]'}`}
              aria-label="Send message"
            >
              ➤
            </button>
            <div className="relative">
              <button
                onClick={toggleRecording}
                className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  isRecording ? 'bg-red-500 animate-pulse' :
                  isTranscribing ? 'bg-yellow-500 animate-pulse' :
                  userInput.trim() ? 'bg-gray-400 cursor-not-allowed' :
                  'bg-[#2EB872] hover:bg-[#26a564]'
                }`}
                aria-label="Toggle voice recording"
                aria-pressed={isRecording}
                disabled={isTranscribing || !!userInput.trim()}
              >
                {isRecording ? <Square size={16} /> :
                 isTranscribing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                 <Mic size={16} />}
              </button>
              {userInput.trim() && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                  Clear text to use voice
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Messages */}
          {isTranscribing && (
            <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
              <span className="mr-1">🎤</span>
              Transcribing audio...
            </div>
          )}
          {micError && <div className="text-xs text-red-600 mt-2 text-center">{micError}</div>}

          <div className="text-xs text-gray-600 mt-2 flex items-center"><span className="mr-1">🔒</span> Private & HIPAA-compliant</div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChat;
