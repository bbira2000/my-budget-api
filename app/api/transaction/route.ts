import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    // 1. Gemini REST API 직접 호출 (별도 패키지 설치 필요 없음)
    const prompt = `
    다음은 휴대폰 화면 OCR로 추출된 텍스트입니다. 
    이 텍스트에서 결제 내역 정보를 분석하여 반드시 지정된 JSON 구조로만 응답하세요.
    
    [응답 JSON 형식]
    {
      "store": "가맹점명 또는 결제 서비스명 (예: 스타벅스, SKT, 토스페이 등 짧고 명확하게)",
      "amount": 숫자만_포함된_결제금액_정수 (예: 3500),
      "category": "식비|교통|통신|쇼핑|생활|기타 중 하나 선택"
    }

    [OCR 텍스트]
    ${text}
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message || 'Gemini API 호출 실패');
    }

    const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsedData = JSON.parse(rawJsonText);

    // 2. Supabase DB 저장
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          raw_text: text,
          amount: parsedData.amount || 0,
          store: parsedData.store || '미분류 결제',
          category: parsedData.category || '기타'
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, parsed: parsedData, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'API가 정상 동작 중입니다.' });
}
