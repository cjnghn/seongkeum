# Lamina

Lamina는 웹 크롤링을 위한 간단하고 강력한 TypeScript 라이브러리입니다. Playwright를 사용하여 브라우저를 제어하고 데이터를 수집할 수 있습니다.

## 설치

```bash
npm install lamina
```

## 사용법

### 기본 크롤러 설정

```typescript
import { Crawler } from "lamina";

const crawler = new Crawler({
  headless: true,
  maxConcurrency: 5,
});

crawler.addRequestHandler(
  "^https://example\\.com/page",
  async ({ page, enqueueRequest }) => {
    const items = await page.$$(".item");
    for (const item of items) {
      const url = await item.getAttribute("href");
      if (url) {
        enqueueRequest({ url: `https://example.com${url}` });
      }
    }
  }
);

await crawler.run([{ url: "https://example.com" }]);
```

### 로그인 처리 예제

```typescript
crawler.addPreTaskHandler(async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://example.com/login");
  await page.fill("input[name='username']", "your_username");
  await page.fill("input[name='password']", "your_password");
  await page.click("button[type='submit']");
  await page.close();
});
```

## 기여

기여를 환영합니다! 버그를 발견하거나 기능을 제안하려면 이슈를 제출해 주세요.

## 라이선스

이 프로젝트는 ISC 라이선스에 따라 라이선스가 부여됩니다.
