import fs from 'node:fs/promises';
import path from 'node:path';

import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const reportDir = path.resolve('reports', 'lighthouse');
const targetUrl = 'http://127.0.0.1:4173';
const thresholds = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90
};

const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox'] });
let cleanupError = null;

try {
  const result = await lighthouse(targetUrl, {
    port: chrome.port,
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
  });

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'report.html'), result.report[0], 'utf8');
  await fs.writeFile(path.join(reportDir, 'report.json'), result.report[1], 'utf8');

  const categories = result.lhr.categories;
  const failures = [];
  for (const key of ['performance', 'accessibility', 'best-practices', 'seo']) {
    const score = Math.round((categories[key]?.score || 0) * 100);
    console.info(`${key}: ${score}`);
    if (score < thresholds[key]) failures.push(`${key} ${score} < ${thresholds[key]}`);
  }
  console.info(`Lighthouse reports written to ${reportDir}`);
  if (failures.length) throw new Error(`Lighthouse thresholds failed: ${failures.join(', ')}`);
} finally {
  try {
    await chrome.kill();
  } catch (error) {
    if (error?.code !== 'EPERM') cleanupError = error;
  }
}

if (cleanupError) throw cleanupError;
