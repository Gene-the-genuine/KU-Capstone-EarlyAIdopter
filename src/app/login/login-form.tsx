"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorBox, SuccessBox } from "@/components/feedback";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/api";

export function LoginForm({ justSignedUp }: { justSignedUp: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.auth.login({ username, password });
      router.replace("/counselor"); // 이동이 끝날 때까지 버튼은 계속 "로그인하는 중…"
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <AuthShell title="상담사 로그인" description="회기 기록을 정리하고 내담자에게 공유하세요.">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-sm"
        noValidate
      >
        {justSignedUp && !error && <SuccessBox>가입이 완료되었습니다. 로그인해 주세요.</SuccessBox>}

        <div className="space-y-1.5">
          <Label htmlFor="username">아이디</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </div>

        {/* 로그인 실패 시에만 표시 */}
        {error && <ErrorBox>{error}</ErrorBox>}

        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              로그인하는 중…
            </>
          ) : (
            "로그인"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">
          회원가입
        </Link>
      </p>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        시연용 데모입니다. 실제 상담 정보를 입력하지 마세요.
      </p>
    </AuthShell>
  );
}
