"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorBox } from "@/components/feedback";
import { FormField } from "@/components/form-field";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, errorMessage } from "@/lib/api";
import { LIMITS, signupSchema, type SignupInput } from "@/lib/schemas";

type Field = keyof SignupInput;

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<SignupInput>({ username: "", password: "", passwordConfirm: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // 서버와 같은 규칙(src/lib/schemas.ts)으로 먼저 검사합니다.
    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const errors: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as Field;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    try {
      await api.auth.signup(form);
      router.push("/login?joined=1");
    } catch (err) {
      // 이미 있는 아이디 등 칸이 정해진 오류는 그 칸 아래에, 나머지는 위쪽 상자에 보여 줍니다.
      if (err instanceof ApiError && err.field && err.field in form) {
        setFieldErrors({ [err.field as Field]: err.message });
      } else {
        setError(errorMessage(err));
      }
      setPending(false);
    }
  }

  return (
    <AuthShell title="상담사 회원가입" description="아이디와 비밀번호만으로 가입할 수 있습니다.">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-sm"
        noValidate
      >
        <FormField
          id="su-username"
          label="아이디"
          error={fieldErrors.username}
          input={
            <Input
              id="su-username"
              autoComplete="username"
              maxLength={LIMITS.username}
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              aria-invalid={fieldErrors.username ? true : undefined}
              aria-describedby={fieldErrors.username ? "su-username-message" : undefined}
            />
          }
        />
        <FormField
          id="su-password"
          label="비밀번호"
          error={fieldErrors.password}
          hint={`${LIMITS.passwordMin}자 이상 입력하세요.`}
          input={
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby="su-password-message"
            />
          }
        />
        <FormField
          id="su-password2"
          label="비밀번호 확인"
          error={fieldErrors.passwordConfirm}
          input={
            <Input
              id="su-password2"
              type="password"
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={(event) => update("passwordConfirm", event.target.value)}
              aria-invalid={fieldErrors.passwordConfirm ? true : undefined}
              aria-describedby={fieldErrors.passwordConfirm ? "su-password2-message" : undefined}
            />
          }
        />

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              가입하는 중…
            </>
          ) : (
            "가입하기"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-brand underline-offset-4 hover:underline">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
