'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  customName?: string;
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
  }>;
}

const defaultSymptom: SymptomData = {
  symptomType: 'other',
  isNew: 'new',
  description: '',
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
  const [currentSymptomData, setCurrentSymptomData] = useState<SymptomData>({ ...defaultSymptom });
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const questionIndexRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState('');

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  // Post-save choice flag
  const awaitingPostSaveRef = useRef(false);
  const awaitingTimelineSearchRef = useRef(false);
  const timelineAllCountRef = useRef(5);
  const gpFlowStateRef = useRef<{ step: number; answers: Record<string, string> } | null>(null);
  const awaitingOtherNameRef = useRef(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setUser(session.user);
      } catch {}
    };
    getUser();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const pushAgentQuestion = (text: string, options?: string[], inputType: 'text' | 'buttons' | 'textarea' = 'text') => {
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: text, timestamp: new Date(), isQuestion: true, options, inputType }]);
  };

  const showMainMenu = () => {
    pushAgentQuestion('What would you like to do today?', ['Log a Symptom', 'Generate PDF Report', 'View Timeline'], 'buttons');
    // reset flow state
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    setCurrentSymptomData({ ...defaultSymptom });
    awaitingPostSaveRef.current = false;
    awaitingTimelineSearchRef.current = false;
    awaitingOtherNameRef.current = false;
    gpFlowStateRef.current = null;
    setIsLoading(false);
    setUserInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'system', content: 'Returned to main menu.', timestamp: new Date() }]);
  };

  const resetForNewLog = () => {
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    setCurrentSymptomData({ ...defaultSymptom });
    pushAgentQuestion('What are you tracking today?', ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'], 'buttons');
  };

  const markMessageAnswered = (messageId: string, selected: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, answered: true, selectedOption: selected } : m));
  };

  const handleTopChoice = async (choice: string, messageId: string) => {
    markMessageAnswered(messageId, choice);
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: choice, timestamp: new Date() }]);
    if (choice === 'Log a Symptom') return resetForNewLog();
    if (choice === 'Generate PDF Report') { startGPFlow(); return; }
    if (choice === 'View Timeline') {
      pushAgentQuestion('What would you like to see?', ['View Recent', 'View All', 'Search', 'Back to menu'], 'buttons');
      return;
    }
  };

  const handleButtonClick = async (option: string, messageId: string, event?: React.MouseEvent) => {
    // Prevent double clicks
    const button = event?.target as HTMLButtonElement;
    if (button?.disabled) return;
    if (button) button.disabled = true;
    // Handle GP PDF flow actions FIRST to avoid falling through to symptom flow
    if (gpFlowStateRef.current && ['Confirm', 'Re-record', 'Download PDF', 'Edit anything', 'Back to menu'].includes(option)) {
      if (option === 'Back to menu') { markMessageAnswered(messageId, option); showMainMenu(); return; }
      if (option === 'Confirm') {
        markMessageAnswered(messageId, option);
        setMessages(prev => [...prev,
          { id: Date.now().toString(), type: 'agent', content: `Preview – Executive Summary and Most Recent Entries will be generated based on your logs.`, timestamp: new Date() },
          { id: (Date.now()+1).toString(), type: 'agent', content: `Ready to generate your PDF now?`, timestamp: new Date(), isQuestion: true, inputType: 'buttons', options: ['Download PDF', 'Edit anything', 'Back to menu'] }
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
          const res = await fetch('/api/symptoms/pdf', {
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
            pushAgentQuestion(ok ? 'Your PDF is downloading.' : 'I generated the PDF, but your browser blocked the download. Please allow popups or try again.');
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          } else {
            pushAgentQuestion('Sorry, I could not generate the PDF right now.');
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          }
        } catch {
          pushAgentQuestion('Sorry, I could not generate the PDF right now.');
          pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
        }
        return;
      }
    }
    // Handle post-save choice first
    if (awaitingPostSaveRef.current && (option === 'Yes' || option === 'No')) {
      markMessageAnswered(messageId, option);
      awaitingPostSaveRef.current = false;
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
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
      if (option === 'View Timeline') { pushAgentQuestion('What would you like to see?', ['View Recent', 'View All', 'Search', 'Back to menu'], 'buttons'); return; }
    }

    // Echo user selection for generic options only; skip for symptom/new-ongoing handled below
    if (!['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other', 'New', 'Ongoing'].includes(option)) {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: option, timestamp: new Date() }]);
    }

    // Timeline controls inside chat
    if (['View Recent', 'View All', 'Search', 'Back to menu', 'View More', 'Confirm', 'Re-record'].includes(option)) {
      if (option === 'Back to menu') { showMainMenu(); return; }
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
          { id: (Date.now()+1).toString(), type: 'agent', content: `Ready to generate your PDF now?`, timestamp: new Date(), isQuestion: true, inputType: 'buttons', options: ['Download PDF', 'Edit anything', 'Back to menu'] }
        ]);
        return;
      }
      if (option === 'Re-record') { gpFlowStateRef.current = { step: 0, answers: {} }; askNextGPQuestion(0); return; }
      if (option === 'Download PDF') {
        try {
          const token = await getAuthToken();
          const st = gpFlowStateRef.current;
          const res = await fetch('/api/symptoms/pdf', {
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
            pushAgentQuestion(ok ? 'Your PDF is downloading.' : 'I generated the PDF, but your browser blocked the download. Please allow popups or try again.');
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          } else {
            pushAgentQuestion('Sorry, I could not generate the PDF right now.');
            pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
          }
        } catch {
          pushAgentQuestion('Sorry, I could not generate the PDF right now.');
          pushAgentQuestion('Would you like to go back to the main menu?', ['Back to menu'], 'buttons');
        }
        return;
      }
      if (option === 'Edit anything') { gpFlowStateRef.current = { step: 0, answers: gpFlowStateRef.current?.answers || {} }; askNextGPQuestion(0); return; }
      if (option === 'Search') {
        awaitingTimelineSearchRef.current = true;
        pushAgentQuestion('Enter a keyword to search your logs:');
        return;
      }
      if (option === 'View More') { timelineAllCountRef.current = timelineAllCountRef.current + 10; await showTimelineInChat('all', undefined, timelineAllCountRef.current); return; }
      if (option === 'View All') { timelineAllCountRef.current = 5; await showTimelineInChat('all', undefined, timelineAllCountRef.current); return; }
      if (option === 'View Recent') { await showTimelineInChat('recent'); return; }
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
      // For 'Other', capture a custom name first
      if (selectedType === 'other') {
        awaitingOtherNameRef.current = true;
        pushAgentQuestion('You chose Other — what symptom do you mean? Please name it in your own words.', undefined, 'text');
      } else {
        pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
        questionIndexRef.current = 0; // we will skip API base later
        setCurrentQuestionIndex(0);
      }
      return;
    }

    // Step 2: New/Ongoing selection → jump into agentic flow (skip API base Qs)
    if (['New', 'Ongoing'].includes(option)) {
      // Mark current question as answered and record user choice
      markMessageAnswered(messageId, option);
      const userMsg = { id: Date.now().toString(), type: 'user' as const, content: option, timestamp: new Date() };
      const localMessages = [...messages, userMsg];
      setMessages(prev => [...prev, userMsg]);
      const updatedData = { ...currentSymptomData, isNew: option.toLowerCase() as 'new' | 'ongoing' };
      setCurrentSymptomData(updatedData);
      questionIndexRef.current = 2; // skip baseQuestions[0..1]
      setCurrentQuestionIndex(2);
      await getNextQuestion(2, localMessages, updatedData);
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

    // Grey out the most recent unanswered agent question (if any)
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        const m = updated[i];
        if (m.type === 'agent' && m.isQuestion && !m.answered) {
          updated[i] = { ...m, answered: true } as any;
          break;
        }
      }
      return [...updated, { id: Date.now().toString(), type: 'user', content: text, timestamp: new Date() }];
    });

    // If awaiting a timeline search query
    if (awaitingTimelineSearchRef.current) {
      awaitingTimelineSearchRef.current = false;
      setUserInput('');
      await showTimelineInChat('search', text);
      return;
    }

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

    // Capture custom name for 'Other'
    if (awaitingOtherNameRef.current) {
      awaitingOtherNameRef.current = false;
      const lowered = text.toLowerCase();
      const mappedType: SymptomData['symptomType'] | null =
        lowered.includes('pregnan') ? 'pregnancy' : null;
      if (mappedType) {
        setCurrentSymptomData(prev => ({ ...prev, customName: text, symptomType: mappedType }));
      } else {
        setCurrentSymptomData(prev => ({ ...prev, customName: text }));
      }
      setUserInput('');
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: `Thanks — I'll log this as “${text}”.`, timestamp: new Date() }]);
      pushAgentQuestion('Is this a new symptom or something ongoing?', ['New', 'Ongoing'], 'buttons');
      questionIndexRef.current = 0;
      setCurrentQuestionIndex(0);
      return;
    }

    updateSymptomData(text);
    setUserInput('');
    await getNextQuestion();
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
        })
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
    } catch {
      // No fallbacks; surface API error to user
      console.error('Chat-question API error');
      pushAgentQuestion('API error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPreviousSymptoms = async () => {
    try {
      const { data: previousSymptoms, error } = await supabase
        .from('symptom_logs')
        .select('id, created_at, symptom_type, symptom_name, severity_scale, functional_impact, triggers, patterns, treatment_response, progress_description')
        .eq('user_id', user?.id)
        .eq('symptom_type', currentSymptomData.symptomType)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && previousSymptoms && previousSymptoms.length > 0) {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'system', content: `Found ${previousSymptoms.length} previous entries for ${currentSymptomData.symptomType}.`, timestamp: new Date() }]);
      }
    } catch {}
  };

  const completeSymptomLog = async () => {
    try {
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
          }
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
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'agent', content: summaryText, timestamp: new Date() }]);

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
    try {
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {}
    try {
      const resp = await fetch(dataUri);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch {}
    try {
      window.open(dataUri, '_blank');
      return true;
    } catch {}
    return false;
  };

  // Voice recording
  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setMicError('Microphone permission denied or unavailable');
      setIsRecording(false);
    }
  };
  const stopRecording = () => { const mr = mediaRecorderRef.current; if (mr && mr.state !== 'inactive') mr.stop(); setIsRecording(false); };
  const toggleRecording = async () => { if (isRecording) stopRecording(); else await startRecording(); };
  const transcribeAudio = async (blob: Blob) => {
    try {
      const form = new FormData();
      form.append('audio', new File([blob], 'recording.webm', { type: 'audio/webm' }));
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setMicError(data.error || 'Transcription failed'); return; }
      setUserInput(prev => (prev ? prev + ' ' : '') + data.text);
    } catch { setMicError('Transcription error'); }
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
          <p className={`text-sm ${isAnsweredQuestion ? 'text-gray-600' : 'text-gray-800'} whitespace-pre-wrap`}>{message.content}</p>
          {message.renderType === 'timeline' && message.logs && (
            <div className="mt-3 space-y-2">
              {message.logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-md bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{log.symptom_name || log.symptom_type}</div>
                    <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {typeof log.severity_scale === 'number' ? `Severity: ${log.severity_scale}/10` : ''}
                    {log.functional_impact ? ` • Impact: ${log.functional_impact}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
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

  const showTimelineInChat = async (mode: 'recent' | 'all' | 'search', query?: string, count?: number) => {
    try {
      const token = await getAuthToken();
      let url = '/api/symptoms/logs';
      if (mode === 'recent') url += '?recent=5';
      if (mode === 'all') url += `?limit=${count || 5}`;
      if (mode === 'search' && query) url += `?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token || ''}` } });
      const data = await res.json();
      const logs = data.logs || [];
      const effectiveCount = count || 5;
      const optionsList = ['View Recent', 'View All', 'Search', 'Back to menu'] as string[];
      if (mode === 'all' && logs.length >= effectiveCount) {
        optionsList.unshift('View More');
      }
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'agent',
          content: mode === 'search' ? `Here are your search results:` : `Here ${logs.length === 1 ? 'is your most recent log' : 'are your recent logs'}:`,
          timestamp: new Date(),
          renderType: 'timeline',
          logs
        },
        {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          content: 'What would you like to do next?',
          timestamp: new Date(),
          isQuestion: true,
          inputType: 'buttons',
          options: optionsList
        }
      ]);
    } catch {
      pushAgentQuestion('Sorry, I couldn\'t load your timeline just now.');
    }
  };

  useEffect(() => {
    // Handle Download PDF action by intercepting button label via top-level handler
  }, []);

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

          <div className="mt-3 flex items-center">
            <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center">
              <input value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }} placeholder="Type your response (type 'menu' to return)..." className="w-full text-sm outline-none" />
            </div>
            <button
              onClick={handleTextSubmit}
              disabled={isLoading || !userInput.trim()}
              className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white ${isLoading || !userInput.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#2EB872] hover:bg-[#26a564]'}`}
              aria-label="Send message"
            >
              ➤
            </button>
            <button onClick={toggleRecording} className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#2EB872] hover:bg-[#26a564]'}`} aria-label="Toggle voice recording">{isRecording ? '■' : '🎙️'}</button>
          </div>
          {micError && <div className="text-xs text-red-600 mt-2">{micError}</div>}

          <div className="text-xs text-gray-600 mt-2 flex items-center"><span className="mr-1">🔒</span> Private & HIPAA-compliant</div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChat;
