// ==UserScript==
// @name        sprosivracha.com
// @namespace   Violentmonkey Scripts
// @match       https://sprosivracha.com/questions/*
// @grant       none
// @version     1.0
// @author      -
// @description 08.02.2025, 10:31:14
// ==/UserScript==

document.querySelectorAll('.answersBlock .answerRow, .block.comments .item').forEach(function(el){ el.style.filter='none'; });
document.querySelector('#needRegistrationBlock').style.display = 'none';