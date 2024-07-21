import fs from "fs/promises";
import { Crawler } from "./crawler";
import { CrawlerOptions } from "./types";

export async function createCrawler(
  options: CrawlerOptions = {}
): Promise<Crawler> {
  const crawler = new Crawler(options);
  return crawler;
}

export async function saveDataToJSON(
  data: any,
  filePath: string
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
