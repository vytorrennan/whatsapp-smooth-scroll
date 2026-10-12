const { test,expect,chromium }=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');

test('works alongside WhatsApp Unlimited Pins without changing pin navigation or storage',async()=>{
 const pinsProject=process.env.WHATSAPP_PINS_PROJECT;
 test.skip(!pinsProject,'Set WHATSAPP_PINS_PROJECT to run the optional companion-extension check.');
 const spec=fs.readFileSync(path.join(pinsProject,'test/browser/ui.spec.cjs'),'utf8');
 const sandbox={require};
 vm.runInNewContext(spec.slice(0,spec.indexOf('let context,page,profile;'))+'\nglobalThis.fixture=fixture;',sandbox);
 const fixture=sandbox.fixture.replace('<div id="main"><header','<div id="main"><div data-testid="conversation-panel-messages" style="height:300px;overflow:auto"><div style="height:1200px">Fixture message history</div></div><header');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'wa-companion-'));
 const extensions=[path.resolve('extension'),path.join(pinsProject,'extension')].join(',');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1100,height:760},args:[`--disable-extensions-except=${extensions}`,`--load-extension=${extensions}`]});
 try{
  await context.route('https://web.whatsapp.com/**',route=>route.fulfill({contentType:'text/html',body:fixture}));
  const page=await context.newPage();await page.goto('https://web.whatsapp.com/');
  await expect(page.locator('#pane-side .wa-unlimited-pin-control')).toHaveCount(50);
  await page.evaluate(()=>{for(let i=0;i<3;i++){window.chats[i].pin=true;document.querySelectorAll('#pane-side [role=row]')[i].querySelector('.rail').insertAdjacentHTML('afterbegin','<svg width="20" height="20"><title>ic-push-pin</title></svg>');}for(const fn of window.changeListeners)fn();});
  const pinned=page.locator('#wa-unlimited-pins .wa-unlimited-pinned-row');
  for(let i=0;i<5;i++){const row=page.locator('#pane-side [role=row]').nth(i);await row.hover();await row.locator('.wa-unlimited-pin-control').getByRole('button').click();await expect(pinned).toHaveCount(i+1);}
  await expect(page.locator('#pane-side [role=row]').first()).toBeHidden();
  await expect(page.locator('[data-testid=conversation-panel-messages]')).not.toHaveCSS('transform','none');
  await expect(page.locator('#pane-side')).toHaveCSS('transform','none');
  const firstTitle=await pinned.first().locator('[data-testid=cell-frame-title]').textContent();
  await pinned.first().click();await expect(page.locator('#opened')).toHaveText(firstTitle);
  const manager=await context.newPage();await manager.goto('chrome://extensions/');
  const items=manager.locator('extensions-manager extensions-item');await expect(items).toHaveCount(2);
  const id=await items.filter({hasText:'WhatsApp Smooth Scroll'}).evaluate(e=>e.id);
  await manager.goto(`chrome-extension://${id}/popup.html`);await manager.getByRole('switch').uncheck();
  await expect(page.locator('[data-testid=conversation-panel-messages]')).toHaveCSS('transform','none');await expect(pinned).toHaveCount(5);
  expect(await page.evaluate(()=>[window.sent,window.searchEdits])).toEqual([0,0]);
  expect(await page.evaluate(()=>window.chats.slice(0,3).map(c=>c.pin))).toEqual([true,true,true]);
  await expect(page.locator('#main [role=textbox]')).toHaveText('Untouched draft');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
