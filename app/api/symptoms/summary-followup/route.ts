import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { combined, user_id } = body;

    console.log('📋 Generating summary follow-up extractions for:', { combined, user_id });

    // Generate AI-based summary follow-up extractions using LLM
    const extractions = await generateSummaryFollowup(combined, user_id);

    return NextResponse.json({
      extractions
    });

  } catch (error) {
    console.error('❌ Error in summary followup API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSummaryFollowup(combined: string, user_id: string): Promise<string> {
  try {
    // Use the exact summary_followup prompt provided
    const prompt = `Based on the raw input in ${combined} you need to draw out some **BULLET POINT NUMBERED EXTRACTIONS**
These **BULLET POINT NUMBERED EXTRACTIONS** should look something like Example 1 below.

Example 1 start:

**Onset/timeline**: The symptoms started about two weeks ago and have been getting worse.  
**Main symptoms**: I've been needing to pee more, especially during the night.  
**Associated symptoms**: No vision changes, dizziness, or headaches.
**Triggers**: My appetite's the same, but I've lost some weight — my clothes are definitely looser.  
**Recent changes**: No infections or new medications.  
**Family history**: My dad has type 2 diabetes.

Example 1 end:

If the user has not provided enough infomation to explain any of the **BULLET POINT NUMBERED EXTRACTIONS** then it should say "The ${user_id} has not provided enough information about this"

Look below at Example 2 for an idea on how this works. 

Example 2 start:

**Onset/timeline**: The symptoms started about two weeks ago and have been getting worse.  
**Main symptoms**: I've been needing to pee more, especially during the night.  
**Associated symptoms**: The ${user_id} has not provided enough information about this
**Triggers**: The ${user_id} has not provided enough information about this
**Recent changes**: No infections or new medications.  
**Family history**: The ${user_id} has not provided enough information about this

Example 2 end:`;

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.log('⚠️ No OpenAI API key found, using fallback extractions');
      return generateFallbackExtractions(combined, user_id);
    }

    // Use gpt-4o-mini for extraction generation
    try {
      console.log(`🤖 Generating summary followup extractions with gpt-4o-mini`);
      
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
              content: 'You are a UK-based NHS GP assistant. Extract structured clinical information from patient input using the specified bullet point format. Be thorough but concise.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4, // Balanced temperature for structured extraction
          max_tokens: 600,
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

      console.log(`✅ Summary followup extractions generated successfully`);
      return aiResponse.trim();

    } catch (error) {
      console.log(`❌ Error with gpt-4o-mini:`, error.message);
      console.error('❌ Using fallback extractions');
      return generateFallbackExtractions(combined, user_id);
    }

  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    return generateFallbackExtractions(combined, user_id);
  }
}

function generateFallbackExtractions(combined: string, user_id: string): string {
  // Simple fallback extractions if AI fails
  if (!combined || combined.trim().length < 10) {
    return `**Onset/timeline**: The ${user_id} has not provided enough information about this\n**Main symptoms**: The ${user_id} has not provided enough information about this\n**Associated symptoms**: The ${user_id} has not provided enough information about this\n**Triggers**: The ${user_id} has not provided enough information about this\n**Recent changes**: The ${user_id} has not provided enough information about this\n**Family history**: The ${user_id} has not provided enough information about this`;
  }
  
  // Basic extraction attempt
  const lines = combined.split('\n').filter(line => line.trim().length > 0);
  const extractions = [
    `**Onset/timeline**: ${lines[0] || `The ${user_id} has not provided enough information about this`}`,
    `**Main symptoms**: ${lines[1] || `The ${user_id} has not provided enough information about this`}`,
    `**Associated symptoms**: The ${user_id} has not provided enough information about this`,
    `**Triggers**: The ${user_id} has not provided enough information about this`,
    `**Recent changes**: The ${user_id} has not provided enough information about this`,
    `**Family history**: The ${user_id} has not provided enough information about this`
  ];
  
  return extractions.join('\n');
}
