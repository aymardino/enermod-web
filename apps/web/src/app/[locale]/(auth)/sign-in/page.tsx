import { AuthForm } from "@/components/admin/auth-forms";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <AuthForm mode="sign-in" next={next || "/contribute"} error={error} />;
}
