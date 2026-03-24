const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:6688';
const FRONTEND_URL = 'http://localhost:8080';

const logs = {
    console: [],
    network: [],
    errors: []
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('='.repeat(60));
    console.log('OpenNovel IDE Connection Test');
    console.log('='.repeat(60));

    let browser = null;
    let page = null;

    try {
        console.log('\n[1/7] Testing backend health...');
        const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
        const healthData = await healthResponse.json();
        console.log(`  Backend health: ${JSON.stringify(healthData)}`);

        console.log('\n[2/7] Connecting to Lightpanda CDP...');
        browser = await puppeteer.connect({
            browserWSEndpoint: 'ws://127.0.0.1:9222',
            defaultViewport: { width: 1920, height: 1080 }
        });
        console.log('  Connected to Lightpanda');

        const context = await browser.createBrowserContext();
        page = await context.newPage();

        page.on('console', msg => {
            const text = msg.text();
            logs.console.push({ type: msg.type(), text });
            console.log(`  [Console:${msg.type()}] ${text.substring(0, 200)}`);
        });

        page.on('request', req => {
            logs.network.push({ type: 'request', url: req.url() });
        });

        page.on('response', res => {
            logs.network.push({ type: 'response', url: res.url(), status: res.status() });
        });

        page.on('pageerror', err => {
            logs.errors.push(err.message);
            console.log(`  [Error] ${err.message}`);
        });

        console.log('\n[3/7] Navigating to frontend...');
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('  Page loaded');
        
        console.log('\n[4/7] Waiting for VS Code to initialize (30s)...');
        await sleep(30000);

        console.log('\n[5/7] Searching for OpenNovel elements...');
        
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log(`  Body contains "OpenNovel": ${bodyText.includes('OpenNovel')}`);
        console.log(`  Body contains "disconnected": ${bodyText.includes('disconnected')}`);
        console.log(`  Body contains "Connect": ${bodyText.includes('Connect')}`);

        const allButtons = await page.$$('button');
        console.log(`  Total buttons: ${allButtons.length}`);
        for (let i = 0; i < Math.min(10, allButtons.length); i++) {
            try {
                const text = await allButtons[i].evaluate(e => e.textContent);
                if (text) console.log(`    Button ${i}: "${text.substring(0, 50)}"`);
            } catch (e) {}
        }

        const statusPart = await page.$$('.statusbar-item');
        console.log(`  Status bar items: ${statusPart.length}`);

        const ariaLabels = await page.evaluate(() => {
            const elements = document.querySelectorAll('[aria-label]');
            return Array.from(elements).slice(0, 20).map(e => e.getAttribute('aria-label'));
        });
        console.log('  Aria labels found:');
        ariaLabels.forEach(l => {
            if (l && (l.includes('OpenNovel') || l.includes('Novel') || l.includes('Status'))) {
                console.log(`    - ${l}`);
            }
        });

        console.log('\n[6/7] Trying to find and click OpenNovel status...');
        
        const statusElements = await page.$$('*');
        let foundOpenNovel = false;
        
        for (const el of statusElements) {
            try {
                const text = await el.evaluate(e => {
                    const t = e.textContent || '';
                    const aria = e.getAttribute('aria-label') || '';
                    return { text: t.substring(0, 100), aria: aria.substring(0, 100) };
                });
                
                if (text.text.includes('OpenNovel') || text.aria.includes('OpenNovel')) {
                    console.log(`  Found OpenNovel element: text="${text.text}" aria="${text.aria}"`);
                    foundOpenNovel = true;
                    await el.click();
                    console.log('  Clicked!');
                    await sleep(5000);
                    break;
                }
            } catch (e) {}
        }

        if (!foundOpenNovel) {
            console.log('  OpenNovel element not found');
        }

        console.log('\n[7/7] Collecting final logs...');

        const opennovelLogs = logs.console.filter(l => 
            l.text.includes('[OpenNovel]') || l.text.includes('[HttpClient]')
        );
        console.log('\n--- OpenNovel/HttpClient Console Logs ---');
        if (opennovelLogs.length === 0) {
            console.log('  (No relevant logs found)');
        } else {
            opennovelLogs.forEach(l => console.log(`  ${l.text}`));
        }

        const healthReqs = logs.network.filter(l => l.url?.includes('/api/health'));
        console.log('\n--- Health API Requests ---');
        healthReqs.forEach(r => console.log(`  ${r.type}: ${r.url} ${r.status || ''}`));

        const failed = logs.network.filter(l => l.type === 'failed');
        console.log('\n--- Failed Requests ---');
        if (failed.length === 0) {
            console.log('  (No failed requests)');
        } else {
            failed.forEach(r => console.log(`  ${r.url} - ${r.error}`));
        }

        fs.writeFileSync('/tmp/opennovel-test-log.json', JSON.stringify(logs, null, 2));
        console.log('\nFull logs saved to /tmp/opennovel-test-log.json');

    } catch (error) {
        console.error('\nTest failed:', error.message);
        console.error(error.stack);
    } finally {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.disconnect().catch(() => {});
    }
}

runTest();
