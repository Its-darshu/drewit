const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const server = spawn('npx', ['http-server', 'dist', '-p', '5000'], { stdio: 'ignore' });
setTimeout(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', error => {
        console.log('UNCAUGHT ERROR:', error.message);
        console.log(error.stack);
    });
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    await page.goto('http://localhost:5000/index.html');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
    server.kill();
}, 2000);
