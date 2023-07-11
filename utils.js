const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const { DEBUG, STORAGE_PATH, BROWSER_PATH } = process.env || {};

const createBrowser = async () => {
  return await chromium.launch({
    debug: DEBUG === "true",
    headless: false,
    recordHar: false,
    downloadsPath: STORAGE_PATH,
    executablePath: BROWSER_PATH,
  });
};

const createNewPage = async (browser) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // await page.setViewportSize({ width: 800, height: 600 });
  await page.setViewportSize({ width: 1024, height: 768 });
  return page;
};

const closeBrowser = async (browser) => {
  if (browser) {
    browser.close();
  }
};

const browsePageUrl = async (page, url) => {
  console.log(`Browse page url ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
};

const scrollPageDown = async (page, delay) => {
  console.log("Scroll page down slowly ...");
  const scrollStep = 250; // Number of pixels to scroll at a time
  const scrollDelay = delay || 100; // Delay between each scroll step in milliseconds

  let currentScrollY = 0;
  let pageHeight = await page.evaluate(() => document.body.scrollHeight);

  while (currentScrollY < pageHeight) {
    currentScrollY += scrollStep;
    await page.evaluate((scrollY) => {
      window.scrollTo(0, scrollY);
    }, currentScrollY);
    await page.waitForTimeout(scrollDelay);
    pageHeight = await page.evaluate(() => document.body.scrollHeight);
  }
};

const downloadVideo = async (link, output, title, onProgress) => {
  try {
    let filePath = path.join(output, `${title}.mp4`);
    let fileNumber = 1;

    while (fs.existsSync(filePath)) {
      filePath = path.join(output, `${title}_${fileNumber}.mp4`);
      fileNumber++;
    }

    const response = await axios.get(link, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    let receivedBytes = 0;
    let totalBytes = parseInt(response.headers["content-length"], 10);

    response.data.on("data", (chunk) => {
      receivedBytes += chunk.length;
      onProgress(receivedBytes, totalBytes);
    });

    response.data.on("end", () => {
      writer.end();
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        resolve({ success: true, filePath }); // Return true for success
      });
      writer.on("error", (error) => {
        reject(error); // Return the error for failure
      });
    });
  } catch (error) {
    throw new Error(`Error downloading video: ${error}`);
  }
};

module.exports = {
  createBrowser,
  createNewPage,
  closeBrowser,
  browsePageUrl,
  scrollPageDown,
  downloadVideo,
};
