import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { combined, user_id } = body;

    console.log('📝 Generating clinical summary for:', { combined, user_id });

    // Generate AI-based clinical summary using LLM
    const summary = await generateClinicalSummary(combined, user_id);

    return NextResponse.json({
      summary
    });

  } catch (error) {
    console.error('❌ Error in summary generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateClinicalSummary(combined: string, user_id: string): Promise<string> {
  try {
    // Use the exact summary_prompt provided
    const prompt = `Provide a cleaned-up, almost word-for-word summary of ${combined} with perfect grammar and no filler words like 'um' and 'ah'. Remove anything that doesnt strictly relate to the issue. Do not add random information that the user has not spoke about. It HAS to be a close summary of their actual words with perfect grammar.

If the ${combined} is not medically valid, and in any way that is inappropriate respond with:  
"The ${user_id} has not mentioned any appropriate health-related concerns"

Here is the raw input:
${combined}`;

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.log('⚠️ No OpenAI API key found, using fallback summary');
      return generateFallbackSummary(combined, user_id);
    }

    // Use gpt-4o-mini for summary generation
    try {
      console.log(`🤖 Generating clinical summary with gpt-4o-mini`);
      
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
              content: 'You are a UK-based NHS GP assistant. Generate clean, grammatically correct clinical summaries from patient input. Focus on medical relevance and clarity.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for consistent, accurate summaries
          max_tokens: 500,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
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

      console.log(`✅ Summary generated successfully`);
      return aiResponse.trim();

    } catch (error) {
      console.log(`❌ Error with gpt-4o-mini:`, error.message);
      console.error('❌ Using fallback summary');
      return generateFallbackSummary(combined, user_id);
    }

  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    return generateFallbackSummary(combined, user_id);
  }
}

function generateFallbackSummary(combined: string, user_id: string): string {
  // Simple fallback summary if AI fails
  if (!combined || combined.trim().length < 10) {
    return `The ${user_id} has not mentioned any appropriate health-related concerns`;
  }
  
  // Basic cleaning and formatting
  const cleaned = combined
    .replace(/\b(um|ah|uh|er|hmm)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned || `The ${user_id} has not mentioned any appropriate health-related concerns`;
}
