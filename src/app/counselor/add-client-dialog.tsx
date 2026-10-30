"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorBox } from "@/components/feedback";
import { FormField } from "@/components/form-field";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage, isUnauthorized } from "@/lib/api";
import { addClientSchema, LIMITS, todayInKorea } from "@/lib/schemas";
import type { CounselorClient } from "@/lib/types";

type Form = { name: string; birthDate: string; purposeNote: string };
type Field = keyof Form;
const EMPTY_FORM: Form = { name: "", birthDate: "", purposeNote: "" };

/** 내담자 추가 모달 (목업 docs/ui/dashboard.html 의 modal-add) */
export function AddClientDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (client: CounselorClient) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // 닫으면 입력값을 비웁니다.
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = addClientSchema.safeParse(form);
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
      const { client } = await api.counselor.addClient(form);
      onAdded(client);
      toast.success(`${client.name} 님을 추가했습니다.`);
      handleOpenChange(false);
    } catch (err) {
      if (isUnauthorized(err)) return router.replace("/login");
      if (err instanceof ApiError && err.field && err.field in form) {
        setFieldErrors({ [err.field as Field]: err.message });
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>내담자 추가</DialogTitle>
          <DialogDescription>시연용 합성 정보만 입력하세요.</DialogDescription>
        </DialogHeader>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField
            id="c-name"
            label="이름"
            error={fieldErrors.name}
            input={
              <Input
                id="c-name"
                placeholder="예: 김하늘"
                maxLength={LIMITS.clientName}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? "c-name-message" : undefined}
              />
            }
          />
          <FormField
            id="c-birth"
            label="생년월일"
            error={fieldErrors.birthDate}
            input={
              <Input
                id="c-birth"
                type="date"
                min="1900-01-01"
                max={todayInKorea()}
                value={form.birthDate}
                onChange={(event) => update("birthDate", event.target.value)}
                aria-invalid={fieldErrors.birthDate ? true : undefined}
                aria-describedby={fieldErrors.birthDate ? "c-birth-message" : undefined}
              />
            }
          />
          <FormField
            id="c-purpose"
            label="상담 목적 메모"
            labelNote="(선택 · 내담자에게 보이지 않음)"
            error={fieldErrors.purposeNote}
            input={
              <Textarea
                id="c-purpose"
                rows={3}
                maxLength={LIMITS.purposeNote}
                className="field-sizing-fixed text-sm"
                value={form.purposeNote}
                onChange={(event) => update("purposeNote", event.target.value)}
                aria-invalid={fieldErrors.purposeNote ? true : undefined}
                aria-describedby={fieldErrors.purposeNote ? "c-purpose-message" : undefined}
              />
            }
          />

          {error && <ErrorBox>{error}</ErrorBox>}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 px-4">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" className="h-10 px-4" disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  추가하는 중…
                </>
              ) : (
                "추가"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
