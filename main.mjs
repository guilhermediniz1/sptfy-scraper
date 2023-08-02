import puppeteer from "puppeteer";
import ytdl from "ytdl-core";
import { createWriteStream } from "fs";
import { downloadAudio } from "./download.mjs";
import readline from "readline"
import process from "process";

const trackList = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getUserInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: "new",
  });
  const page = await browser.newPage();

  const url = await getUserInput("Informe o link da playlist que deseja utilizar: ")

  // Navigate the page to a URL
  await page.goto(url);

  console.log("\nBuscando playlist...")

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  const selector = '[data-testid="tracklist-row"]';

  await page.waitForSelector(selector);

  const trackElements = await page.$$(selector);

  for (const elementHandle of trackElements) {
    const titleElement = await elementHandle.$$(
      '[data-testid="internal-track-link"]',
    );
    const musicTitle = await titleElement[0].handle.evaluate(
      (el) => el.textContent,
    );

    const artistElement = await elementHandle.$$('a[href^="/artist/"]');
    const artistName = await artistElement[0].handle.evaluate(
      (el) => el.textContent,
    );

    let data = `${musicTitle}, ${artistName}`;

    trackList.push(data);
  }
  
  console.log("\nBuscando links no youtube...")

  const youtubeLinksList = await getYoutubeTrackLinksSequentially(
    browser,
    trackList,
  );

  const writer = createWriteStream("youtubeLinks.txt", {
    flags: "a",
  });

  const eraser = createWriteStream("youtubeLinks.txt", {
    flags: "w",
  });

  eraser.write("");
  for (const index in youtubeLinksList) {
    writer.write(`${youtubeLinksList[index]}\n`);
  }

  console.log("\nIniciando downloads...")

  await downloadAudio(trackList);
})();

async function getYoutubeTrackLinksSequentially(browser, tracks) {
  let page = await browser.newPage();
  const links = [];

  for (const track of tracks) {
    if (page && page.isClosed()) {
      page = await browser.newPage();
    }

    await page.goto("https://www.youtube.com/results?search_query=" + track);

    const youtubeSelector = "ytd-video-renderer";
    await page.waitForSelector(youtubeSelector);
    const youtubeVideoElement = await page.$(youtubeSelector);

    const linkElement = await youtubeVideoElement.$('a[id="thumbnail"]');
    const trackLink = await linkElement.evaluate((el) => el.href);
    links.push(trackLink);
    await page.close();
  }

  await browser.close();

  return links;
}

async function downloadYoutubeAudio(link, trackName) {
  ytdl(link, { filter: "audioonly" }).pipe(
    createWriteStream(`${trackName}.mp3`),
  );
}
