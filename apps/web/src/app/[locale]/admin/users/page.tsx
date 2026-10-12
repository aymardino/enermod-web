"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type Row = { id: string; email: string; name: string; organisation: string; role: string; created_at: string; last_login_at: string | null };

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const c = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const users = useQuery<Row[]>({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users"), retry: false });
  const setRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }), onSuccess: () => { toast.success(c("saved")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }, onError: (e) => toast.error(e instanceof ApiError ? e.message : c("error")) });
  if (users.error) return <div className="mx-auto max-w-5xl px-4 py-8"><PageHeader title={t("title")} /><p className="text-muted-foreground">{t("adminOnly")}</p></div>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("lede")} />
      {!users.data ? <Skeleton className="h-64" /> : (
        <Table>
          <THead><TR><TH>{t("email")}</TH><TH>{t("name")}</TH><TH>{t("role")}</TH><TH>{t("joined")}</TH><TH>{t("lastLogin")}</TH></TR></THead>
          <TBody>
            {users.data.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">{u.email}</TD><TD className="text-muted-foreground">{u.name}{u.organisation ? ` · ${u.organisation}` : ""}</TD>
                <TD><select value={u.role} disabled={u.id === me?.id} onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })} className="h-8 rounded-md border border-input bg-card px-2 text-sm">{["contributor", "curator", "admin"].map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}</select></TD>
                <TD className="text-xs text-muted-foreground">{formatDate(u.created_at, locale)}</TD><TD className="text-xs text-muted-foreground">{formatDate(u.last_login_at, locale)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
