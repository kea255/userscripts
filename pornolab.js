// ==UserScript==
// @name        m255 from pornolab
// @namespace   Violentmonkey Scripts
// @match       https://pornolab.net/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.1
// @updateURL	https://00.gko73.ru/userscripts/pornolab.js
// @downloadURL	https://00.gko73.ru/userscripts/pornolab.js
// @author      -
// @description 17.12.2024, 15:44:28
// ==/UserScript==

GM_registerMenuCommand("01. Открыть все превью",  async function(event) {
	let links = document.querySelectorAll('a.postLink');
	for(el of links){
		if(el.href.indexOf('fastpic.org')>=0){
			let url = el.href.replace('/view','/fullview');
			console.log(url);
			//setTimeout(() => { window.open(el.href.replace('/view','/fullview'), '_blank', 'noopener=yes'); }, 100);
			GM_openInTab(url, {active: false});
			await sleep(500);
		}
	};
});

//――――――――――――――――――――――――――
function sleep(ms){return new Promise(resolve => setTimeout(resolve, ms));}