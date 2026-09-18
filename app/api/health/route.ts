import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({ ok: true, service: 'pixlpush-web', timestamp: new Date().toISOString() }); }
