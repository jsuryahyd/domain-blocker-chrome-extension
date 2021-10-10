/// <reference path="./chrome.d.ts" />
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
function DomainBlockerBackground() {
  // chrome.webRequest.onBeforeRequest.removeListener()//remove all listeners
  let blockListener;
  let pageReqListener;
  async function initBlocking() {
    if (
      blockListener &&
      chrome.webRequest.onBeforeRequest.hasListener(blockListener)
    ) {
      console.log("removing old listener");
      chrome.webRequest.onBeforeRequest.removeListener(blockListener);
    }
    const w = await loadFromStorage(["blocked"]);
    const entries = w.blocked;
    if (!entries) {
      console.log("no entries in storage : ", w);
      return false;
    }
    blockListener = (details) => {
      const req = new URL(details.url);
      const initiator = details.initiator;

      //todo: entryItem has to be checked if given page url  instead of website

      const entryItem = (entries || []).find((b) => {
        return b.url.indexOf("http") == -1
          ? initiator.indexOf(b.url) != -1
          : b.url == initiator;
      });
      if (!entryItem) return;
      console.log("request details", details); 
      let block = false;
      block = !!entryItem.domainsToBlock.find((d) => {
        const url = new URL(d.indexOf("http") == -1 ? "http://" + d : d);
        return (
          (d.indexOf("http") == -1 ? "" : url.protocol + "//") +
            url.hostname +
            url.pathname ==
          (d.indexOf("http") == -1 ? "" : req.protocol + "//") +
            req.hostname +
            (url.pathname == "/" ? url.pathname : req.pathname) //consider req pathname only if given unwanted url is a specific url instead of a domain
        );
      });
      if (block) {
        console.log(
          "(((((((((((((((( blocked request ))))))))))))))))",
          details,
          entryItem
        );
        return { cancel: true };
      } else {
        console.log(
          " XXXXXXXXXXXXXXXXXXX not blocking XXXXXXXXXXXXXXXXXX",
          details,
          entryItem
        );
      }
    };
    chrome.webRequest.onBeforeRequest.addListener(
      blockListener,
      {
        urls: getUrlPatterns(
          entries.reduce((t, e) => [...t, ...e.domainsToBlock], [])
        ),
      },
      ["blocking"]
    );

    console.log("added listener...");
    const w1 = await loadFromStorage(["blocked"]);
    const blocking1 = w.blocked;
    console.log("new blocking", blocking1);
  }

  function getUrlPatterns(req) {
    const patterns = req.reduce((u, e, idx) => {
      try {
        const url = new URL(e.indexOf("http") == -1 ? "http://" + e : e);
        return [
          ...u,
          e.indexOf("http") == -1 //is protocol included by user while inputting domains
            ? "*://" + url.hostname + url.pathname + "*" //star at begin and ending
            : url.protocol + "//" + url.hostname + url.pathname + "*", //star only at end
        ];
      } catch (err) {
        console.error(err + " | " + JSON.stringify(req));
        return u;
      }
    }, []);
    console.log("patterns", patterns);
    return patterns;
    // return ["<all_urls>"];
  }

  function addPageRequestsListener(tabId) {
    removePageRequestsListener();
    pageReqListener = (reqDetails) => {
      if (reqDetails.tabId == tabId) {
        console.log("sending...", reqDetails.requestId);
        chrome.runtime.sendMessage(
          {
            type: "pageRequestsList",
            req: reqDetails,
          },
          (response) => {
            if(window.chrome.runtime.lastError){
             return console.log("window.chrome.runtime.lastError")
            }
            if (response == undefined || Object.keys(response).length == 0)
              return;
          }
        );
      }
    };

    chrome.webRequest.onBeforeRequest.addListener(pageReqListener, {
      urls: ["<all_urls>"],
    });
    return pageReqListener;
  }

  function removePageRequestsListener() {
    if (
      pageReqListener &&
      chrome.webRequest.onBeforeRequest.hasListener(pageReqListener)
    ) {
      chrome.webRequest.onBeforeRequest.removeListener(pageReqListener);
    }
  }

  return { initBlocking, addPageRequestsListener, removePageRequestsListener };
}

const dbg = DomainBlockerBackground();

dbg.initBlocking();

chrome.storage.onChanged.addListener(function (changes, namespace) {
  console.log(changes, namespace);
  for (var key in changes) {
    if (key === "blocked") {
      // Do something here
      dbg.initBlocking();
    }
  }
});

// chrome.runtime.onMessage.addListener(({ type, tabId }) => {
//   if (type == "pageAnalysisListener") {
//     console.log("pageAnalyzelistener request",tabId);
//     dbg.addPageRequestsListener(tabId);
//   }
//   if(type == "removePageReqListener"){
//     console.log("requet to remove")
//   }
//   return Promise.resolve("sure");

// });

//todo: make this work
chrome.runtime.onConnect.addListener((port) => {
  // console.log("port", port);
  port.onDisconnect.addListener((p) => {
    console.log("removing");
    dbg.removePageRequestsListener();
  });
  port.onMessage.addListener(({ type, tabId }) => {
    if (type == "pageAnalysisListener") {
      console.log("pageAnalyzelistener request", tabId);
      dbg.addPageRequestsListener(tabId);
    }
    if (type == "removePageReqListener") {
      console.log("request to remove");
      dbg.removePageRequestsListener();
    }

    return Promise.resolve("sure");
  });
});