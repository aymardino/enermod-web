"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { AdminPage } from "@/components/admin/admin-shell";
import { NativeSelect } from "@/components/ui/select";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Callout } from "@/components/observatory/kpi";

type Row = { id: string; email: string; name: string; organisation: string; role: string; created_at: string; last_login_at: string | null };

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const c = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const users = useQuery<Row[]>({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users"), retry: false });
  const setRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }), onSuccess: () => { toast.success(c("saved")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }, onError: (e) => toast.error(e instanceof ApiError ? e.message : c("error")) });
  if (users.error) {
    return (
      <AdminPage>
        <PageHeader title={t("title")} />
        <Callout tone="amber">{t("adminOnly")}</Callout>
      </AdminPage>
    );
  }
  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("lede")} />
      {!users.data ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("email")}</TH>
              <TH lowPriority>{t("name")}</TH>
              <TH>{t("role")}</TH>
              <TH lowPriority>{t("joined")}</TH>
              <TH>{t("lastLogin")}</TH>
            </TR>
          </THead>
          <TBody className="[&>tr:last-child>td]:border-b-2 [&>tr:last-child>td]:border-rule">
            {users.data.map((u) => (
              <TR key={u.id}>
                <TD className="font-semibold">{u.email}</TD>
                <TD lowPriority className="max-w-[28em] truncate text-ink-2">
                  {u.name}
                  {u.organisation ? <span className="text-muted-foreground"> · {u.organisation}</span> : ""}
                </TD>
                <TD className="py-1.5">
                  <NativeSelect
                    className="w-44"
                    value={u.role}
                    disabled={u.id === me?.id}
                    aria-label={t("roleOf", { email: u.email })}
                    onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })}
                  >
                    {["contributor", "curator", "admin"].map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </TD>
                <TD lowPriority className="text-[13px] tabular-nums text-muted-foreground">{formatDate(u.created_at, locale)}</TD>
                <TD className="text-[13px] tabular-nums text-muted-foreground">{formatDate(u.last_login_at, locale)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-4 max-w-[52em] font-display text-[14.5px] leading-[1.45] text-muted-foreground">{t("hint")}</p>
    </AdminPage>
  );
}
