import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface InviteInfo {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  expires_at: string;
}

type PageState = "loading" | "valid" | "invalid" | "expired" | "accepted" | "error";

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAccessToken } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }
    fetch(`/api/auth/invite/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setInviteInfo(data);
          setPageState("valid");
        } else if (res.status === 410) {
          setPageState("expired");
        } else if (res.status === 409) {
          setPageState("accepted");
        } else {
          setPageState("invalid");
        }
      })
      .catch(() => setPageState("error"));
  }, [token]);

  const handleAccept = async () => {
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/admin");
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to accept invite");
      }
    } catch {
      setErrorMsg("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {pageState === "loading" && (
            <p className="text-muted-foreground text-sm">Validating invite...</p>
          )}

          {pageState === "invalid" && (
            <div className="space-y-4 text-center">
              <p className="text-destructive font-medium">Invalid invite link.</p>
              <p className="text-sm text-muted-foreground">This invite link is not recognised. Please request a new one from your manager.</p>
            </div>
          )}

          {pageState === "expired" && (
            <div className="space-y-4 text-center">
              <p className="text-destructive font-medium">Invite link has expired.</p>
              <p className="text-sm text-muted-foreground">Invite links are valid for 72 hours. Ask your manager to send a new invite.</p>
            </div>
          )}

          {pageState === "accepted" && (
            <div className="space-y-4 text-center">
              <p className="font-medium">This invite has already been accepted.</p>
              <Button onClick={() => navigate("/login")} className="w-full">Go to Login</Button>
            </div>
          )}

          {pageState === "error" && (
            <p className="text-destructive text-sm">Something went wrong. Please try again later.</p>
          )}

          {pageState === "valid" && inviteInfo && (
            <div className="space-y-5">
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">{inviteInfo.first_name} {inviteInfo.last_name}</p>
                <p className="text-sm text-muted-foreground">{inviteInfo.email}</p>
                <p className="text-xs text-muted-foreground capitalize">Role: {inviteInfo.role.replace("_", " ")}</p>
              </div>

              <div className="space-y-1">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-1">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>

              {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={submitting || !password || !confirmPassword}
              >
                {submitting ? "Setting up account..." : "Accept & Set Password"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
