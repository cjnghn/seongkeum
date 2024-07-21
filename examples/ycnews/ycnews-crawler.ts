import { Crawler } from "../../src/crawler";

const crawler = new Crawler({
  headless: false,
  maxConcurrency: 1,
  maxRetries: 3,
  maxRequestsPerCrawl: 100,
});

// crawler.addPreTaskHandler(async ({ context }) => {
//   const page = await context.newPage();
//   await page.goto("https://news.ycombinator.com/login");
//   await page.fill("input[name='acct']", "your_username");
//   await page.fill("input[name='pw']", "your_password");
//   await Promise.all([
//     page.click("input[type='submit']"),
//     page.waitForLoadState("domcontentloaded"),
//   ]);
//   await page.close();
// });

crawler.addRequestHandler(
  "^https://news\\.ycombinator\\.com/(?:news)?(?:\\?p=\\d+)?$",
  async ({ page, enqueueRequest }) => {
    const newsItems = await page.$$(".athing");
    for (const item of newsItems) {
      const id = await item.getAttribute("id");
      if (id) {
        enqueueRequest({ url: `https://news.ycombinator.com/item?id=${id}` });
      }
    }

    // 다음 페이지 처리
    const moreLink = await page.$(".morelink");
    if (moreLink) {
      const nextPageUrl = await moreLink.getAttribute("href");
      if (nextPageUrl) {
        enqueueRequest({ url: `https://news.ycombinator.com/${nextPageUrl}` });
      }
    }
  }
);

crawler.addRequestHandler(
  "^https://news\\.ycombinator\\.com/item",
  async ({ page, request }) => {
    const title = await page.$eval(
      ".titleline a",
      (el) => el.textContent || ""
    );
    const url = await page.$eval(
      ".titleline a",
      (el) => el.getAttribute("href") || ""
    );
    let points = 0;
    let author = "";
    let time = "";
    const subtext = await page.$(".subtext");
    if (subtext) {
      const scoreEl = await subtext.$(".score");
      if (scoreEl) {
        points = parseInt((await scoreEl.textContent()) || "0", 10);
      }
      const userEl = await subtext.$(".hnuser");
      if (userEl) {
        author = (await userEl.textContent()) || "";
      }
      const ageEl = await subtext.$(".age");
      if (ageEl) {
        time = (await ageEl.getAttribute("title")) || "";
      }
    }
    const comments = await page.$$eval(".commtext", (elements) =>
      elements.map((el) => {
        const commentEl = el.closest(".comtr");
        return {
          author: commentEl?.querySelector(".hnuser")?.textContent || "",
          text: el.textContent || "",
          time: commentEl?.querySelector(".age")?.getAttribute("title") || "",
        };
      })
    );
    console.log({ title, url, points, author, time, comments });
  }
);

(async () => {
  await crawler.run([{ url: "https://news.ycombinator.com/" }]);
})();
