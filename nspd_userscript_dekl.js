// ==UserScript==
// @name        m255 dekl from nspd.gov.ru
// @namespace   Violentmonkey Scripts
// @match       https://*nspd.gov.ru/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.1
// @updateURL	https://00.gko73.ru/userscripts/nspd_userscript_dekl.js
// @downloadURL	https://00.gko73.ru/userscripts/nspd_userscript_dekl.js
// @author      -
// @description -
// ==/UserScript==

const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

//――――――――――――――――――――――――――

async function fetchStCnt(rid){
	fetch(`https://nspd.gov.ru/api/registers-manager/v2/search/${rid}?page=0&count=10`, {method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({textAttribValsList: [{ attribsID: 50373, values: ["Новый запрос"] }]})})
	.then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
	.then(data => {
		document.querySelector(`#st${rid}`).textContent = data?.body?.length ?? "-";
	})
	.catch(err => {
		document.querySelector(`#st${rid}`).textContent = `ошибка: ${err}`;
	});
}

GM_registerMenuCommand("01. Проверить новые заявления", async function(event) {
	document.head.insertAdjacentHTML("beforeend", `<style>
	.deklcnt th,td{border: 1px solid black; padding: 8px; text-align: left;}
	</style>`);
	const tasks = [
		{id: 42702, name: "Декларации о характеристиках"},
		{id: 42732, name: "Ст. 20. Предоставление разъяснений"},
		{id: 42722, name: "Ст. 21. Рассмотрение заявлений об исправлении"},
		{id: 42742, name: "Ст. 22.1. Установление кадастровой стоимости"}
	];
	
	let html = '<h3>Новые заявления</h3><table class="deklcnt">';
	tasks.forEach((task) => { html += `<tr><td><a href="https://nspd.gov.ru/registry?folder=925&registryId=${task.id}">${task.name}</a></td><td id="st${task.id}">загрузка...</td></tr>`; });
	html += '</table>'
	customAlert(html);
	
	tasks.forEach((task) => { 
		document.querySelector(`#st${task.id}`).addEventListener('click', ()=>{
			document.querySelector(`#st${task.id}`).textContent = 'загрузка...';
			fetchStCnt(task.id);
		});
		fetchStCnt(task.id);
	});
});

GM_registerMenuCommand("02. Реквизиты заявления для 1С", async function(event) {
	let sootv = {
		'Дата поступления обращения/заявления': 'Дата поступления',
		'ЗаявительФИО/Наимен': 'Фамилия, имя, отчество субъекта персональных данных',
		'ПочтАдресЗаявителя': 'Адрес места жительства субъекта персональных данных',
		'ЭлАдресЗаявителя': 'Адрес электронной почты',
		'Кадастровый номер': 'Кадастровый номер объекта недвижимости',
		'Адрес или описание месторасположения объекта недвижимости': 'Адрес объекта недвижимости',
		'КадСтоимостьОбращ': 'Кадастровая стоимость объекта недвижимости, руб',
	};
	
	let data = {};
	let labels = document.querySelectorAll('fieldset label');
	for(el of labels){
		if(!el.querySelector('span').textContent) continue;
		data[el.querySelector('span').textContent.trim()] = el.querySelector('div').textContent.trim();
	}

	let res = '';
	for([k, v] of Object.entries(sootv)){
		if(!v in data) continue;
		res += `${k}: ${data[v]}<br>\n`;
	}
	res += 'Номер процедуры НСПД: '+window.location.href.match(/tech-process\/(\d*?)\//)[1];
	customAlert(res);
});

//――――――――――――――――――――――――――

async function changeInput(inputElement, val){
	inputElement.dispatchEvent(new Event('focusin', { bubbles: true }));
	const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
	nativeInputValueSetter.call(inputElement, val);
	inputElement.dispatchEvent(new Event('input', { bubbles: true }));
	await sleep(100);
	inputElement.dispatchEvent(new Event('focusout', { bubbles: true }));
	return sleep(500);
}

async function changeSelectbox(inputElement, val){
  try{
    inputElement.click();
	await sleep(200);
	
	let li = document.querySelectorAll('#nspd-combobox\\=container li');
	for(el of li){ if(el.textContent.trim() == val){ el.click(); return; }}
	await sleep(100);
	return sleep(500);
  }catch(e){return sleep(100);}
}

async function customPrompt(message) {
    return new Promise((resolve) => {
        const dialogue = document.createElement('dialog');
		
		const msg = document.createElement('div');
        msg.innerHTML = message;

        const input = document.createElement('textArea');
        input.id = 'promptInput';
        input.rows = 10;
        input.cols = 50;

        const submitButton = document.createElement('button');
        submitButton.textContent = 'OK';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
		
		dialogue.appendChild(msg);
        dialogue.appendChild(input);
		dialogue.appendChild(document.createElement('br'));
        dialogue.appendChild(submitButton);
        dialogue.appendChild(cancelButton);

        let result;
        submitButton.addEventListener('click', () => { result = input.value; dialogue.close(); });
        cancelButton.addEventListener('click', () => { result = null; dialogue.close(); });
		dialogue.addEventListener('click', (event)=>{if(event.target===dialogue){dialogue.close();}});
        dialogue.addEventListener('close', () => { resolve(result??null); dialogue.remove(); });
		
		document.body.appendChild(dialogue);
        dialogue.showModal();
    });
}
//let kns = await customPrompt(); console.log(kns);

function customAlert(message) {
	const dialogue = document.createElement('dialog');
	const input = document.createElement('div');
	input.innerHTML = message;
	dialogue.appendChild(input);
	dialogue.addEventListener('click', (event)=>{if(event.target===dialogue){dialogue.close();}});
	dialogue.addEventListener('close', () => { dialogue.remove(); });
	document.body.appendChild(dialogue);
	dialogue.showModal();
}

function sleep(ms){return new Promise(resolve => setTimeout(resolve, ms));}