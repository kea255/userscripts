// ==UserScript==
// @name        gosuslugi skip MAX
// @namespace   Violentmonkey Scripts
// @match       https://esia.gosuslugi.ru/logi*
// @grant       none
// @version     1.0
// @author      -
// @description 01.09.2025, 15:18:58
// ==/UserScript==

const observer = new MutationObserver((mutationsList) => {
	document.querySelectorAll('button').forEach(cell => {
		if(cell && cell.textContent.trim() == 'Пропустить') {
			cell.click(); observer.disconnect(); resolve();
		}
	});
});
observer.observe(document.querySelector('body'), {childList: true, subtree: true, characterData: true});
