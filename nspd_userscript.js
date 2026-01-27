// ==UserScript==
// @name        m255 from nspd.gov.ru
// @namespace   Violentmonkey Scripts
// @match       https://*nspd.gov.ru/*
// @grant GM_registerMenuCommand
// @grant GM_notification
// @grant GM_download
// @grant GM_addElement
// @grant GM_addStyle
// @grant GM_openInTab
// @version     1.5
// @updateURL	https://00.gko73.ru/userscripts/nspd_userscript.js
// @downloadURL	https://00.gko73.ru/userscripts/nspd_userscript.js
// @author      -
// @description 17.12.2024, 15:44:28
// ==/UserScript==

const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

//――――――――――――――――――――――――――

if(window.location.href.indexOf('registryId=42472')>=0){
  new Promise((resolve) => {
    const observer = new MutationObserver((mutationsList) => {
      if(document.querySelector('.App .nspd-spinner')) return;
      if(document.querySelector('.App table')){
        observer.disconnect(); resolve('table');
      }
	  if(document.querySelector('h3')?.textContent == 'Требуется авторизация'){
		observer.disconnect(); resolve('auth');  
	  }
    });
    observer.observe(document.querySelector('body'), {childList: true, subtree: true, characterData: true});
  }).then((res) => {
	console.log(res);
	if(res=='table'){
		//подсветить новые перечни
		document.querySelectorAll('.App table>tbody>tr').forEach(row => {
		  const cell = row.querySelector('td:nth-child(10)');
		  if (cell && cell.textContent.trim() == 'Расчет кадастровой стоимости') {
			row.style.background='#fffed7';
		  }
		  if (cell && cell.textContent.trim() == 'Перечень ОН утвержден') {
			row.style.background='#edfded';
		  }
		});
	}else
	if(res=='auth'){
		document.querySelectorAll('button').forEach(cell => { 
			if(cell.textContent.trim() == 'Войти') cell.click(); 
		});
	}
  });
}

if(window.location.href.indexOf('/tech-process/')>=0){
  new Promise((resolve) => {
    const observer = new MutationObserver((mutationsList) => {
      if(document.querySelector('.App .nspd-spinner')) return;
      if(document.querySelector('.App main')){
        observer.disconnect(); resolve();
      }
    });
    observer.observe(document.querySelector('body'), {childList: true, subtree: true, characterData: true});
  }).then(() => {
    console.log('Приложение загружено');
  });
}

if(window.location.href.indexOf('sso.nspd.gov.ru/esia/callback')>=0){
	document.querySelectorAll('.accountInfo').forEach(cell => { 
		if(cell.textContent.trim() == 'ОГБУ "БТИГКО"'){
			setTimeout(()=>{cell.click();}, 500) 
			return;
		}
	});
}

if(window.location.href.endsWith('/profile')){
  new Promise((resolve) => {
    const observer = new MutationObserver((mutationsList) => {
      if(document.querySelector('.App .nspd-spinner')) return;
      if(document.querySelector('.App main')){
        observer.disconnect(); resolve();
      }
    });
    observer.observe(document.querySelector('body'), {childList: true, subtree: true, characterData: true});
  }).then(() => {
    console.log('Приложение загружено');

    //добавить кнопку все в архив
	const button = document.createElement('button');
	button.textContent = 'Все в архив';
	button.onclick = () => {
		fetch("https://nspd.gov.ru/api/notifications-controller/v2/notifications?page=0&count=1000", {"method": "GET",}).then(response => response.json()).then(async res => {
			//console.log(res.totalCount, res.notifications.length);
			for(n of res.notifications){
			  console.log(n.notificationsId);
			  await fetch("https://nspd.gov.ru/api/notifications-controller/v2/notifications/"+n.notificationsId+"/statuses/37", {"method": "PUT"});
			}
		});
	};
	document.querySelector('main section div.items-center > div').appendChild(button);
  });
}

//――――――――――――――――――――――――――

GM_registerMenuCommand("01. Открыть новые перечни", function(event) {
  fetch("https://nspd.gov.ru/api/registers-manager/v2/search/42472?page=0&count=10", {
    "headers": {"content-type": "application/json"},
    "body": '{"textAttribValsList":[{"attribsID":47028,"values":["Расчет кадастровой стоимости"]}]}',
    "method": "POST"
  }).then(response => response.json()).then(res => {
    for(r of res.body){
      GM_openInTab('https://nspd.gov.ru/tech-process/'+r.objdocId+'/registry/42472');
    }
  });
});

GM_registerMenuCommand("01. Скачать перечень", async function(event) {
  var tech_process = window.location.href.match(/tech-process\/(\d*?)\//)[1];
  if(!tech_process){
    GM_notification('Невозможно получить номер тех процесса', 'Ошибка');
    return;
  }

  let num_proc='';
  let xhr = new XMLHttpRequest();
  xhr.open('GET', "https://nspd.gov.ru/api/tech-process/v2/registers/42472/objdocs/"+tech_process+"/stages/526/attribs", false);
  xhr.send();
  if(xhr.status==200){
    let res = JSON.parse(xhr.response);
    num_proc = res[0].attribs[2].value;
  }

  if(num_proc){
    fetch("https://nspd.gov.ru/api/tech-process/v2/registers/42472/objdocs/"+tech_process+"/stages/527/folders").then(response => response.json()).then(res => {
      for(file of res[1].files){
        if(file.fileName.endsWith(".zip")){
          GM_download('https://nspd.gov.ru/api/registers-manager/v2/file/'+file.externalKey, 'Перечень_'+num_proc+'_'+formattedDate+'.zip');
        }
      }

      document.querySelectorAll('.App main ul>li button').forEach(btn => {
        if(btn.textContent.trim()=='Расчет КС вне ПРН') btn.click();
      });
    });
  }else{
    GM_notification('Невозможно получить номер процедуры', 'Ошибка');
  }
});

//――――――――――――――――――――――――――

GM_registerMenuCommand("02. Отправка Акта, прикрепить файлы", async function(event) {
  let pres = prompt('Введите номер Акта и дату', ''); let m = null;
  if(pres){
	  m = pres.match(/(АОКС-\d{2}\/\d{4}\/\d{6}).*(\d{2}\.\d{2}\.\d{4})/)
	  if(!m){ GM_notification('Неверный формат', 'Ошибка'); return; }
  }else{
	return;
  }
  
  let labels = document.querySelectorAll('fieldset label');
  for(el of labels){
    if(el.textContent.trim() == 'Нет') el.querySelector('input').click();
  }
  await sleep(1000);

  labels = document.querySelectorAll('fieldset legend');
  for(el of labels){
    if(el.textContent.trim()=='Акты об определении кадастровой стоимости'){
      [...el.closest('fieldset').querySelectorAll('button')].find(b => b.innerText.trim()=='Редактировать')?.click();
      await sleep(200);
      [...el.closest('fieldset').querySelectorAll('button')].find(b => b.innerText.trim()=='Добавить строку')?.click();
      await sleep(200);
      await changeTextarea(el.closest('fieldset').querySelector('td:first-child textarea'), m[2]);
      await changeTextarea(el.closest('fieldset').querySelector('td:nth-child(2) textarea'), m[1]);
      await sleep(200);
      [...el.closest('fieldset').querySelectorAll('button')].find(b => b.innerText.trim()=='Сохранить изменения')?.click();
    }
  }
  await sleep(1000);

  document.querySelectorAll('.App main ul>li button').forEach(async btn => {
	document.querySelectorAll('.App main ul>li button').forEach(async btn => {
		if(btn.textContent.trim()=='Файлы') btn.click();
	});
  });
});

GM_registerMenuCommand("02. Публикация на сайте", async function(event) {
  let tomorrow = new Date();
  //tomorrow.setDate(tomorrow.getDate() + 1); // Добавляем один день к текущей дате
  let upload_dat = tomorrow.toLocaleDateString('ru-RU').replace(/\//g, '.');

  let labels = document.querySelectorAll('fieldset label');
  for(el of labels){
    if(el.textContent.trim().indexOf('Ссылка на раздел сайта ГБУ')>=0){
		await changeInput(el.querySelector('input'), 'https://gko73.ru/akty-ob-opredelenii-ks/');
		await sleep(1000);
	}
    if(el.textContent.trim().indexOf('Дата')>=0) await changeInput(el.querySelector('input'), upload_dat);
  }
  await sleep(1000);
  document.querySelectorAll('.App main ul>li button').forEach(btn => {
      if(btn.textContent.trim().indexOf('Передать на публикацию')>=0) btn.click();
  });
  await sleep(2000);
  document.querySelectorAll('.App main ul>li button').forEach(btn => {
      if(btn.textContent.trim().indexOf('Передать результаты')>=0) btn.click();
  });
});

//――――――――――――――――――――――――――

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

function sleep(ms){return new Promise(resolve => setTimeout(resolve, ms));}