import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Mail, Server, Key, User, Send, CheckCircle, XCircle,
  Eye, EyeOff, Save, Settings,
} from "lucide-react";

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password_set: boolean;
  smtp_from_email: string;
  smtp_from_name: string;
}

type TestStatus = "idle" | "sending" | "success" | "error";

export function SuperadminSettings() {
  const [config, setConfig] = useState<SmtpConfig>({
    smtp_host: "", smtp_port: "587", smtp_username: "",
    smtp_password_set: false, smtp_from_email: "", smtp_from_name: "Grafter",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password field — separate so we don't accidentally overwrite with blank
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Test email
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");

  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    fetch("/api/superadmin/settings/smtp", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, string | null> = {
        smtp_host:       config.smtp_host,
        smtp_port:       config.smtp_port,
        smtp_username:   config.smtp_username,
        smtp_from_email: config.smtp_from_email,
        smtp_from_name:  config.smtp_from_name,
        smtp_password:   newPassword || null, // null = don't change
      };
      const res = await fetch("/api/superadmin/settings/smtp", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated: SmtpConfig = await res.json();
        setConfig(updated);
        setNewPassword("");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTestStatus("sending");
    setTestMessage("");
    try {
      const res = await fetch("/api/superadmin/settings/smtp/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: testEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(data.message);
      } else {
        setTestStatus("error");
        setTestMessage(data.detail || "Test failed");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error");
    }
    setTimeout(() => setTestStatus("idle"), 6000);
  };

  const field = (label: string, key: keyof SmtpConfig, icon: React.ReactNode, opts?: {
    type?: string; placeholder?: string; hint?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        {icon} {label}
      </Label>
      <Input
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder}
        value={String(config[key] ?? "")}
        onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
        className="h-9 text-sm"
        disabled={loading}
      />
      {opts?.hint && (
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{opts.hint}</p>
      )}
    </div>
  );

  return (
    <SuperadminLayout title="Platform Settings">
      <div className="space-y-6 max-w-2xl animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--amber) / 0.12)", border: "1px solid hsl(var(--amber) / 0.25)" }}>
            <Settings className="w-5 h-5" style={{ color: "hsl(var(--amber))" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Platform Settings</h1>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Configure global platform behaviour
            </p>
          </div>
        </div>

        {/* SMTP Card */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid hsl(var(--border))" }}>

          {/* Card header */}
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ background: "hsl(var(--sidebar-bg))", borderBottom: "1px solid hsl(var(--border))" }}>
            <Mail className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Email / SMTP</h2>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Used for staff invitations and system notifications
              </p>
            </div>
            {/* Status badge */}
            <div className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={config.smtp_host && config.smtp_password_set
                ? { background: "hsl(var(--green) / 0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.25)" }
                : { background: "hsl(var(--amber) / 0.1)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.25)" }
              }>
              {config.smtp_host && config.smtp_password_set ? (
                <><CheckCircle className="w-3 h-3" /> Configured</>
              ) : (
                <><XCircle className="w-3 h-3" /> Not configured</>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
            <div className="grid grid-cols-2 gap-4">
              {field("SMTP Host", "smtp_host",
                <Server className="w-3 h-3" />,
                { placeholder: "smtp.gmail.com" }
              )}
              {field("Port", "smtp_port",
                <Server className="w-3 h-3" />,
                { placeholder: "587", hint: "587 (TLS) or 465 (SSL)" }
              )}
            </div>

            {field("Username", "smtp_username",
              <User className="w-3 h-3" />,
              { placeholder: "you@yourdomain.com", type: "email" }
            )}

            {/* Password — special handling */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Key className="w-3 h-3" /> Password
                {config.smtp_password_set && !newPassword && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>
                    saved
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={config.smtp_password_set ? "Leave blank to keep existing password" : "Enter password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-sm pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 nav-transition"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {field("From Address", "smtp_from_email",
                <Mail className="w-3 h-3" />,
                { placeholder: "noreply@yourdomain.com", type: "email" }
              )}
              {field("From Name", "smtp_from_name",
                <Mail className="w-3 h-3" />,
                { placeholder: "Grafter" }
              )}
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2"
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
              >
                {saved
                  ? <><CheckCircle className="w-4 h-4" /> Saved!</>
                  : saving
                    ? <><Save className="w-4 h-4" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save SMTP Settings</>
                }
              </Button>
            </div>
          </div>

          {/* Test section */}
          <div className="px-5 py-4 space-y-3"
            style={{ background: "hsl(var(--accent) / 0.5)", borderTop: "1px solid hsl(var(--border))" }}>
            <p className="text-xs font-medium text-foreground">Test Configuration</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Send test email to…"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-9 text-sm flex-1"
                disabled={testStatus === "sending"}
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!testEmail || testStatus === "sending" || !config.smtp_host}
                className="flex items-center gap-2 h-9 text-sm flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {testStatus === "sending" ? "Sending…" : "Send Test"}
              </Button>
            </div>

            {testStatus !== "idle" && testMessage && (
              <div className="flex items-start gap-2 text-sm p-3 rounded-lg"
                style={testStatus === "success"
                  ? { background: "hsl(var(--green) / 0.08)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.2)" }
                  : { background: "hsl(var(--red) / 0.08)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.2)" }
                }>
                {testStatus === "success"
                  ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                }
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperadminLayout>
  );
}
