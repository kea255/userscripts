// ==UserScript==
// @name        m255 from nspd.gov.ru
// @namespace   Violentmonkey Scripts
// @match       https://nspd.gov.ru/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.0
// @author      -
// @description 17.12.2024, 15:44:28
// ==/UserScript==

const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
if(window.location.href.indexOf('/tech-process/')>=0){
  var tech_process = window.location.href.match(/tech-process\/(\d{10})\//)[1];
}

if(window.location.href.indexOf('registryId=42472')>=0){
  new Promise((resolve) => {
    const observer = new MutationObserver((mutationsList) => {
      if(document.querySelector('.App .nspd-spinner')) return;
      if(document.querySelector('.App table')){
        observer.disconnect(); resolve();
      }
    });
    observer.observe(document.querySelector('body'), {childList: true, subtree: true, characterData: true});
  }).then(() => {
    console.log('Таблица загружена');
	
	//подсветить новые перечни
	document.querySelectorAll('.App table>tbody>tr').forEach(row => {
		const cell = row.querySelector('td:nth-child(9)');
		if (cell && cell.textContent.trim() == 'Перечень ОН разобран') {
		  row.style.background='#fffed7';
		}
	});
  });
}

GM_registerMenuCommand("Log", function(event) {
  console.log("Menu item selected", event);
  GM_notification('test', 'title');
});

GM_registerMenuCommand("Test1", function(event) {
  const step1 = () => {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList) => {
        if(document.querySelector('section .nspd-spinner')) return;
        observer.disconnect(); resolve();
      });
      observer.observe(document.querySelector('main>section'), {childList: true, subtree: true, characterData: true});
      document.querySelector('a[href="/cadastral-price/acts"]').click();
    });
  }

  const step2 = () => {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList) => {
        if(document.querySelector('section .nspd-spinner')) return;
        observer.disconnect(); resolve();
      });
      observer.observe(document.querySelector('main>section'), {childList: true, subtree: true, characterData: true});
      document.querySelector('a[href="/cadastral-price/index"]').click();
    });
  }

  step1().then(() => step2());
});

GM_registerMenuCommand("Test1 v2", async function(event) {
  await ExecAndWait('main>section', function(){document.querySelector('a[href="/cadastral-price/acts"]').click();}); 
  await ExecAndWait('main>section', function(){document.querySelector('a[href="/cadastral-price/index"]').click();});
});

GM_registerMenuCommand("Test2 Поиск процедуры", function(event) {
  let proc_num = prompt('Введите номер процедуры', '');
  if(proc_num){
    proc_num = proc_num.replace(/\s/g,'').trim();
    fetch("https://nspd.gov.ru/api/registers-manager/v2/search/42472?page=0&count=10", {
      "headers": {"content-type": "application/json"},
      "body": '{"textQuery":{"value":"'+proc_num+'"}}',
      "method": "POST"
    }).then(response => response.json()).then(res => {
      console.log(res);
      window.location.href = 'https://nspd.gov.ru/tech-process/'+res.body[0].objdocId+'/registry/42472';
    });
  }
});

GM_registerMenuCommand("Test3", function(event) {
  const step0 = () => {
    return new Promise((resolve) => {
      document.querySelectorAll('.App table>tbody>tr').forEach(row => {
        const cell = row.querySelector('td:nth-child(3)');
        if (cell && cell.textContent.trim() === '3001') {
          resolve(row);
        }
      });
      resolve(null);
    });
  }

  step0().then((tr) => {
    if(tr) tr.querySelector('td:nth-child(1) button').click();
  });
});

GM_registerMenuCommand("03. Массовое добавление КН из ПКС в НСПД", function(event) {
	var tech_process = window.location.href.match(/tech-process\/(\d{10})\//)[1];
	let kns = prompt('Введите кадастровые номера', '');
	if(kns){
		kns = kns.match(/(\d{2}:\d{2}:\d{6,7}:\d{1,5})/g);
		
		add_progress(kns.length);
		
		kns.reduce((accum, kn, options = {}) => {
			return accum.then(res => link_kn(kn))
		}, Promise.resolve()).then( function(result){ 
			/*document.querySelectorAll('.App main ul>li button').forEach(btn => {
				if(btn.textContent.trim()=='Сведения') btn.click();
				if(btn.textContent.trim()=='Перечень ОН') setTimeout(() => { btn.click(); }, 3000);
			});*/
			fetch(`https://nspd.gov.ru/api/registers-manager/v2/registers-objdoc-attrib-buttons/${tech_process}`, {
			  "headers": {"content-type": "application/json"},
			  "body": "{\"attribs\":[47039,47029,47030,47031,47040,47037]}",
			  "method": "POST"
			});
			document.querySelector('progress').remove();
		});
	}

	async function link_kn(kn) {
		document.querySelector('progress').value += 1;
		
		//найти КН в связанном документе
		const response = await fetch(`https://nspd.gov.ru/api/scv-support/v2/registers?cadNumber=${kn}&registerID=42504&objdocID=${tech_process}`, {method: "POST"});
		const res = await response.json();
		if(res.hasOwnProperty('body')){
			if(!res.body[0].data[1].lines){
				console.log(`not found ${kn}`);
				document.getElementById('log').innerHTML += `${kn} не найден`+"<br>\n";
				return true;
			}
			//связать объект с документом
			const linkResponse = await fetch(`https://nspd.gov.ru/api/scv-support/v2/registers/${res.registersID}/objdocs/${res.body[0].objdocId}/addLinkedObjdoc`, {
				headers: {"content-type": "application/json"},
				body: `{"objdocID":${tech_process},"registerID":42504}`,
				method: "POST"
			});
			return linkResponse;
		} else {
			console.log(`not body ${kn}`);
			document.getElementById('log').innerHTML += `${kn} нет ответа`+"<br>\n";
		}
	}
	
	function add_progress(max=100){
		const container = document.querySelector('main [class^="breadcrumbs"]');
		let log = document.createElement('div'); log.id = 'log';
		container.prepend(log);
		let progress = document.createElement('progress');
		progress.value = 0; progress.max = max; progress.style.width = '100%';
		container.prepend(progress);
	}
});

GM_registerMenuCommand("03.1 Массовое удаление КН из ПКС в НСПД", function(event) {
	var tech_process = window.location.href.match(/tech-process\/(\d{10})\//)[1];
	//удалить все объекты из ст21
	fetch("https://nspd.gov.ru/api/tech-process/v2/registers/42504/objdocs/"+tech_process+"/stages/536/linked-documents/889?page=0&count=1000", {"method": "GET",}).then(response => response.json()).then(async res => {
		for(o of res.body){
		  console.log(o.linkObjdocId);
		  await fetch("https://nspd.gov.ru/api/registers-manager/v2/registers/43097/objdoc/"+o.linkObjdocId+"/web", {"method": "DELETE"});
		}
	});
});

GM_registerMenuCommand("04. Проверка наличия КН НСПД", async function(event) {
	var tech_process = window.location.href.match(/tech-process\/(\d{10})\//)[1];
	let kns = await customPrompt();
	if(kns){
		kns = kns.match(/(\d{2}:\d{2}:\d{6,7}:\d{1,5})/g);
		
		add_progress(kns.length);
		
		kns.reduce((accum, kn, options = {}) => {
			return accum.then(res => link_kn(kn))
		}, Promise.resolve()).then( function(result){ 
			document.querySelector('progress').remove();
		});
	}

	async function link_kn(kn) {
		document.querySelector('progress').value += 1;
		
		//найти КН в связанном документе
		const response = await fetch(`https://nspd.gov.ru/api/scv-support/v2/registers?cadNumber=${kn}&registerID=42504&objdocID=${tech_process}`, {method: "POST"});
		const res = await response.json();
		if(res.hasOwnProperty('body')){
			if(!res.body[0].data[1].lines){
				console.log(`not found ${kn}`);
				document.getElementById('log').innerHTML += `${kn} не найден`+"<br>\n";
				return true;
			}
			return true;
		} else {
			console.log(`not body ${kn}`);
			document.getElementById('log').innerHTML += `${kn} нет ответа`+"<br>\n";
		}
	}
	
	function add_progress(max=100){
		const container = document.querySelector('main [class^="breadcrumbs"]');
		let log = document.createElement('div'); log.id = 'log';
		container.prepend(log);
		let progress = document.createElement('progress');
		progress.value = 0; progress.max = max; progress.style.width = '100%';
		container.prepend(progress);
	}
});

/*
Скачать ЦОФ
fetch("https://stage.nspd.rosreestr.gov.ru/api/registers-manager/v2/registers/42628?page=1&count=100", {"headers": {"content-type": "application/json"},"body": "{}","method": "POST"}).then(response => response.json()).then(res => {
    let csvContent='';
	for(r of res.body){
		console.log(r.data[3].lines[0].value, r.data[7].lines[0].value, r.data[8].lines[0].value);
		csvContent += `${r.data[3].lines[0].value},${r.data[7].lines[0].value},${r.data[8].lines[0].value}\n`
    }
	const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], {type: 'text/csv;charset=utf-8;'}));
    link.download = 'ЦОФ.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});
*/

//----
async function changeInput(inputElement, val){
  try{
    inputElement.dispatchEvent(new Event('focusin', { bubbles: true }));
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    nativeInputValueSetter.call(inputElement, val);
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(100);
    inputElement.dispatchEvent(new Event('focusout', { bubbles: true }));
    return sleep(500);
  }catch(e){return sleep(100);}
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

async function changeTextarea(ta, val){
	try{
		ta.dispatchEvent(new Event('focusin', { bubbles: true }));
		ta.value = val;
		const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
		nativeInputValueSetter.call(ta, val);
		ta.dispatchEvent(new Event('input',  { bubbles: true }));
		ta.dispatchEvent(new Event('change', { bubbles: true }));
		ta.dispatchEvent(new Event('focusout', { bubbles: true }));
		await sleep(100);
	}catch(e){console.error(e); return sleep(100);}
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

async function ExecAndWait(selector, callback){
	let target = document.querySelector(selector);
	if(target){
		return new Promise((resolve) => {
			const observer = new MutationObserver(() => {
				if(document.querySelector('section .nspd-spinner')) return;
				observer.disconnect(); resolve();
			});
			observer.observe(target, {childList: true, subtree: true, characterData: true});
			
			if(typeof callback === 'function') callback();
		});
	}else{
		console.log(`selector {selector} not found`);
	}
}

/*
let labels = document.querySelectorAll('.nspd-label');
for(el of labels){
	console.log(el.textContent.trim());
	if(el.textContent.trim() == 'Наличие массовой ошибки'){
		let fieldset = el.closest('.grid').querySelector('fieldset');
		console.log(fieldset);
		let radioYes = [...fieldset.querySelectorAll('label')]
			.find(l => l.querySelector('span.label')?.textContent.trim() == 'Да')?.querySelector('input');
		console.log(radioYes);
	}
}

let data = {};
let labels = document.querySelectorAll('fieldset label');
for(el of labels){
	if(!el.querySelector('span').textContent) continue;
	data[el.querySelector('span').textContent.trim()] = el.querySelector('div').textContent.trim();
}
*/
