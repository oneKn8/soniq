import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { AuthBackground } from "@/components/auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen overflow-hidden">
          {/* Animated background */}
          <AuthBackground className="fixed inset-0 z-0" />

          {/* Main content */}
          <div className="relative z-10 min-h-screen">{children}</div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
