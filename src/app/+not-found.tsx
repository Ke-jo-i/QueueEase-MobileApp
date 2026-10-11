import { StateScreen } from '@/components/state-screen';
import { useSession } from '@/contexts/session';
import { useRouter } from 'expo-router';

export default function NotFound() {
  const router = useRouter();
  const { role } = useSession();
  return <StateScreen title="This page isn't available" message="Return to your portal to continue." onBack={() => router.replace(role === 'student' ? '/home' : role === 'staff' ? '/staff/dashboard' : role === 'admin' ? '/admin' : '/landing')} />;
}
