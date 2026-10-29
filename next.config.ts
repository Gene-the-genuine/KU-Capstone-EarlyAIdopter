import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // create-next-app 16.4 기본값인 cacheComponents / partialPrefetching 은 껐습니다.
  // 켜 두면 페이지에서 cookies()나 params를 <Suspense> 밖에서 읽을 때 빌드 오류가 나는데,
  // 이 앱은 모든 화면이 로그인/링크마다 다른 데이터라 캐시로 얻는 이득이 거의 없습니다.
  // 자세한 이유: README.md "기술 선택 메모"
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
