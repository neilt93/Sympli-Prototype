import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

interface SymptomData {
  symptomType: 'headache' | 'fatigue' | 'side_effect' | 'pregnancy' | 'other';
  isNew: 'new' | 'ongoing';
  description: string;
  llmResponses: string[];
  functionalImpact: string;
  emotionalImpact: string;
  triggers: string;
  patterns: string;
  treatmentResponse: string;
  progress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { currentSymptomData, currentQuestionIndex, previousMessages } = body;

    // Generate adaptive questions based on the current context
    const questionData = generateAdaptiveQuestion(currentSymptomData, currentQuestionIndex, user.id);

    return NextResponse.json(questionData);

  } catch (error) {
    console.error('❌ Error in chat question API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateAdaptiveQuestion(
  symptomData: SymptomData, 
  questionIndex: number, 
  userId: string
) {
  const baseQuestions = [
    {
      question: "Is this a new symptom or something ongoing?",
      options: ["New", "Ongoing"],
      inputType: "buttons"
    },
    {
      question: "Can you describe what you're experiencing?",
      inputType: "text"
    }
  ];

  // If it's a base question, return it
  if (questionIndex < baseQuestions.length) {
    return {
      ...baseQuestions[questionIndex],
      isComplete: false
    };
  }

  // Generate adaptive follow-up questions based on symptom type and context
  const adaptiveQuestions = generateAdaptiveQuestions(symptomData, userId);
  const adaptiveIndex = questionIndex - baseQuestions.length;

  if (adaptiveIndex < adaptiveQuestions.length) {
    return {
      ...adaptiveQuestions[adaptiveIndex],
      isComplete: false
    };
  }

  // All questions complete
  return {
    question: "Thank you for providing this information. I'll now save your symptom log.",
    isComplete: true
  };
}

function generateAdaptiveQuestions(symptomData: SymptomData, userId: string) {
  const questions = [];

  // Socrates method questions for detailed symptom assessment
  const socratesQuestions = [
    {
      question: "Where exactly is the problem located?",
      inputType: "text"
    },
    {
      question: "When did this start?",
      inputType: "text"
    },
    {
      question: "How would you describe the sensation? (e.g., sharp, dull, throbbing, burning)",
      inputType: "text"
    },
    {
      question: "Does it spread or move to other areas?",
      inputType: "text"
    },
    {
      question: "What other symptoms occur with this?",
      inputType: "text"
    },
    {
      question: "How has it changed over time?",
      inputType: "text"
    },
    {
      question: "What makes it better or worse?",
      inputType: "text"
    },
    {
      question: "On a scale of 1-10, how severe is it?",
      inputType: "text"
    }
  ];

  questions.push(...socratesQuestions);

  // Functional impact questions
  questions.push({
    question: "How is this affecting your daily activities? (e.g., work, sleep, exercise, social activities)",
    inputType: "text"
  });

  // Emotional impact questions
  questions.push({
    question: "How is this affecting you emotionally? (e.g., stress, anxiety, frustration)",
    inputType: "text"
  });

  // Pattern and trigger questions
  questions.push({
    question: "Have you noticed any patterns or triggers? (e.g., certain foods, stress, time of day)",
    inputType: "text"
  });

  // For ongoing symptoms, ask about progress and treatment
  if (symptomData.isNew === 'ongoing') {
    questions.push({
      question: "How has this symptom progressed since it first started?",
      inputType: "text"
    });

    questions.push({
      question: "Have you tried any treatments or medications? How did they work?",
      inputType: "text"
    });
  }

  // Symptom-specific questions
  switch (symptomData.symptomType) {
    case 'headache':
      questions.push({
        question: "Is this headache on one side or both sides of your head?",
        options: ["One side", "Both sides", "All over"],
        inputType: "buttons"
      });
      questions.push({
        question: "Is this headache accompanied by sensitivity to light or sound?",
        options: ["Yes", "No", "Sometimes"],
        inputType: "buttons"
      });
      break;

    case 'fatigue':
      questions.push({
        question: "Is this fatigue physical, mental, or both?",
        options: ["Physical", "Mental", "Both"],
        inputType: "buttons"
      });
      questions.push({
        question: "Does rest help with the fatigue?",
        options: ["Yes", "No", "Sometimes"],
        inputType: "buttons"
      });
      break;

    case 'side_effect':
      questions.push({
        question: "What medication or treatment are you taking that might be causing this?",
        inputType: "text"
      });
      questions.push({
        question: "When did you start the medication/treatment?",
        inputType: "text"
      });
      break;

    case 'pregnancy':
      questions.push({
        question: "How far along are you in your pregnancy?",
        inputType: "text"
      });
      questions.push({
        question: "Is this your first pregnancy?",
        options: ["Yes", "No"],
        inputType: "buttons"
      });
      break;
  }

  return questions;
}
