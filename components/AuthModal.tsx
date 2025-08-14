import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { uid, colors } from "../lib/helpers";
import { loadUsers, saveUsers, saveSession } from "../lib/storage";
import { API_URL, signInApi, signUpApi } from "../lib/api";
import { useI18n } from '../lib/i18n';

export default function AuthModal({ 
  onSignedIn, 
  trigger 
}: { 
  onSignedIn: () => void; 
  trigger: () => React.ReactNode 
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState<any>({});
  const { t } = useI18n();
  const firstFieldRef = useRef<HTMLInputElement|null>(null);
  useEffect(()=> { if(open) { setTimeout(()=> firstFieldRef.current?.focus(), 50); } }, [open, tab]);

  const handleSignIn = async () => {
    if (API_URL) {
      const res = await signInApi(form.email, form.password);
  if (!res) return alert(t('auth.invalid')||'Invalid credentials');
      saveSession({ email: res.email, token: res.token });
      setOpen(false); onSignedIn(); return;
    }
    // local fallback
    const users = loadUsers();
    const u = users.find((x) => x.email === form.email && x.password === form.password);
  if (!u) return alert(t('auth.invalid')||'Invalid credentials');
    saveSession({ email: u.email });
    setOpen(false);
    onSignedIn();
  };

  const handleSignUp = async () => {
    if (API_URL) {
      const res = await signUpApi({ email: form.email, password: form.password, name: form.name, type: form.type });
  if(!res) return alert(t('auth.signupFailed')||'Sign up failed');
      saveSession({ email: res.email, token: res.token }); setOpen(false); onSignedIn(); return;
    }
    const users = loadUsers();
    if (users.some((x) => x.email === form.email)) return alert("Email already exists");
    const user = { id: uid(), email: form.email, password: form.password, name: form.name || "User", type: form.type || "general", category: form.category || "", website: form.website || "", bio: form.bio || "", avatar: "" };
    saveUsers([...users, user]);
    saveSession({ email: user.email });
    setOpen(false);
    onSignedIn();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tab === "signin" ? t('auth.signin') : t('auth.signup')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={tab === "signin" ? "default" : "outline"}
              onClick={() => setTab("signin")}
              className="flex-1"
            >
              {t('auth.signin')}
            </Button>
            <Button
              variant={tab === "signup" ? "default" : "outline"}
              onClick={() => setTab("signup")}
              className="flex-1"
            >
              {t('auth.signup')}
            </Button>
          </div>

          <Input
            ref={firstFieldRef}
            type="email"
            placeholder={t('auth.email')}
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            type="password"
            placeholder={t('auth.password')}
            value={form.password || ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {tab === "signup" && (
            <>
              <Input
                placeholder={t('auth.fullname')}
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Select
                value={form.type || "general"}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger aria-label={t('auth.accountType')}>
                  <SelectValue placeholder={t('auth.accountType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General User</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <Button
            onClick={tab === "signin" ? handleSignIn : handleSignUp}
            disabled={!form.email || !form.password}
            className="w-full"
            style={{ background: colors.gold, color: colors.black }}
          >
            {tab === "signin" ? t('auth.signin') : t('auth.signup')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
