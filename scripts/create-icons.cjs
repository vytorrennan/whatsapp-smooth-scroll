const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const icons = await page.evaluate(() => {
      const source = document.createElement('canvas'); source.width = source.height = 512;
      const c = source.getContext('2d'); c.scale(4,4);
      c.fillStyle = '#168452'; c.beginPath(); c.roundRect(0,0,128,128,28); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineJoin = c.lineCap = 'round';
      c.beginPath(); c.moveTo(38,25); c.lineTo(90,25); c.quadraticCurveTo(105,25,105,40); c.lineTo(105,74); c.quadraticCurveTo(105,89,90,89); c.lineTo(59,89); c.lineTo(37,104); c.lineTo(37,89); c.quadraticCurveTo(23,89,23,74); c.lineTo(23,40); c.quadraticCurveTo(23,25,38,25); c.stroke();
      for (const [y,width] of [[44,45],[57,37],[70,28]]) { c.beginPath(); c.moveTo(40,y); c.lineTo(40+width,y); c.stroke(); }
      return [16,48,128].map(size => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source,0,0,size,size); return [size,canvas.toDataURL('image/png').split(',')[1]]; });
    });
    const dir = path.resolve(__dirname,'../extension/icons'); fs.mkdirSync(dir,{ recursive:true });
    for (const [size,data] of icons) fs.writeFileSync(path.join(dir,`${size}.png`),Buffer.from(data,'base64'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
