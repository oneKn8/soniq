import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Skip auth when Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured - allow all requests through
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/setup") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/calls") ||
    request.nextUrl.pathname.startsWith("/analytics") ||
    request.nextUrl.pathname.startsWith("/contacts") ||
    request.nextUrl.pathname.startsWith("/calendar") ||
    request.nextUrl.pathname.startsWith("/notifications") ||
    request.nextUrl.pathname.startsWith("/resources");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Check setup completion from the database (tenant record) instead of
  // a client-controllable cookie.
  const isSetupRoute = request.nextUrl.pathname.startsWith("/setup");
  if (isProtectedRoute && user && !isSetupRoute) {
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    const membership = memberships?.[0];

    if (!membership) {
      // No tenant membership - redirect to setup
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("setup_completed, setup_completed_at")
      .eq("id", membership.tenant_id)
      .single();

    const isSetupComplete = Boolean(
      tenant?.setup_completed || tenant?.setup_completed_at,
    );

    if (!isSetupComplete) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged in users away from auth pages
  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    // Check tenant setup state from DB
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    const membership = memberships?.[0];

    if (membership) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("setup_completed, setup_completed_at")
        .eq("id", membership.tenant_id)
        .single();

      const isSetupComplete = Boolean(
        tenant?.setup_completed || tenant?.setup_completed_at,
      );

      url.pathname = isSetupComplete ? "/dashboard" : "/setup";
    } else {
      url.pathname = "/setup";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
