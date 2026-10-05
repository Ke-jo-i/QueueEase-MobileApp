import { ActionButton, FormPage, Notice } from '@/components/form';
import { useRouter } from 'expo-router';
export default function AccountRecoveryScreen() {
  const router = useRouter();
  return <FormPage title="Account recovery" subtitle="Ask the QueueEase project administrator to help you regain access.">
    <Notice text="Present your student or staff ID so the administrator can verify your identity and reset your password. After signing in, change it in Profile. Email recovery is not enabled for this installation." />
    <ActionButton label="Back to portals" onPress={() => router.replace('/landing')} />
  </FormPage>;
}
