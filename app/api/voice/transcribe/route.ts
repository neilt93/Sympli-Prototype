import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Validate API key format and check for corruption
    if (!openaiApiKey || 
        !openaiApiKey.startsWith('sk-') || 
        openaiApiKey.includes('SUPABASE_URL') ||
        openaiApiKey.length < 20) {
      console.error('Invalid or corrupted OpenAI API key detected');
      return NextResponse.json(
        { error: 'OpenAI API key not properly configured. Please check your environment variables.' },
        { status: 500 }
      );
    }

    // Convert the file to a buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Get the file extension and MIME type
    const fileName = audioFile.name || 'recording';
    const fileExtension = fileName.split('.').pop() || 'webm';
    const mimeType = audioFile.type || 'audio/webm';

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: mimeType }), `${fileName}.${fileExtension}`);
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        return formData;
      })(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Whisper API error:', errorData);
      console.error('File details:', { fileName, fileExtension, mimeType, fileSize: audioFile.size });
      
      // Check if it's an API key error
      if (errorData.error?.code === 'invalid_api_key') {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your configuration.' },
          { status: 401 }
        );
      }
      
      // Check if it's a file format error
      if (errorData.error?.message?.includes('Invalid file format')) {
        return NextResponse.json(
          { error: `Unsupported audio format. Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm. Received: ${fileExtension}` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const transcribedText = data.text?.trim();

    if (!transcribedText) {
      return NextResponse.json(
        { error: 'No text was transcribed from the audio' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: transcribedText,
      success: true
    });

  } catch (error) {
    console.error('Error in voice transcription API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
