import { NewPasswordForm } from "@/components/admin/auth-forms";

/** Choose a new password: reached from the "forgot password" e-mail (the one-time link signs
 *  the person in first) and from the account links. Signed-in visitors only. */
export default function AccountPasswordPage() {
  return <NewPasswordForm />;
}
