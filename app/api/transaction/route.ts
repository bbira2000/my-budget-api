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

    // 1. 금액 추출 (숫자 + 원 조합)
    const amountMatch = text.match(/([\d,]+)\s*원/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 0;

    // 2. 가맹점명 추출 (알림 줄 단위로 분리하여 불필요한 상단바/안내문 제거)
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    
    // 금액이 포함된 줄 또는 결제 키워드가 포함된 줄 우선 탐색
    let storeCandidate = lines.find((line: string) => 
      line.includes('원') || line.includes('승인') || line.includes('결제')
    ) || lines[0] || '알 수 없음';

    // 100자 초과 시 절삭
    const store = storeCandidate.length > 100 ? storeCandidate.substring(0, 100) + '...' : storeCandidate;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          raw_text: text,
          amount: amount,
          store: store,
          category: '미분류'
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'API가 정상 동작 중입니다.' });
}
