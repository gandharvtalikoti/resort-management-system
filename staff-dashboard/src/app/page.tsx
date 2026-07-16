'use client';

import AuthGate from './components/AuthGate';
import StaffDashboard from './components/StaffDashboard';

export default function Home() {
  return (
    <AuthGate>
      <StaffDashboard />
    </AuthGate>
  );
}
