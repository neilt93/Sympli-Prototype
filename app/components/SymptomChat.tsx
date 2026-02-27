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
  customName?: string;
  userDescription?: string;
  rawTranscript?: string;
  processedTranscript?: string;
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

type FlowType = 'none' | 'symptom' | 'timeline' | 'pdf';
type SwitchTarget = FlowType | null;

const SymptomChat: React.FC<SymptomChatProps> = ({ token: propToken, onComplete, onCancel }) => {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const initialPrologueMessage: ChatMessage = {
    id: 'prologue',
    type: 'agent',
    content: "Hi, I'm Sympli. I can help you log symptoms step by step in plain language.",
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
  const typingTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState('');
  const [activeFlow, setActiveFlow] = useState<FlowType>('none');
  const activeFlowRef = useRef<FlowType>('none');
  const pendingFlowSwitchRef = useRef<SwitchTarget>(null);
  const nurseCapturedTextRef = useRef<string>('');
  const questionAbortRef = useRef<AbortController | null>(null);
  const newId = () => (globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random()));
  const awaitingOtherConfirmRef = useRef<{ candidate: string } | null>(null);
  const awaitingSimilarConfirmRef = useRef<boolean>(false);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [pendingTranscriptDraft, setPendingTranscriptDraft] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [simpleMode] = useState(true);
  const [largeTextMode] = useState(true);
  const isButtonProcessingRef = useRef(false);

  // Post-save choice flag
  const awaitingPostSaveRef = useRef(false);
  const awaitingTimelineSearchRef = useRef(false);
  const timelineAllCountRef = useRef(5);
  const gpFlowStateRef = useRef<{ step: number; answers: Record<string, string> } | null>(null);
  const awaitingOtherNameRef = useRef(false);
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
    return () => {
      try {
        if (typingTimerRef.current) {
          window.clearTimeout(typingTimerRef.current);
        }
      } catch {}
    };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const pushAgentQuestion = (
    text: string,
    options?: string[],
    inputType: 'text' | 'buttons' | 'textarea' = 'text',
    stream: boolean = false
  ) => {
    if (!stream) {
      setMessages(prev => [...prev, { id: newId(), type: 'agent', content: text, timestamp: new Date(), isQuestion: true, options, inputType }]);
      setChatForSave(prev => [...prev, { role: 'agent', content: text }]);
      return;
    }

    const id = newId();
    setMessages(prev => [...prev, { id, type: 'agent', content: '', timestamp: new Date(), isQuestion: true, options, inputType }]);
    setChatForSave(prev => [...prev, { role: 'agent', content: text }]);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    let cursor = 0;
    const step = () => {
      cursor = Math.min(text.length, cursor + Math.max(1, Math.floor(text.length / 40)));
      setMessages(prev => prev.map((message) => (
        message.id === id ? { ...message, content: text.slice(0, cursor) } : message
      )));
      if (cursor < text.length) {
        typingTimerRef.current = window.setTimeout(step, 20);
      }
    };
    step();
  };

  const setFlow = (flow: FlowType) => {
    activeFlowRef.current = flow;
    setActiveFlow(flow);
  };

  const flowLabel = (flow: FlowType) => {
    if (flow === 'symptom') return 'Symptom intake';
    if (flow === 'timeline') return 'Timeline review';
    if (flow === 'pdf') return 'GP report prep';
    return 'Nurse desk';
  };

  const detectFlowIntent = (text: string): Exclude<FlowType, 'none'> | null => {
    const t = text.toLowerCase();
    if (/\b(pdf|report|gp|appointment summary)\b/.test(t)) return 'pdf';
    if (/\b(timeline|history|past logs|search logs)\b/.test(t)) return 'timeline';
    if (/\b(symptom|pain|headache|fatigue|nausea|dizziness|cough|breath|bleeding|log)\b/.test(t)) return 'symptom';
    return null;
  };

  const detectFlowSwitchRequest = (text: string): Exclude<FlowType, 'none'> | null => {
    const t = text.toLowerCase();
    if (/\b(switch|go|open|start|take me)\b.*\b(timeline|history|logs)\b|\b(timeline|history|logs)\b.*\b(instead|now)\b/.test(t)) return 'timeline';
    if (/\b(switch|go|open|start|generate|create)\b.*\b(pdf|report|gp)\b|\b(pdf|report|gp)\b.*\b(instead|now)\b/.test(t)) return 'pdf';
    if (/\b(switch|go|open|start)\b.*\b(symptom|log symptom|intake)\b|\b(log symptom|symptom intake)\b.*\b(instead|now)\b/.test(t)) return 'symptom';
    return null;
  };

  const pauseAfterButtonPress = async () => {
    const delayMs = 450 + Math.floor(Math.random() * 500); // 450-950ms
    setIsBotTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    setIsBotTyping(false);
  };

  const nurseTriageOutsideFlow = async (text: string) => {
    const trimmed = text.trim();
    const intent = detectFlowIntent(trimmed);

    if (intent === 'timeline') {
      pushAgentQuestion(
        'I can help with your timeline now. Would you like me to open it?',
        ['Start Timeline', 'Not now'],
        'buttons'
      );
      return;
    }

    if (intent === 'pdf') {
      pushAgentQuestion(
        'I can help prepare your GP report. Start that flow now?',
        ['Start GP Report', 'Not now'],
        'buttons'
      );
      return;
    }

    if (intent === 'symptom') {
      nurseCapturedTextRef.current = trimmed;
      pushAgentQuestion(
        `Thanks for sharing that. I can guide you through this like a nurse intake. Start now?`,
        ['Start Symptom Log', 'Not now'],
        'buttons'
      );
      return;
    }

    pushAgentQuestion(
      'I can help in three ways: log a symptom, review timeline, or create a GP report. Which one would you like?',
      ['Log a Symptom', 'View Timeline', 'Generate PDF Report'],
      'buttons'
    );
  };

  const handleHelpAction = () => {
    pushAgentQuestion(
      'Help options:\n1) Tap the microphone and speak slowly.\n2) You can type short answers.\n3) Use "menu" any time to go back.\n4) Use the Urgent button for emergency advice.'
    );
  };

  const handleUrgentAction = () => {
    pushAgentQuestion(
      'If you have chest pain, severe breathing problems, heavy bleeding, stroke symptoms, or feel unsafe, call emergency services now. In the UK, call 999. For urgent non-emergency advice, use NHS 111.',
      ['Back to menu'],
      'buttons'
    );
  };

  const showMainMenu = () => {
    // reset flow state
    setFlow('none');
    pendingFlowSwitchRef.current = null;
    nurseCapturedTextRef.current = '';
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    setCurrentSymptomData({ ...defaultSymptom });
    awaitingPostSaveRef.current = false;
    awaitingTimelineSearchRef.current = false;
    awaitingOtherNameRef.current = false;
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
    setFlow('symptom');
    pendingFlowSwitchRef.current = null;
    questionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    const captured = nurseCapturedTextRef.current.trim();
    setCurrentSymptomData({
      ...defaultSymptom,
      description: captured || '',
      userDescription: captured || undefined,
      rawTranscript: captured || undefined,
      processedTranscript: captured || undefined
    });
    sessionStartIdxRef.current = messages.length;
    if (captured) {
      pushAgentQuestion(`I noted: "${captured}". What are you tracking today?`, ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'], 'buttons');
      nurseCapturedTextRef.current = '';
      return;
    }
    pushAgentQuestion('What are you tracking today?', ['Headache', 'Fatigue', 'Side Effect', 'Pregnancy', 'Other'], 'buttons');
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
      pushAgentQuestion('What would you like to see?', ['View Recent', 'View All', 'Search', 'Back to menu'], 'buttons');
      return;
    }
  };

  const handleButtonClick = async (option: string, messageId: string, event?: React.MouseEvent) => {
    // Prevent double clicks
    const button = event?.target as HTMLButtonElement;
    if (button?.disabled) return;
    if (button) button.disabled = true;
    if (isButtonProcessingRef.current) return;
    isButtonProcessingRef.current = true;

    try {
      await pauseAfterButtonPress();

    if (option === 'Start Symptom Log') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      return resetForNewLog();
    }
    if (option === 'Start Timeline') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      await showTimelineInChat('recent');
      return;
    }
    if (option === 'Start GP Report') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      startGPFlow();
      return;
    }
    if (option === 'Not now') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      pushAgentQuestion('No problem. I am here when you are ready.');
      showMainMenu();
      return;
    }
    if (option === 'Stay in current flow') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      pendingFlowSwitchRef.current = null;
      pushAgentQuestion(`Okay, we will continue the ${flowLabel(activeFlowRef.current)} flow.`);
      return;
    }
    if (option === 'Leave current flow') {
      markMessageAnswered(messageId, option);
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
      const target = pendingFlowSwitchRef.current;
      pendingFlowSwitchRef.current = null;
      if (target === 'symptom') return resetForNewLog();
      if (target === 'timeline') {
        await showTimelineInChat('recent');
        return;
      }
      if (target === 'pdf') {
        startGPFlow();
        return;
      }
      showMainMenu();
      return;
    }

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
            pushAgentQuestion(ok ? 'Your PDF is downloading.' : 'I generated the PDF, but your browser blocked the download. Please allow popups or try again.');
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
      if (activeFlowRef.current !== 'none') {
        pendingFlowSwitchRef.current = option === 'Log a Symptom' ? 'symptom' : option === 'View Timeline' ? 'timeline' : 'pdf';
        markMessageAnswered(messageId, option);
        setMessages(prev => [...prev, { id: newId(), type: 'user', content: option, timestamp: new Date() }]);
        pushAgentQuestion(
          `You are in ${flowLabel(activeFlowRef.current)}. Do you want to switch flows now?`,
          ['Stay in current flow', 'Leave current flow'],
          'buttons'
        );
        return;
      }
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
          let token = await getAuthToken();
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
        pushAgentQuestion('Which symptom would you like to log? Please name it in your own words.', undefined, 'text');
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
      // If ongoing, first check for similar previous logs and ask confirmation if found
      if (updatedData.isNew === 'ongoing') {
        const asked = await checkPreviousSymptoms(true);
        if (asked) return;
      }
      await getNextQuestion(2, localMessages, updatedData);
      return;
    }

    // Default: continue
    await getNextQuestion();
    } finally {
      isButtonProcessingRef.current = false;
    }
  };

  const handleTextSubmit = async () => {
    if (!userInput.trim() || isLoading) return;
    const text = userInput.trim();

    // Explicit menu command with flow-lock confirmation
    if (/^menu$/i.test(text)) {
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: text, timestamp: new Date() }]);
      if (activeFlowRef.current !== 'none') {
        pendingFlowSwitchRef.current = 'none';
        pushAgentQuestion(
          `You are currently in ${flowLabel(activeFlowRef.current)}. Do you want to leave this flow?`,
          ['Stay in current flow', 'Leave current flow'],
          'buttons'
        );
      } else {
        showMainMenu();
      }
      setUserInput('');
      return;
    }

    // Outside a flow, behave as a nurse-style conversational router.
    if (activeFlowRef.current === 'none') {
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: text, timestamp: new Date() }]);
      setChatForSave(prev => [...prev, { role: 'user', content: text }]);
      setUserInput('');
      await nurseTriageOutsideFlow(text);
      return;
    }

    // In a flow, prevent accidental switching without confirmation.
    const switchIntent = detectFlowSwitchRequest(text);
    if (switchIntent && switchIntent !== activeFlowRef.current) {
      setMessages(prev => [...prev, { id: newId(), type: 'user', content: text, timestamp: new Date() }]);
      setChatForSave(prev => [...prev, { role: 'user', content: text }]);
      pendingFlowSwitchRef.current = switchIntent;
      setUserInput('');
      pushAgentQuestion(
        `I can switch to ${flowLabel(switchIntent)}, but you are in ${flowLabel(activeFlowRef.current)}. Would you like to switch?`,
        ['Stay in current flow', 'Leave current flow'],
        'buttons'
      );
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
    const userMsg: ChatMessage = { id: newId(), type: 'user', content: text, timestamp: new Date() };
    const localMessages = [...updated, userMsg];
    setMessages(localMessages);
    setChatForSave(prev => [...prev, { role: 'user', content: text }]);
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

    // Capture custom name for 'Other' and propose a clinical term then confirm
    if (awaitingOtherNameRef.current) {
      awaitingOtherNameRef.current = false;
      const lowered = text.toLowerCase();
      const mappedType: SymptomData['symptomType'] | null =
        lowered.includes('pregnan') ? 'pregnancy' : null;
      const canonicalise = async (s: string): Promise<string> => {
        try {
          const token = await getAuthToken();
          const resp = await fetch('/api/symptoms/canonicalize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify({ text: s })
          });
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
        pushAgentQuestion(data.question, data.options, data.inputType || 'text', true);
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
      const { data: previousSymptoms, error } = await supabase
        .from('symptom_logs')
        .select('id, created_at, symptom_type, symptom_name, severity_scale, functional_impact, triggers, patterns, treatment_response, progress_description, description')
        .eq('user_id', user?.id)
        .eq('symptom_type', currentSymptomData.symptomType)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && previousSymptoms && previousSymptoms.length > 0) {
        if (offerConfirm) {
          // Keyword match on customName/description to ensure relevance
          const needle = (currentSymptomData.customName || currentSymptomData.description || '').toLowerCase();
          const tokens = Array.from(new Set(needle.split(/[^a-z0-9]+/).filter(w => w.length >= 3)));
          const relevant = previousSymptoms.filter((p) => {
            const hay = [p.symptom_name, p.description, p.functional_impact, p.treatment_response].filter(Boolean).join(' ').toLowerCase();
            let score = 0; for (const t of tokens) { if (hay.includes(t)) score++; }
            return score >= Math.max(1, Math.ceil(tokens.length * 0.3));
          });
          if (relevant.length === 0) return false;
          const dates = relevant.map((p) => new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })).join(', ');
          awaitingSimilarConfirmRef.current = true;
          setMessages(prev => [
            ...prev,
            { id: newId(), type: 'system', content: `I found similar logs on: ${dates}`, timestamp: new Date() },
            { id: newId(), type: 'agent', content: 'Are you referring to the same ongoing pain?', timestamp: new Date(), isQuestion: true, inputType: 'buttons', options: ['Yes, same pain', 'No, different'] }
          ]);
          return true;
        } else {
          setMessages(prev => [...prev, { id: newId(), type: 'system', content: `Found ${previousSymptoms.length} previous entries for ${currentSymptomData.symptomType}.`, timestamp: new Date() }]);
        }
      }
    } catch {}
    return false;
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
          },
          tags: [],
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
        // Presenting complaint
        const presenting = (currentSymptomData.description || '').trim();
        const pc = presenting ? presenting.charAt(0).toUpperCase() + presenting.slice(1) : displaySymptom;
        // Tags
        const tags: string[] = [];
        const typeTag = (currentSymptomData.customName || displaySymptom).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (typeTag) tags.push(`#${typeTag}`);
        const sev = (() => {
          const sevQA = qa.find(x => x.label === 'Severity');
          if (!sevQA) return '';
          const n = parseInt(sevQA.answer.match(/\b(\d{1,2})\b/)?.[1] || '');
          if (!isNaN(n)) {
            if (n <= 3) return '#mild';
            if (n <= 6) return '#moderate';
            return '#severe';
          }
          return '';
        })();
        if (sev) tags.push(sev);
        if (qa.find(x => x.label === 'Functional Impact')) tags.push('#functional-impact');
        if (qa.find(x => x.label === 'Emotional Impact')) tags.push('#emotional-impact');
        const statusTag = currentSymptomData.isNew === 'new' ? '#new-symptom' : '#ongoing-symptom';
        tags.push(statusTag);
        const sysTag = (() => {
          const text = [presenting, ...qa.map(x => x.answer)].join(' ').toLowerCase();
          if (/cough|breath|wheeze|chest/.test(text)) return '#respiratory-pattern';
          if (/stomach|abdominal|nausea|vomit|bowel|diarrhoea|diarrhea/.test(text)) return '#digestive-pattern';
          return '';
        })();
        if (sysTag) tags.push(sysTag);
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
          'Presenting Complaint:',
          `“${pc}”`,
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
          'Confirmed by User: Yes',
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
      const token = await getAuthToken();
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || ''}` },
        body: form
      });
      const data = await res.json();
      if (!res.ok) { setMicError(data.error || 'Transcription failed'); return; }
      const text = String(data?.text || '').trim();
      if (!text) return;
      if (data?.confirmationRequired) {
        setPendingTranscript(text);
        setPendingTranscriptDraft(text);
      } else {
        setUserInput(prev => (prev ? prev + ' ' : '') + text);
      }
    } catch { setMicError('Transcription error'); }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isAnsweredQuestion = !!message.isQuestion && !!message.answered;
    const bubbleCls = isUser
      ? 'bg-[#dcf8e6] bubble-tail-right'
      : (isAnsweredQuestion ? 'bg-white/80' : 'bg-white bubble-tail-left');
    const timeStr = message.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return (
      <motion.div key={message.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[85%] sm:max-w-xl w-fit rounded-lg px-3 py-2 shadow-sm ${bubbleCls}`}>
          <p className={`text-sm leading-relaxed ${isAnsweredQuestion ? 'text-gray-500' : 'text-gray-800'} whitespace-pre-wrap`}>{message.content}</p>
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[11px] text-[#667781]">{timeStr}</span>
            {isUser && (
              <svg className="w-3.5 h-3.5 text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.266a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/></svg>
            )}
          </div>
          {message.renderType === 'timeline' && message.logs && (
            <div className="mt-3 space-y-2">
              {message.logs.map((log) => {
                const sevVal = typeof log.severity_scale === 'number' ? log.severity_scale : undefined;
                const badge = (() => {
                  if (typeof sevVal !== 'number') return null;
                  const cls = sevVal <= 3
                    ? 'bg-gray-100 text-gray-700'
                    : sevVal <= 6
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-700';
                  return <span className={`text-[11px] px-2 py-0.5 rounded ${cls}`}>Severity {sevVal}/10</span>;
                })();
                return (
                  <div key={log.id} className="border border-gray-200 rounded-md bg-white px-3 py-2">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{log.symptom_name || log.symptom_type}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {badge}
                        <div className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      {log.functional_impact ? <span className="truncate">Impact: {log.functional_impact}</span> : null}
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
                        className="ml-auto text-blue-600 hover:underline"
                      >Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {message.isQuestion && message.options && (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {message.options.map((option, idx) => {
                const disabled = !!message.answered || isLoading || isBotTyping;
                const isSelected = message.selectedOption === option;
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={(e) => handleButtonClick(option, message.id, e)}
                    className={`text-left px-3 py-2 text-sm rounded-lg border transition-colors ${isSelected ? 'bg-[#e8f5ec] border-[#34A853] text-[#2d6a3f] font-medium' : 'bg-white hover:bg-[#f0faf2] border-gray-200 text-gray-700 hover:border-[#34A853]/50'} ${disabled && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
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
    setFlow('pdf');
    pendingFlowSwitchRef.current = null;
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
    setFlow('timeline');
    pendingFlowSwitchRef.current = null;
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
    <div className="h-full flex flex-col bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto">
          <AnimatePresence>{messages.map(renderMessage)}</AnimatePresence>
          {(isLoading || isBotTyping) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
              <div className="bg-white px-4 py-3 rounded-lg shadow-sm bubble-tail-left">
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-[#34A853] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#34A853] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-[#34A853] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#f8faf8] border-t border-gray-100 px-4 py-2.5">
        <div className="mx-auto">
          {pendingTranscript && (
            <div className="mb-2 rounded-lg border border-[#34A853]/30 bg-[#f8faf8] p-3">
              <div className="text-xs text-gray-700 mb-2">
                I heard this. Edit if needed, then add it:
              </div>
              <textarea
                value={pendingTranscriptDraft}
                onChange={(event) => setPendingTranscriptDraft(event.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900"
                rows={3}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = pendingTranscriptDraft.trim();
                    if (!text) return;
                    setUserInput((prev) => (prev ? `${prev} ${text}` : text));
                    setPendingTranscript(null);
                    setPendingTranscriptDraft('');
                  }}
                  className="rounded-md bg-[#34A853] hover:bg-[#2d9249] px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Use This Text
                </button>
                <button
                  onClick={() => {
                    setPendingTranscript(null);
                    setPendingTranscriptDraft('');
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2.5 border border-gray-200 flex items-center">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
                placeholder="Type your message..."
                className="w-full text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleTextSubmit}
              disabled={isLoading || isBotTyping || !userInput.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isLoading || isBotTyping || !userInput.trim() ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-[#34A853] hover:bg-[#2d9249] text-white'}`}
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
            <button
              onClick={toggleRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#34A853] hover:bg-[#2d9249] text-white'}`}
              aria-label="Toggle voice recording"
              aria-pressed={isRecording}
            >
              {isRecording ? <Square size={14} /> : <Mic size={16} />}
            </button>
          </div>
          {micError && <div className="text-xs text-red-600 mt-1">{micError}</div>}
        </div>
      </div>
    </div>
  );
};

export default SymptomChat;
