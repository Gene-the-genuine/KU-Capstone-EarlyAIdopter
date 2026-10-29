import "server-only";

/**
 * 꼭 필요한 환경변수를 읽습니다. 없으면 무엇을 설정해야 하는지 알려 주는 오류를 냅니다.
 * 환경변수 목록과 설명: .env.example
 */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. 로컬은 .env.local, 배포는 Vercel 환경변수를 확인하세요. (README.md 참고)`,
    );
  }
  return value;
}
