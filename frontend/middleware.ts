import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Use jose for edge compatibility in middleware
const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue || "dev-secret");

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth/login"];

// Routes that require admin role
const adminRoutes = ["/admin"];

// Routes that require user role (sellers)
const userRoutes = ["/seller"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API routes except protected ones
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/me")) {
    // API routes handle their own auth
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token using jose (Edge compatible)
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check admin routes
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role !== "admin") {
        // Non-admin trying to access admin routes
        const sellerUrl = new URL("/seller", request.url);
        return NextResponse.redirect(sellerUrl);
      }
    }

    // Check user routes
    if (userRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role !== "user") {
        // Admin trying to access user routes - redirect to admin
        const adminUrl = new URL("/admin", request.url);
        return NextResponse.redirect(adminUrl);
      }
    }

    // Root path redirect based on role
    if (pathname === "/") {
      if (payload.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/seller", request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid token, redirect to login
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|icon-.*|apple-icon.*).*)",
  ],
};
