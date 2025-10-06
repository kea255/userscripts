// ==UserScript==
// @name        gko_avito
// @namespace   Violentmonkey Scripts
// @match       https://www.avito.ru/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.1
// @updateURL	https://00.gko73.ru/userscripts/gko_avito.js
// @downloadURL	https://00.gko73.ru/userscripts/gko_avito.js
// @author      -
// @description 03.10.2025, 13:56:01
// ==/UserScript==

if(window.location.href.indexOf('/prodam')>=0 || window.location.href.indexOf('/ulyanovskaya_oblast')>=0){
  function check_objs_list(objs){
    objs.forEach((item) => {
        const obj = {
            href: item.querySelector('h2 a')?.href,
            price: item.querySelector('[itemprop="price"]')?.getAttribute('content')
        };
        const formData = new FormData();
        Object.entries(obj).forEach(([k, v]) => formData.append(k, v || ''));

        fetch('https://00.gko73.ru/gko_base/ajax-site.php?act=check_avito_zu', {method: 'POST',body: formData})
        .then(r => r.text())
        .then(data => item.insertAdjacentHTML('beforeend', `<p style="position:relative;font:12px Arial;">${data}</p>`))
        .catch(console.error);
    });
  }

  const observer = new MutationObserver((mutationsList) => {
      let objs = document.querySelectorAll('[class^=items-items] > [class^=iva-item-root]');
      if(objs.length>0) {
        check_objs_list(objs);
        observer.disconnect();
      }
  });
  observer.observe(document.querySelector('[class^=items-items]'), {childList: true, subtree: true, characterData: true});
}

GM_registerMenuCommand("01. Отправить в базу ГКО ЗУ", function(event) {
    let data = { 
		html: document.documentElement.innerHTML,
		url: window.location.origin+window.location.pathname,
		name: document.querySelector('h1')?.textContent.trim(),
		cena: document.querySelector('[itemprop="price"]').getAttribute('content'),
		desc: document.querySelector('[itemprop="description"]').textContent.trim(),
		adr: document.querySelector('[itemprop="address"]')?.textContent.replace('р-н ',', р-н ').trim()
	};
	data.id = data.url.match(/_(\d+)(?:$|\?)/)?.[1] ?? Math.abs(parseInt(data.url.split('/').pop().replace(/[^0-9+-]/g, ''), 10) || 0);
	if(data.id==0) data.id = new URLSearchParams(window.location.search).get('id');
	const matches = [...data.desc.matchAll(/(73:\d{2}:\d{6,7}:\d{1,5})/g)];
	if(matches.length > 0) data.kn = matches.map(m => m[1]).join(',');
	
	document.querySelectorAll('ul[class^=params-paramsList] li, ul[class^=style-item-params] li, #bx_item-params li').forEach(el => {
		let pkey = el.querySelector('span')?.textContent.trim();
		if (!pkey) return;
		let pval = el.textContent.replace(pkey, '').trim();
		if(pval.includes('}')) pval = pval.split('}').pop().trim();
		pkey = pkey.replace(/:*|\s*$/g, '');
		if (!pval) return;
		data[pkey] = pval;
	});

	const fields = ['Площадь дома', 'Площадь комнаты', 'Общая площадь', 'Площадь'];
	let ploshad = fields.find(f => data[f]) || '';
	if(ploshad){
		ploshad = data[ploshad];
		data.ploshad = ploshad.includes('сот') ? parseFloat(ploshad) * 100 : parseFloat(ploshad);
	}

	document.documentElement.innerHTML.match(/data-map-lat="([\d.]+)/)?.[1] && (data.map_lat = RegExp.$1);
	document.documentElement.innerHTML.match(/data-map-lon="([\d.]+)/)?.[1] && (data.map_lon = RegExp.$1);
	
    const popup = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');
    if(!popup){ console.error('Попап заблокирован!'); return; }
    const doc = popup.document;
    doc.write('<html><head><title>Отправка...</title></head><body>');
    const form = doc.createElement('form');
    form.method = 'POST';
    form.action = 'https://00.gko73.ru/ocenka_zu2025/page_import_oa_av.php';
    form.style.display = 'none';
    for(const key in data) {
        const input = doc.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data[key];
        form.appendChild(input);
    }
    doc.body.appendChild(form);
    setTimeout(()=> form.submit(), 1000);
});