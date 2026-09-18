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

    // 1. 금액 추출 (숫자 + 원)
    const amountMatch = text.match(/([\d,]+)\s*원/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 0;

    // 2. 가맹점/내용 정제 (금액 또는 결제 관련 키워드가 포함된 핵심 줄 추출)
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    
    // '원', '승인', '결제', '이용료' 등이 포함된 핵심 줄 찾기
    const targetLine = lines.find((line: string) => 
      line.includes('원') || line.includes('승인') || line.includes('결제') || line.includes('이용료')
    );

    // 핵심 줄이 있으면 해당 줄을 사용하고, 없으면 상단 불필요한 줄을 제외한 첫 번째 줄 사용
    let storeCandidate = targetLine || lines.find((line: string) => !line.includes('LTE') && !line.includes('공지')) || lines[0] || '미분류 결제';

    // 60자 초과 시 절삭
    const store = storeCandidate.length > 60 ? storeCandidate.substring(0, 60) + '...' : storeCandidate;

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
