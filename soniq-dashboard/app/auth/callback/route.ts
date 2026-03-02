import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function resolveAppOrigin(request: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appOrigin = resolveAppOrigin(request);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/setup";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    const loginUrl = new URL("/login", appOrigin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Ignore errors from Server Component context
            }
          },
        },
      },
    );

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Successful auth - redirect to the next URL
      const redirectUrl = new URL(next, appOrigin);
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange failed
    const loginUrl = new URL("/login", appOrigin);
    loginUrl.searchParams.set("error", "Failed to complete authentication");
    return NextResponse.redirect(loginUrl);
  }

  // No code provided
  const loginUrl = new URL("/login", appOrigin);
  loginUrl.searchParams.set("error", "No authentication code provided");
  return NextResponse.redirect(loginUrl);
}
