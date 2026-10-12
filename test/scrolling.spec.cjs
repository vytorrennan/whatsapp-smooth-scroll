const { test,expect,chromium }=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font:16px system-ui;background:#18221d;color:#eef5f1}#app{display:flex;height:700px}#side{width:300px;border-right:1px solid #aaa;padding:20px}#main{flex:1;min-width:0;display:flex;flex-direction:column}header,footer{padding:16px;flex:none}header{border-bottom:1px solid #aaa}footer{border-top:1px solid #aaa}[data-testid=conversation-panel-messages]{overflow:auto;flex:1;min-height:0;position:relative}.message{margin:12px;padding:16px;border-radius:8px;background:#234e3a;box-shadow:0 1px 2px #0004}button{padding:8px}[role=menu]{position:fixed;right:10px;top:70px;background:#44564b;padding:20px;z-index:5}textarea{width:80%;height:50px}
</style></head><body><div id="app"><aside id="side"><h2>Conversations</h2><div id="pane-side" style="overflow:auto;height:400px"><div style="height:1200px">Native list</div></div></aside><section id="main"><header>Test chat <button id="menu">Message options</button></header><div data-testid="conversation-panel-messages">${Array.from({length:40},(_,i)=>`<div class="message"><p>Fixture message ${i}</p><button data-media="${i}">Open media</button></div>`).join('')}</div><footer><textarea aria-label="Draft">Untouched draft</textarea><button id="send">Send</button></footer></section></div><script>
window.sent=0;window.mediaOpened=0;document.querySelector('#send').onclick=()=>window.sent++;
document.querySelector('#menu').onclick=()=>{const menu=document.createElement('div');menu.setAttribute('role','menu');menu.innerHTML='<button role="menuitem">Fixture option</button>';document.body.append(menu);};
document.querySelectorAll('[data-media]').forEach(button=>button.onclick=()=>{window.mediaOpened++;const dialog=document.createElement('dialog');dialog.textContent='Fixture media viewer';document.body.append(dialog);dialog.showModal();});
</script></body></html>`;
let context,page,profile,popup,url;
test.beforeEach(async()=>{
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'wa-smooth-scroll-'));
 const extension=path.resolve('extension');
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1100,height:760},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 await context.route('https://web.whatsapp.com/**',route=>route.fulfill({contentType:'text/html',body:fixture}));
 page=await context.newPage();await page.goto('https://web.whatsapp.com/');await expect(pane()).not.toHaveCSS('transform','none');
 const extensionInfo=await context.newPage();await extensionInfo.goto('chrome://extensions/');
 const manager=extensionInfo.locator('extensions-manager');
 await expect(manager.locator('extensions-item')).toHaveCount(1);
 const id=await manager.locator('extensions-item').evaluate(node=>node.id);
 await extensionInfo.close();url=`chrome-extension://${id}/popup.html`;
 popup=await context.newPage();await popup.goto(url);await expect(popup.getByRole('switch')).toBeEnabled();
});
test.afterEach(async()=>{await context?.close();fs.rmSync(profile,{recursive:true,force:true});});
const pane=()=>page.locator('#main [data-testid=conversation-panel-messages]');

test('enabled by default and only transforms the message viewport',async()=>{
 await expect(popup.getByRole('switch')).toBeChecked();await expect(popup.getByRole('status')).toHaveText('On for WhatsApp Web');
 await expect(pane()).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
 for(const selector of ['#pane-side','#side','#main header','#main footer','#main textarea'])await expect(page.locator(selector)).toHaveCSS('transform','none');
 await expect(page.getByRole('textbox',{name:'Draft'})).toHaveValue('Untouched draft');expect(await page.evaluate(()=>window.sent)).toBe(0);
});

test('popup switches every tab immediately and persists OFF across reloads',async()=>{
 const second=await context.newPage();await second.goto('https://web.whatsapp.com/');
 await expect(second.locator('[data-testid=conversation-panel-messages]')).not.toHaveCSS('transform','none');
 await popup.getByRole('switch').uncheck();await expect(popup.getByRole('status')).toHaveText('Off · native scrolling');
 await expect(pane()).toHaveCSS('transform','none');await expect(second.locator('[data-testid=conversation-panel-messages]')).toHaveCSS('transform','none');
 await page.reload();await expect(pane()).toHaveCSS('transform','none');
 await popup.reload();await expect(popup.getByRole('switch')).not.toBeChecked();
 await popup.getByRole('switch').check();await expect(pane()).not.toHaveCSS('transform','none');await expect(second.locator('[data-testid=conversation-panel-messages]')).not.toHaveCSS('transform','none');
});

test('toggling preserves viewport geometry, scroll position, text selection and draft',async()=>{
 await pane().evaluate(p=>{p.scrollTop=350;const text=p.querySelectorAll('p')[4].firstChild;const r=document.createRange();r.selectNodeContents(text);const s=getSelection();s.removeAllRanges();s.addRange(r);});
 const snapshot=()=>pane().evaluate(p=>({rect:p.getBoundingClientRect().toJSON(),scrollTop:p.scrollTop,scrollHeight:p.scrollHeight,selection:getSelection().toString()}));
 const before=await snapshot();
 for(const enabled of [false,true]){
  await popup.getByRole('switch').setChecked(enabled);await expect.poll(async()=>(await snapshot()).scrollTop).toBe(before.scrollTop);
  expect(await snapshot()).toEqual(before);
 }
 await expect(page.getByRole('textbox',{name:'Draft'})).toHaveValue('Untouched draft');expect(await page.evaluate(()=>window.sent)).toBe(0);
});

test('native wheel scrolling, message options and media viewing remain usable',async()=>{
 await pane().hover();await page.mouse.wheel(0,500);await expect.poll(()=>pane().evaluate(p=>p.scrollTop)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Message options'}).click();await expect(page.getByRole('menu')).toBeVisible();
 const rect=await page.getByRole('menu').evaluate(e=>e.getBoundingClientRect().toJSON());expect(rect.right).toBeLessThanOrEqual(1100);expect(rect.top).toBe(70);
 await page.getByRole('menu').evaluate(e=>e.remove());await pane().evaluate(p=>p.scrollTop=0);
 await page.getByRole('button',{name:'Open media'}).first().click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>window.mediaOpened)).toBe(1);expect(await page.evaluate(()=>window.sent)).toBe(0);
});

test('replacement message panes inherit the rule and disposal restores native rendering',async()=>{
 await pane().evaluate(p=>p.replaceWith(p.cloneNode(true)));await expect(pane()).not.toHaveCSS('transform','none');
 await page.evaluate(()=>document.dispatchEvent(new Event('wa-smooth-scroll-dispose')));await expect(pane()).toHaveCSS('transform','none');
 await popup.getByRole('switch').uncheck();await popup.getByRole('switch').check();await expect(pane()).toHaveCSS('transform','none');
});

test('popup has readable light and dark themes',async()=>{
 for(const scheme of ['light','dark']){await popup.emulateMedia({colorScheme:scheme});await expect(popup.getByRole('heading')).toHaveText('WhatsApp Smooth Scroll');await popup.screenshot({path:`test-results/popup-${scheme}.png`});}
});
