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

    const amountMatch = text.match(/([\d,]+)원/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 0;
    const store = text.length > 50 ? text.substring(0, 50) + '...' : text;

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
