import { NextRequest, NextResponse } from 'next/server';

const AGENT_URL = process.env.LOCAL_AGENT_URL || 'http://localhost:4500';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${AGENT_URL}/run-validated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Could not reach local agent: ${error?.message || 'unknown error'}` },
      { status: 502 }
    );
  }
}