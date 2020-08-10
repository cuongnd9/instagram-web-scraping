import puppeteer from 'puppeteer';
import { logger } from 'juno-js';
import { diana } from 'diana-js';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import axios from 'axios';
import { uniq } from 'lodash';

config();

const INSTAGRAM_USER = process.env.INSTAGRAM_USER || 'abcxyz';
const INSTAGRAM_PWD = process.env.INSTAGRAM_PWD || 'password';

const main = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // puimekster
  await page.goto('https://www.instagram.com/sunihalinh', { waitUntil: 'networkidle2' });

  // username
  await page.waitForSelector("[name='username']");
  await page.type("[name='username']", INSTAGRAM_USER);

  // password
  await page.keyboard.down('Tab');
  await page.keyboard.type(INSTAGRAM_PWD);

  await page.click('button[type=submit]');
  await page.waitForNavigation();

  await page.evaluate(() => Array.from(document.querySelectorAll('button')).forEach((item) => {
    if (item.innerText = 'Save Info') {
      item.click();
    }
  }));
  await page.waitForNavigation();

  let urls: string[] = [];
  let previousHeight = 0;
  while (previousHeight != await page.evaluate('document.body.scrollHeight')) {
    logger.info('🚀 scrolling page...', 'urls.length', urls.length);
    previousHeight = await page.evaluate('document.body.scrollHeight') as number;
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitFor(3000); // depend on the internet.
    urls = [
      ...urls,
      ...await page.evaluate(() => Array.from(document.querySelectorAll('img')).map((item: HTMLImageElement) => item.src).filter((item) => item !== '')),
    ];
  }

  await Promise.all(uniq(urls).map(async (url) => {
    await downloadImage(url);
  }));

  await browser.close();
};

async function downloadImage(url: string) {
  logger.info('🧰 downloading image...', url);

  const path: string = resolve(__dirname, '..', 'assets', `${diana()}.png`);
  const writer = createWriteStream(path);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

main().catch(logger.error);
