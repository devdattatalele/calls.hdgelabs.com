import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireCompany } from "@/components/RequireCompany";
import { AppShell } from "@/components/AppShell";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { OnboardPage } from "@/pages/OnboardPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CallsPage } from "@/pages/CallsPage";
import { RecordingsPage } from "@/pages/RecordingsPage";
import { CallDetailPage } from "@/pages/CallDetailPage";
import { TranscriptsPage } from "@/pages/TranscriptsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { HelpPage } from "@/pages/HelpPage";
import { TeamPage } from "@/pages/TeamPage";
import { DevicesPage } from "@/pages/DevicesPage";
import { NumbersPage } from "@/pages/NumbersPage";
import { CompanySettingsPage } from "@/pages/CompanySettingsPage";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { ExclusionsPage } from "@/pages/ExclusionsPage";
import { BillingPage } from "@/pages/BillingPage";

export function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/help" element={<HelpPage />} />

      <Route
        path="/onboard"
        element={
          <RequireAuth>
            <OnboardPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireCompany>
            <AppShell />
          </RequireCompany>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/recordings" element={<RecordingsPage />} />
        <Route path="/transcripts" element={<TranscriptsPage />} />
        <Route path="/calls" element={<CallsPage />} />
        <Route path="/calls/:id" element={<CallDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/numbers" element={<NumbersPage />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="/settings/api-keys" element={<ApiKeysPage />} />
        <Route path="/settings/exclusions" element={<ExclusionsPage />} />
        <Route path="/settings/billing" element={<BillingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
