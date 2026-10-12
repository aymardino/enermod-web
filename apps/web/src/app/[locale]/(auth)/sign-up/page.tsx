import { AuthForm } from "@/components/admin/auth-forms";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-up" next={next || "/contribute"} />;
}
