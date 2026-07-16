import { NextResponse } from 'next/server';

// Simple English → Hindi translation map for common notification phrases
const HINDI_TRANSLATIONS: Record<string, string> = {
  'New order from room': 'कमरे से नया ऑर्डर',
  'has requested': 'ने अनुरोध किया है',
  'has requested the bill': 'ने बिल का अनुरोध किया है',
  'has requested an E-Bill': 'ने ई-बिल का अनुरोध किया है',
  'Guest': 'अतिथि',
  'New service request from room': 'कमरे से नई सेवा अनुरोध',
  'needs': 'को चाहिए',
  'cleaning': 'सफाई',
  'towels': 'तौलिये',
  'emergency': 'आपातकाल',
  'extra_pillows': 'अतिरिक्त तकिये',
  'room_service': 'रूम सर्विस',
  'bill_request': 'बिल अनुरोध',
  'ebill_request': 'ई-बिल अनुरोध',
  'Audio enabled': 'ऑडियो चालू है',
};

function translateToHindi(text: string): string {
  // Pattern: "New order from room 101. Guest Arjun has requested 2 Butter Chicken, 1 Naan."
  let hindiText = text;

  // Order notification
  const orderMatch = text.match(/New order from room (\S+)\. Guest (.+?) has requested (.+)\./);
  if (orderMatch) {
    return `कमरा ${orderMatch[1]} से नया ऑर्डर। अतिथि ${orderMatch[2]} ने ${orderMatch[3]} का अनुरोध किया है।`;
  }

  // Bill request
  const billMatch = text.match(/Room (\S+)\. Guest (.+?) has requested the bill\./);
  if (billMatch) {
    return `कमरा ${billMatch[1]}। अतिथि ${billMatch[2]} ने बिल का अनुरोध किया है।`;
  }

  // E-Bill request
  const ebillMatch = text.match(/Room (\S+)\. Guest (.+?) has requested an E-Bill\./);
  if (ebillMatch) {
    return `कमरा ${ebillMatch[1]}। अतिथि ${ebillMatch[2]} ने ई-बिल का अनुरोध किया है।`;
  }

  // Service ticket
  const serviceMatch = text.match(/New service request from room (\S+)\. Guest (.+?) needs (.+)\./);
  if (serviceMatch) {
    const serviceType = HINDI_TRANSLATIONS[serviceMatch[3]] || serviceMatch[3];
    return `कमरा ${serviceMatch[1]} से नई सेवा अनुरोध। अतिथि ${serviceMatch[2]} को ${serviceType} चाहिए।`;
  }

  // Fallback: try simple word replacement
  for (const [en, hi] of Object.entries(HINDI_TRANSLATIONS)) {
    hindiText = hindiText.replace(new RegExp(en, 'g'), hi);
  }
  return hindiText;
}

export async function POST(request: Request) {
  try {
    const { text, language = 'en' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API Key not configured');
      return NextResponse.json({ error: 'ElevenLabs API Key not configured' }, { status: 500 });
    }

    // Translate to Hindi if requested
    const spokenText = language === 'hi' ? translateToHindi(text) : text;

    // Rachel voice (21m00Tcm4TlvDq8ikWAM) is a popular female voice in ElevenLabs
    const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: spokenText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API Error:', errorText);
      return NextResponse.json({ error: 'Failed to generate speech' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

