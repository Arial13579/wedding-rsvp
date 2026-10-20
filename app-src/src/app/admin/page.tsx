import type { Metadata } from 'next';
import { AuthGate } from '@/components/AuthGate';
import { AdminShell } from '@/components/AdminShell';

export const metadata: Metadata = { title: 'ניהול אישורי הגעה', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminShell />
    </AuthGate>
  );
}
