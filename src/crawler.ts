import { chromium, firefox, webkit, Browser, BrowserContext } from "playwright";
import PQueue from "p-queue";
import { EventEmitter } from "events";
import {
  CrawlerOptions,
  RequestOptions,
  RequestContext,
  RequestHandler,
  PreTaskHandler,
} from "./types";
import { logger } from "./logger";

export class Crawler extends EventEmitter {
  private options: CrawlerOptions;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private queue: PQueue;
  private requestHandlers: Map<string, RequestHandler> = new Map();
  private defaultRequestHandler: RequestHandler | null = null;
  private preTaskHandlers: PreTaskHandler[] = [];
  private processedRequests: number = 0;

  constructor(options: CrawlerOptions = {}) {
    super();
    this.options = {
      maxConcurrency: 10,
      maxRequestsPerCrawl: Infinity,
      browserType: "chromium",
      headless: true,
      userAgent: "Mozilla/5.0 (compatible; MyBot/1.0; +http://example.com/bot)",
      timeout: 30000,
      maxRetries: 3,
      downloadTimeout: 60000,
      requestHandlerTimeoutSecs: 60,
      ...options,
    };
    this.queue = new PQueue({ concurrency: this.options.maxConcurrency });
  }

  /**
   * Initializes the browser and context.
   */
  public async initialize(): Promise<void> {
    const browserLauncher = this.getBrowserLauncher();
    this.browser = await browserLauncher.launch({
      headless: this.options.headless,
    });
    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent,
    });
    logger.info("Browser initialized");
  }

  private getBrowserLauncher() {
    switch (this.options.browserType) {
      case "firefox":
        return firefox;
      case "webkit":
        return webkit;
      default:
        return chromium;
    }
  }

  /**
   * Closes the browser and context.
   */
  public async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    logger.info("Browser closed");
  }

  /**
   * Adds a request handler for a specific URL pattern.
   * @param urlPattern - The URL pattern to match.
   * @param handler - The request handler function.
   */
  public addRequestHandler(urlPattern: string, handler: RequestHandler): void {
    this.requestHandlers.set(urlPattern, handler);
    logger.info(`Request handler added for pattern: ${urlPattern}`);
  }

  /**
   * Sets the default request handler.
   * @param handler - The default request handler function.
   */
  public setDefaultHandler(handler: RequestHandler): void {
    this.defaultRequestHandler = handler;
    logger.info("Default request handler set");
  }

  /**
   * Adds a pre-task handler to be executed before crawling starts.
   * @param handler - The pre-task handler function.
   */
  public addPreTaskHandler(handler: PreTaskHandler): void {
    this.preTaskHandlers.push(handler);
    logger.info("Pre-task handler added");
  }

  /**
   * Runs the crawler with the given start requests.
   * @param startRequests - The initial requests to start crawling.
   */
  public async run(startRequests: RequestOptions[]): Promise<void> {
    await this.initialize();

    for (const handler of this.preTaskHandlers) {
      await handler({ context: this.context! });
    }

    for (const request of startRequests) {
      this.enqueueRequest(request);
    }

    await this.queue.onIdle();
    await this.close();
  }

  private enqueueRequest(request: RequestOptions): void {
    if (this.processedRequests >= this.options.maxRequestsPerCrawl!) return;

    this.queue.add(() => this.processRequestWithRateLimit(request));
  }

  private async processRequestWithRateLimit(
    request: RequestOptions
  ): Promise<void> {
    const delay = Math.floor(Math.random() * 500) + 100; // Random delay between 100ms and 600ms
    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.processRequest(request);
  }

  private async processRequest(request: RequestOptions): Promise<void> {
    if (!this.context) throw new Error("Browser context is not initialized");

    const page = await this.context.newPage();
    let retries = 0;

    while (retries <= this.options.maxRetries!) {
      try {
        await page.goto(request.url, { timeout: this.options.downloadTimeout });
        const handler =
          this.findMatchingHandler(request.url) || this.defaultRequestHandler;

        if (handler) {
          const context: RequestContext = {
            request,
            page,
            crawler: this,
            enqueueRequest: this.enqueueRequest.bind(this),
          };

          await Promise.race([
            handler(context),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Request handler timeout")),
                this.options.requestHandlerTimeoutSecs! * 1000
              )
            ),
          ]);
        }

        this.processedRequests++;
        this.emit("requestFinished", { url: request.url, succeeded: true });
        logger.info(`Request finished: ${request.url}`);
        break;
      } catch (error) {
        retries++;
        this.emit("requestFailed", {
          url: request.url,
          error,
          retriesLeft: this.options.maxRetries! - retries,
        });
        logger.error(`Request failed: ${request.url} - ${error}`);

        if (retries > this.options.maxRetries!) {
          this.emit("requestMaxRetriesReached", { url: request.url, error });
          logger.error(`Max retries reached for: ${request.url}`);
        }
      }
    }

    await page.close();
  }

  private findMatchingHandler(url: string): RequestHandler | null {
    for (const [pattern, handler] of this.requestHandlers) {
      if (new RegExp(pattern).test(url)) return handler;
    }
    return null;
  }
}
