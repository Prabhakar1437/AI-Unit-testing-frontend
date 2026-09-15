import { NextRequest, NextResponse } from 'next/server';

const AGENT_URL = process.env.LOCAL_AGENT_URL || 'http://localhost:4500';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agentRes = await fetch(`${AGENT_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await agentRes.json();
    if (!agentRes.ok) {
      return NextResponse.json({ error: data.error || 'Request failed.' }, { status: agentRes.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not reach the local agent at ${AGENT_URL}. Make sure "npm start" is running in ai-unit-test-agent. (${err?.message || 'unknown error'})` },
      { status: 502 }
    );
  }
}
