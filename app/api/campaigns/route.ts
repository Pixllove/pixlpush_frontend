import { NextResponse } from 'next/server';

const response = (method: string, body?: unknown) => NextResponse.json({ ok: true, method, data: body ?? { campaigns: [] } });
export async function GET() { return response('GET', { campaigns: [] }); }
export async function POST(request: Request) { return response('POST', await request.json()); }
export async function PUT(request: Request) { return response('PUT', await request.json()); }
export async function PATCH(request: Request) { return response('PATCH', await request.json()); }
export async function DELETE(request: Request) { return response('DELETE', await request.json()); }
