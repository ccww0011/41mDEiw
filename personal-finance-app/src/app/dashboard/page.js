import ProtectedLayout from "../protected-layout";

export default function DashboardPage() {
  return (
    <ProtectedLayout>
      <h1>Dashboard (Protected)</h1>
      {/* dashboard content */}
    </ProtectedLayout>
  );
}
