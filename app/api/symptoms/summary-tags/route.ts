import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { combined } = body;

    console.log('🏷️ Generating summary tags for:', { combined });

    // Generate AI-based summary tags using LLM
    const tags = await generateSummaryTags(combined);

    return NextResponse.json({
      tags
    });

  } catch (error) {
    console.error('❌ Error in summary tags API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSummaryTags(combined: string): Promise<string> {
  try {
    // Use the exact summary_tags prompt provided
    const prompt = `From ${combined} come up with **3-5 tags** that will in some way produce categories that will link to the information in ${combined}.
Examples of tags could include **Cough** **Fatigue** or **allegies suspected**.
If the ${combined} is not medically valid DO NOT HAVE CATEGORIES THAT DO NOT DESCRIBE HEALTH-RELATED CONCERNS.
If the ${combined} is not medically valid, respond with: 
"I only handle health-related concerns. Please describe a valid medical symptom."
Make sure these tags are seperated with a comma so they are not all squished together.
for example this is accepted:   Cough, Fatigue, Allergies suspected 
     
DO NOT DO THIS ->  CoughFatigueAllergiessuspected`;

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.log('⚠️ No OpenAI API key found, using fallback tags');
      return generateFallbackTags(combined);
    }

    // Use gpt-4o-mini for tag generation
    try {
      console.log(`🤖 Generating summary tags with gpt-4o-mini`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a UK-based NHS GP assistant. Generate 3-5 relevant medical tags from patient input. Tags should be comma-separated and medically relevant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5, // Moderate temperature for consistent tagging
          max_tokens: 200,
          presence_penalty: 0.2,
          frequency_penalty: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      console.log(`✅ Summary tags generated successfully`);
      return aiResponse.trim();

    } catch (error) {
      console.log(`❌ Error with gpt-4o-mini:`, error.message);
      console.error('❌ Using fallback tags');
      return generateFallbackTags(combined);
    }

  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    return generateFallbackTags(combined);
  }
}

function generateFallbackTags(combined: string): string {
  // Simple fallback tags if AI fails
  if (!combined || combined.trim().length < 10) {
    return "I only handle health-related concerns. Please describe a valid medical symptom.";
  }
  
  // Basic tag extraction based on common medical terms
  const medicalTerms = [
    'Pain', 'Headache', 'Fatigue', 'Cough', 'Fever', 'Nausea', 'Dizziness',
    'Chest Pain', 'Shortness of Breath', 'Abdominal Pain', 'Joint Pain',
    'Allergies', 'Infection', 'Inflammation', 'Anxiety', 'Depression'
  ];
  
  const words = combined.toLowerCase().split(/\s+/);
  const foundTags = medicalTerms.filter(term => 
    words.some(word => word.includes(term.toLowerCase()))
  );
  
  if (foundTags.length === 0) {
    return "General Symptoms, Medical Consultation";
  }
  
  return foundTags.slice(0, 3).join(', ');
}
