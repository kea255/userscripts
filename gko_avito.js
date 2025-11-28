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
// @version     1.3
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
  let sel = document.querySelector('[class^=items-items]');
  if(sel) observer.observe(sel, {childList: true, subtree: true, characterData: true});
}

GM_registerMenuCommand("01. Отправить в базу ГКО ЗУ", function(event) {
	let data = get_avito_data();
	
	open_popup('https://00.gko73.ru/gko_zu2025/page_import_oa_av.php', data);
});

GM_registerMenuCommand("02. Отправить в базу ГКО ОКС - Продажа", function(event) {
	let data = get_avito_data();
	
	const extractNum = (str, def = 1) => parseInt(str.replace(/[^0-9]/g, '')) || def;
	const toLower = s => s.toLowerCase();

	const roomFields = ['Комнат в квартире', 'Количество комнат'];
	for(const field of roomFields) {
	  if(data[field]) { data.komnat = extractNum(data[field], 1); break; }
	}
	if(data['Этаж']) {
	  const m = data['Этаж'].match(/(\d*)[^\d]*(\d*)/);
	  if(m){ data.etaj = m[1]; data.etajey = m[2] || '0'; } else data.etaj = extractNum(data['Этаж']);
	}
	if(data['Тип дома']) data.tip_doma = toLower(data['Тип дома']);
	if(data['Отделка']) {
	  data.otdelka = toLower(data['Отделка']);
	  data.otdelka = ['офисная', 'чистовая'].includes(data.otdelka) ? 'простая' : 'без отделки';
	}
	if(data['Ремонт']) {
	  const r = toLower(data['Ремонт']);
	  data.remont = r;
	  if(['дизайнерский', 'евро'].includes(r)) data.otdelka = 'высококачественная';
	  if(['косметический', 'требует ремонта'].includes(r)) data.otdelka = 'простая';
	}
	if(data['Материал стен']) data.material_sten = toLower(data['Материал стен']);
	if(data['Год постройки']) data.god_postroyki = extractNum(data['Год постройки']);
	
	open_popup('https://00.gko73.ru/gko_oks2023/page_import_oa_av.php', data);
});

GM_registerMenuCommand("03. Отправить в базу ГКО ОКС - Аренда", function(event) {
	let data = get_avito_data();
	
	if(document.querySelector('[class*="price-value-additional"]')?.textContent.indexOf('за м²')>0){
		data.cena_u = data.cena;
		data.cena = -1;
	}
	
	if(data.ploshad>0 && data.cena>0) data.cena_u = data.cena/data.ploshad;
	else
	if(data.ploshad>0 && data.cena_u>0) data.cena = data.cena_u*data.ploshad;
	
	open_popup('https://00.gko73.ru/gko_oks2023/page_import_oa_av_rent.php', data);
});

function open_popup(url, data){
    const popup = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');
    if(!popup){ alert('Попап заблокирован!'); return; }
    const doc = popup.document;
    const form = Object.assign(doc.createElement('form'), {method: 'POST', action: url});
    Object.entries(data).forEach(([key, value]) => form.appendChild(Object.assign(doc.createElement('input'), {type: 'hidden', name: key, value})));
    doc.body.appendChild(form);
    form.submit();
}

function get_avito_data(){
	let data = { 
		html: document.documentElement.innerHTML,
		url: window.location.origin+window.location.pathname,
		name: document.querySelector('h1')?.textContent.trim(),
		cena: document.querySelector('[itemprop="price"]')?.getAttribute('content') || 0,
		desc: document.querySelector('[itemprop="description"]')?.innerText.trim() || '',
		adr: document.querySelector('[itemprop="address"]')?.textContent.replace('р-н ',', р-н ').trim() || ''
	};
	data.id = data.url.match(/_(\d+)(?:$|\?)/)?.[1] ?? Math.abs(parseInt(data.url.split('/').pop().replace(/[^0-9+-]/g, ''), 10) || 0);
	if(data.id==0) data.id = new URLSearchParams(window.location.search).get('id');
	if(data.desc){
		let matches = [...data.desc.matchAll(/(73:\d{2}:\d{6,7}:\d{1,5})/g)];
		if(matches.length > 0) data.kn = matches.map(m => m[1]).join(',');3
	}
	
	document.querySelectorAll('ul[class^=params-paramsList] li, ul[class^=style-item-params] li, #bx_item-params li').forEach(el => {
		let pkey = el.querySelector('span')?.textContent.trim();
		if (!pkey) return;
		let pval = el.textContent.replace(pkey, '').trim();
		if(pval.includes('}')) pval = pval.split('}').pop().trim();
		pkey = pkey.replace(/:*|\s*$/g, '');
		if (!pval) return;
		data[pkey] = pval;
	});

	document.documentElement.innerHTML.match(/data-map-lat="([\d.]+)/)?.[1] && (data.map_lat = RegExp.$1);
	document.documentElement.innerHTML.match(/data-map-lon="([\d.]+)/)?.[1] && (data.map_lon = RegExp.$1);

	const fields = ['Площадь дома', 'Площадь комнаты', 'Общая площадь', 'Площадь'];
	let ploshad = fields.find(f => data[f]) || '';
	if(ploshad){
		ploshad = data[ploshad];
		data.ploshad = ploshad.includes('сот') ? parseFloat(ploshad) * 100 : parseFloat(ploshad);
	}
	
	return data;
}