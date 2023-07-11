#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const {
  createBrowser,
  createNewPage,
  browsePageUrl,
  scrollPageDown,
} = require("./utils");

const { TIMEOUT } = process.env || {};

const link =
  "https://www.douyin.com/user/MS4wLjABAAAAPBy3RvZCDzzlLlzUvHurU4wyKT3Q-2KXSov4n1plH3f_qYtRNKm3z2Ba0fZhwN89?vid=7249762293624491324";

const url = process.argv[2];
const timeout = process.argv[3] || +TIMEOUT;

const douyinUrl = "https://www.douyin.com";

const snaptikDownload = async (page, url) => {
  // console.log(`[Snaptik] go to https://snaptik.app`);
  // await page.goto("https://snaptik.app/", { waitUntil: "networkidle" });
  await browsePageUrl(page, "https://snaptik.app/");

  console.log("[Snaptik] wait for url");
  await page.waitForSelector("#url", { state: "visible", timeout });

  console.log(`[Snaptik] fill url: ${url}`);
  await page.fill("#url", url);

  console.log("[Snaptik] wait for button go");
  await page.waitForSelector(".button-go", { state: "visible", timeout });

  console.log("[Snaptik] click button go");
  await page.click(".button-go");

  console.log("[Snaptik] wait for button download");
  await page.waitForSelector("#download", { state: "visible", timeout });

  const waitEventDownload = page.waitForEvent("download");

  console.log("[Snaptik] download now :)");
  await page.click("#download a");

  const download = await waitEventDownload;
  const downloadedFilePath = await download.path();
  const downloadedFileName = await download.suggestedFilename();

  const newFilePath = path.join(
    path.dirname(downloadedFilePath),
    downloadedFileName
  );

  await fs.rename(downloadedFilePath, newFilePath);
};

async function main() {
  if (!url) {
    console.log("The url is required. please try again with url.");
    console.log(`Ex: yarn start ${link}`);
    return;
  }

  const browser = await createBrowser();
  const page = await createNewPage(browser);

  await browsePageUrl(page, url);
  await scrollPageDown(page, 200);

  console.log("Wait for url elements ...");
  await page.waitForSelector('a[href^="/video"]', {
    state: "visible",
    timeout,
  });

  console.log("Fetching urls from elements");
  const linkElements = await page.$$('a[href^="/video"]');

  const links = [];
  for (const linkElement of linkElements) {
    const href = await linkElement.getAttribute("href");
    links.push(href.indexOf(douyinUrl) !== -1 ? href : douyinUrl + href);
  }
  console.log(`Fetched ${links.length} urls`, links);

  console.log("Saving links to file ...");
  fs.writeFile("links.txt", links.join("\n"), (err) => {
    if (err) throw err;
    console.log("Saved links to file");
  });

  for (const link of links) {
    await snaptikDownload(page, link);
  }

  await browser.close();
}

main();
