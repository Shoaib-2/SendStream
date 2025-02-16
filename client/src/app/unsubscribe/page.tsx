import { redirect } from 'next/navigation';

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams: { token?: string }
}) {
  if (searchParams.token) {
    redirect(`/unsubscribe-success?token=${searchParams.token}`);
  }
  return null;
}