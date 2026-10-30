"use client";

import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shareUrl } from "@/lib/api";

/**
 * 공유 링크 / QR 모달 — 공유 확정 직후 자동으로, 그 뒤에는 "공유 링크 보기"로 엽니다.
 * (SPEC 4장, 목업 docs/ui/session-shared.html 의 modal-link)
 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  sessionNumber,
  sharePath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionNumber: number;
  sharePath: string;
}) {
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // 열리면 링크 입력창(전체 선택돼 보임) 대신 "복사" 버튼에 커서를 둡니다.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          copyButtonRef.current?.focus();
        }}
      >
        <ShareLinkBody sessionNumber={sessionNumber} sharePath={sharePath} copyButtonRef={copyButtonRef} />
      </DialogContent>
    </Dialog>
  );
}

// 모달이 열렸을 때만 그려지므로 브라우저 주소(window.location.origin)를 바로 써도 됩니다.
function ShareLinkBody({
  sessionNumber,
  sharePath,
  copyButtonRef,
}: {
  sessionNumber: number;
  sharePath: string;
  copyButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const url = shareUrl(sharePath); // 배포 주소에서도 맞는 절대 주소 (SPEC 4장)
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("링크를 복사했습니다.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // http 로 접속했거나 브라우저가 막으면 자동 복사가 안 됩니다 → 직접 복사하도록 선택해 둡니다.
      inputRef.current?.select();
      toast.error("자동 복사가 되지 않았습니다. 선택된 링크를 직접 복사하세요.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{sessionNumber}회기가 공유되었습니다</DialogTitle>
        <DialogDescription>아래 링크나 QR 코드를 내담자에게 전달하세요.</DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex justify-center">
        <div className="rounded-lg border border-line bg-white p-3">
          {/* fgColor = DESIGN.md 의 ink 색 */}
          <QRCodeSVG value={url} size={160} fgColor="#1E2925" title="공유 링크 QR 코드" />
        </div>
      </div>

      <Label htmlFor="share-url" className="mt-5">
        공유 링크
      </Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          ref={inputRef}
          id="share-url"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 bg-canvas text-muted-foreground"
        />
        <Button ref={copyButtonRef} variant="outline" className="h-10 shrink-0 px-4" onClick={() => void copy()}>
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <div className="mt-2 text-right">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          내담자 화면으로 열어보기 ↗
        </a>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        링크를 가진 사람은 누구나 이 내담자의 공유된 회기를 볼 수 있습니다.
      </p>
    </>
  );
}
