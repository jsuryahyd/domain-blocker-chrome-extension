chrome.browserAction.onClicked.addListener((tab) => {
  // chrome.tabs.executeScript({
  //   file: "appIframe.js"
  // });
  // chrome.tabs.executeScript({
  //   code:"console.log('executeScript')"
  // })
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log(tabs);
    chrome.tabs.sendMessage(tabs[0].id, { openApp: true }, function (response) {
      console.log("app opened response :", response);
    });
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "popupInit") console.log("popup");
  console.log("message");
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  if (request.greeting == "hello") sendResponse({ farewell: "goodbye" });
  return true;
});

// chrome.webNavigation.onCompleted.addListener(async (details)=>{

// 	const savedData = await loadFromLocal(['siteData'])
// 	const saved = await saveToLocal({siteData:[...(savedData.siteData||[]),details]})
// 	console.log("details",details)
// })

function loadFromLocal(keys) {
  const func = (resolve, reject) => {
    chrome.storage.local.get(keys, (data) => {
      resolve(data);
    });
  };
  return new Promise(func);
}

function saveToLocal(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      resolve(data);
    });
  });
}

// /**
//already has a type : chrome.webRequest.webRequestBodyDetails
//  * @typedef {Object} requestdetails
//  * @property {number} requestDetails.frameId
//  * @property {string} requestDetails.initiator
//  * @property {("GET"|"POST")} requestDetails.method
//  * @property {string} requestDetails.requestId
//  * @property {number} requestDetails.tabId
//  * @property {number} requestDetails.timestamp
//  * @property {string} requestDetails.type
//  * @property {string} requestDetails.url
//  */
function DomainBlockerBackground(){

let blockListener;

	async function initBlocking() {
	
		if(blockListener && chrome.webRequest.onBeforeRequest.hasListener(blockListener)){
			console.log("removing old listener");
			chrome.webRequest.onBeforeRequest.removeListener(blockListener)
		}
			const w = await loadFromStorage(["blocked"]);
		const blocking = w.blocked;
		blockListener = 	(details) => {
			// console.log("request details",details);
			const url = new URL(details.url);
			const initiator = details.initiator;
			if(!blocking) return;
			const entry = blocking.find((b) => b.website == initiator);
			if (!entry ) return;
			entry.blockDomains.forEach((d) => console.log([d, url.hostname]))
			//todo: domains may be urls or domain names, handle it
			if (entry.blockDomains.find((d) => d == url.hostname)) {
				console.log("blovking--", url);
				return { cancel: true };
			}
		}
		chrome.webRequest.onBeforeRequest.addListener(
			blockListener,
			{ urls: ["<all_urls>"] },//todo: only blocked domains regexes list
    ["blocking"]
	);

	console.log("added listener...");
	const w1 = await loadFromStorage(["blocked"]);
	const blocking1 = w.blocked;
	console.log("new blocking",blocking1)
}




return {initBlocking}
}
const dbg  = DomainBlockerBackground()

dbg.initBlocking();


chrome.storage.onChanged.addListener(function(changes, namespace) {
	console.log(changes,namespace)
	for(var key in changes) {
		if(key === 'blocked') {
			// Do something here
			dbg.initBlocking();
		}
	}
});