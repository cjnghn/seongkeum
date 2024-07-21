import { Page, BrowserContext } from "playwright";
import { Crawler } from "./crawler";

// Define the supported browser types
export type BrowserType = "chromium" | "firefox" | "webkit";

// Define the options that can be passed to the Crawler
export interface CrawlerOptions {
  maxConcurrency?: number;
  maxRequestsPerCrawl?: number;
  browserType?: BrowserType;
  headless?: boolean;
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
  downloadTimeout?: number;
  requestHandlerTimeoutSecs?: number;
}

// Define the structure of a request option
export interface RequestOptions {
  url: string;
  userData?: any;
  headers?: Record<string, string>;
  method?: string;
  payload?: string;
}

// Define the context in which a request handler operates
export interface RequestContext {
  request: RequestOptions;
  page: Page;
  crawler: Crawler;
  enqueueRequest: (request: RequestOptions) => void;
}

// Define the pre-task handler context
export interface PreTaskHandlerContext {
  context: BrowserContext;
}

// Define the type of a request handler function
export type RequestHandler = (context: RequestContext) => Promise<void>;

// Define the type of a pre-task handler function
export type PreTaskHandler = (context: PreTaskHandlerContext) => Promise<void>;
