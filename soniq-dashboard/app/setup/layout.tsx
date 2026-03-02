import { ThemeProvider } from "@/context/ThemeContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { SetupProvider } from "@/components/setup/SetupContext";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TenantProvider>
          <ConfigProvider>
            <SetupProvider>{children}</SetupProvider>
          </ConfigProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
