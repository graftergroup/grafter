import { useState, useEffect, useCallback } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail, Plus, Pencil, Trash2, Send, CheckCircle, XCircle,
  Eye, EyeOff, Server, ChevronRight, Settings2, AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailAccount {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
  password_set: boolean;
}

interface PurposeAssignment {
  purpose: string;
  label: string;
  description: string | null;
  account_id: string | null;
  account_name: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type TestState = "idle" | "sending" | "success" | "error";

const BLANK_ACCOUNT: Omit<EmailAccount, "id" | "password_set"> = {
  name: "",
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  from_email: "",
  from_name: "Grafter",
  is_active: true,
};

const PURPOSE_ICONS: Record<string, string> = {
  staff_invitation: "👤",
  customer_notification: "🔔",
  billing: "💳",
  system_alerts: "⚠️",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SuperadminSettings() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [purposes, setPurposes] = useState<PurposeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Account dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [form, setForm] = useState({ ...BLANK_ACCOUNT, smtp_password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<EmailAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Test email per-account
  const [testTarget, setTestTarget] = useState<EmailAccount | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState("");

  // Purpose saving
  const [purposeSaveStates, setPurposeSaveStates] = useState<Record<string, SaveState>>({});

  const token = () => localStorage.getItem("access_token");
  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, purRes] = await Promise.all([
        fetch("/api/superadmin/settings/email-accounts", { headers: authHeaders() }),
        fetch("/api/superadmin/settings/email-purposes", { headers: authHeaders() }),
      ]);
      const [accData, purData] = await Promise.all([accRes.json(), purRes.json()]);
      setAccounts(Array.isArray(accData) ? accData : []);
      setPurposes(Array.isArray(purData) ? purData : []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Account Dialog ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingAccount(null);
    setForm({ ...BLANK_ACCOUNT, smtp_password: "" });
    setShowPassword(false);
    setSaveState("idle");
    setSaveError("");
    setDialogOpen(true);
  }

  function openEdit(acc: EmailAccount) {
    setEditingAccount(acc);
    setForm({
      name: acc.name,
      smtp_host: acc.smtp_host,
      smtp_port: acc.smtp_port,
      smtp_username: acc.smtp_username,
      from_email: acc.from_email,
      from_name: acc.from_name,
      is_active: acc.is_active,
      smtp_password: "",
    });
    setShowPassword(false);
    setSaveState("idle");
    setSaveError("");
    setDialogOpen(true);
  }

  async function saveAccount() {
    setSaveState("saving");
    setSaveError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        smtp_host: form.smtp_host,
        smtp_port: Number(form.smtp_port),
        smtp_username: form.smtp_username,
        from_email: form.from_email,
        from_name: form.from_name,
        is_active: form.is_active,
      };
      if (form.smtp_password) body.smtp_password = form.smtp_password;

      const url = editingAccount
        ? `/api/superadmin/settings/email-accounts/${editingAccount.id}`
        : "/api/superadmin/settings/email-accounts";
      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || "Save failed");
      }
      setSaveState("saved");
      setTimeout(() => {
        setDialogOpen(false);
        fetchAll();
      }, 800);
    } catch (e: unknown) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/superadmin/settings/email-accounts/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setDeleteTarget(null);
      fetchAll();
    } finally {
      setDeleting(false);
    }
  }

  // ── Test Email ────────────────────────────────────────────────────────────

  function openTest(acc: EmailAccount) {
    setTestTarget(acc);
    setTestEmail("");
    setTestState("idle");
    setTestMessage("");
  }

  async function sendTest() {
    if (!testTarget || !testEmail) return;
    setTestState("sending");
    try {
      const res = await fetch(`/api/superadmin/settings/email-accounts/${testTarget.id}/test`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to_email: testEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestState("success");
        setTestMessage(data.message || "Test email sent.");
      } else {
        setTestState("error");
        setTestMessage(data.detail || "Test failed.");
      }
    } catch {
      setTestState("error");
      setTestMessage("Network error.");
    }
  }

  // ── Purpose Assignment ────────────────────────────────────────────────────

  async function assignPurpose(purpose: string, accountId: string) {
    setPurposeSaveStates((s) => ({ ...s, [purpose]: "saving" }));
    try {
      const res = await fetch(`/api/superadmin/settings/email-purposes/${purpose}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ account_id: accountId === "__none__" ? "" : accountId }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPurposes((prev) => prev.map((p) => (p.purpose === purpose ? updated : p)));
      setPurposeSaveStates((s) => ({ ...s, [purpose]: "saved" }));
      setTimeout(() => setPurposeSaveStates((s) => ({ ...s, [purpose]: "idle" })), 2000);
    } catch {
      setPurposeSaveStates((s) => ({ ...s, [purpose]: "error" }));
      setTimeout(() => setPurposeSaveStates((s) => ({ ...s, [purpose]: "idle" })), 3000);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SuperadminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage email accounts and routing for platform notifications.
            </p>
          </div>
        </div>

        {/* ── Email Accounts ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Email Accounts</h2>
              <Badge variant="secondary" className="text-xs">{accounts.length}</Badge>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Account
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Mail className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No email accounts configured yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                Add your first account
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{acc.name}</span>
                        {!acc.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Inactive</Badge>
                        )}
                        {!acc.password_set && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/10">
                            No password
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {acc.from_email} &middot; {acc.smtp_host}:{acc.smtp_port}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => openTest(acc)}
                    >
                      <Send className="w-3.5 h-3.5" /> Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(acc)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(acc)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Purpose Routing ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Email Routing</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Assign an email account to each notification type. Unassigned purposes will use the fallback SMTP config.
          </p>

          <div className="space-y-2">
            {purposes.map((p) => (
              <div
                key={p.purpose}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl leading-none">{PURPOSE_ICONS[p.purpose] ?? "📧"}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={p.account_id ?? "__none__"}
                    onValueChange={(val) => assignPurpose(p.purpose, val)}
                    disabled={accounts.length === 0}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Not assigned" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    >
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">
                        Not assigned
                      </SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="w-5 h-5 flex items-center justify-center">
                    {purposeSaveStates[p.purpose] === "saving" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                    {purposeSaveStates[p.purpose] === "saved" && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                    {purposeSaveStates[p.purpose] === "error" && (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {purposes.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No email purposes found.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Add / Edit Account Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)",
          }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Email Account" : "Add Email Account"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Name</Label>
              <Input
                placeholder="e.g. Primary Outbox"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SMTP Host</Label>
                <Input
                  placeholder="smtp.example.com"
                  value={form.smtp_host}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Port</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={form.smtp_port}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_port: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Username</Label>
              <Input
                placeholder="you@example.com"
                value={form.smtp_username}
                onChange={(e) => setForm((f) => ({ ...f, smtp_username: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                SMTP Password
                {editingAccount?.password_set && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    (leave blank to keep current)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={editingAccount?.password_set ? "••••••••" : "Enter password"}
                  value={form.smtp_password}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_password: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From Email</Label>
                <Input
                  placeholder="no-reply@example.com"
                  value={form.from_email}
                  onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From Name</Label>
                <Input
                  placeholder="Grafter"
                  value={form.from_name}
                  onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
                />
              </div>
            </div>

            {saveState === "error" && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveState === "saving"}>
                Cancel
              </Button>
              <Button onClick={saveAccount} disabled={saveState === "saving" || saveState === "saved"}>
                {saveState === "saving" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Saving…</>
                ) : saveState === "saved" ? (
                  <><CheckCircle className="w-3.5 h-3.5 mr-2" />Saved</>
                ) : (
                  "Save Account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)",
          }}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Delete Email Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong className="text-foreground">{deleteTarget?.name}</strong>? Any purposes assigned to this account will become unassigned.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Test Email Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!testTarget} onOpenChange={() => setTestTarget(null)}>
        <DialogContent
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)",
          }}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Using account: <strong className="text-foreground">{testTarget?.name}</strong>
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendTest()}
              />
            </div>

            {testState === "success" && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                {testMessage}
              </div>
            )}
            {testState === "error" && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {testMessage}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setTestTarget(null)}>
              Close
            </Button>
            <Button
              onClick={sendTest}
              disabled={!testEmail || testState === "sending"}
            >
              {testState === "sending" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Sending…</>
              ) : (
                <><Send className="w-3.5 h-3.5 mr-2" />Send Test</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperadminLayout>
  );
}
