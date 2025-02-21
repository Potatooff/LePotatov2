import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  
  const response = await fetch('http://localhost:8000/user_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Backend error' }, { status: response.status })
  }

  // If streaming, pipe the response
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('text/event-stream')) {
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const data = await response.json()
  return NextResponse.json(data)
}
