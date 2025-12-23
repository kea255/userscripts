// ==UserScript==
// @name        TOTP
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.0
// @author      -
// @description gen totp codes
// ==/UserScript==

async function totp(secret, digits=6, period=30) {
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0, key = [];
  for (let c of secret.toUpperCase()) {
    let i = b32.indexOf(c); if (i < 0) continue;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { key.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  key = new Uint8Array(key);  // ← Переприсвоение

  let time = Math.floor(Date.now() / 1000 / period);
  const tbuf = new Uint8Array(8); 
  for (let i = 7; i >= 0; i--) { tbuf[i] = time & 255; time >>= 8; }

  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = await crypto.subtle.sign('HMAC', k, tbuf);
  const hb = new Uint8Array(h);
  const off = hb[hb.length - 1] & 15;
  let code = ((hb[off] & 127) << 24) | (hb[off + 1] << 16) | (hb[off + 2] << 8) | hb[off + 3];
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

GM_registerMenuCommand("01. Тест TOTP", async function(event) {
	totp('HNGAQ6QFUISNMRVS').then(function(code){
		prompt('Генерированный код:', code)
		console.log('Генерированный код:', code);
	});
});