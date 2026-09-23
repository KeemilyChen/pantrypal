import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set("pantrypal_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("pantrypal_demo")
  return NextResponse.json({ ok: true })
}
