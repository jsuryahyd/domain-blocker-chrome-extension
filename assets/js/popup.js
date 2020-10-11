/// <reference path="../../chrome.d.ts"/>
/// <reference path="./common_funcs.js"/>
/// <reference path="./models/blockEntry.js"/>
function Popup() {
  const /** @type {HTMLInputElement}*/ siteInput = document.getElementById(
      "site-url"
    );
  const siteUrlError = document.getElementById("siteUrlError");
  let btnContainer = document.getElementById("btns-container");
  const addDomainBtn = document.getElementById("add-domain");
  const saveItem = document.getElementById("save-entry");
  const editItem = document.getElementById("edit-entry");
  const domainInputs = () => document.getElementsByClassName("domain-to-block");

  const entriesTable = document.getElementById("entries-section");

  const entriesContainer = document.getElementById("block-list-entries");
  const removeEntry = document.getElementById("remove-entry");

  const analyzeLink = document.getElementById("analyze_link");
  const blockListLink = document.getElementById("block_list_link");

  const reloadPage = document.getElementById("reloadPage");
  const blockPageDomains = document.getElementById("block-page-domains");

  let analyzeListener;
  let page = { domain: "", requests: [] };

  function addClickListeners() {
    addDomainBtn.addEventListener("click", addDomainInput);
    document.addEventListener("click", async (e) => {
      if ([...e.target.classList].includes("remove-domain")) {
        e.stopPropagation();
        const closeId = e.target.getAttribute("data-close");
        removeDomainInput(closeId);
      }

      if ([...e.target.classList].includes("edit-btn")) {
        e.stopPropagation();
        //todo: disable this edit btn; also change text to 'editing'
        //todo: instead, get id from disabled edit-btn.
        const editId = e.target.getAttribute("data-edit");
        const storage = await loadFromStorage(["blocked"]); //change this string to a CONSTANT
        const entryValues = (storage.blocked || []).find((e) => e.id == editId); //better to remove use of id and identify by the website
        if (entryValues) populateEntryValues(entryValues);
        else {
          alert("An Error Occured");
          console.error(
            "no entryvalues with given id",
            editId,
            storage.blocked
          );
        }
      }
    });
    saveItem.addEventListener("click", saveEntry);
    editItem.addEventListener("click", () => {
      let editId;
      try {
        editId = btnContainer.getAttribute("data-edit").split("id-")[1];
      } catch (e) {
        console.log("no edit for you ");
      }
      saveEntry(editId);
    });

    removeEntry.addEventListener("click", async () => {
      let removeId;

      try {
        removeId = btnContainer.getAttribute("data-edit").split("id-")[1];
      } catch (e) {
        console.log(
          "no remove for you",
          document.getElementById("btns-container")
        );
        alert("An Error Occured while removing");
      }
      if (!removeId) return;
      const storage = await loadFromStorage(["blocked"]);
      const blocked = storage.blocked;
      const saved = await saveToStorage({
        blocked: blocked.filter((b) => b.id != removeId),
      });
      btnContainer.setAttribute("data-edit", "none");
      clearInputs();
      showEntries();
    });

    analyzeLink.addEventListener("click", () => {
      //add classNames
      document.body.setAttribute("data-route", "analyze-page");
      chrome.tabs.query({ active: true, currentWindow: true }, function (
        arrayOfTabs
      ) {
        console.log(arrayOfTabs);
        // chrome.tabs.reload(arrayOfTabs[0].id);
        const tabInfo = arrayOfTabs[0];
        showPageInfo(tabInfo);
        if (
          analyzeListener &&
          chrome.webRequest.onBeforeRequest.hasListener(analyzeListener)
        ) {
          chrome.webRequest.onBeforeRequest.removeListener(analyzeListener);
        }
        analyzeListener = addRequestsListener(arrayOfTabs[0].id);
        console.log(analyzeListener);
        chrome.runtime.sendMessage(
          { type: "pageAnalysisListener", analyzeListener },
          (res) => {
            console.log(res);
          }
        );
        // setTimeout(()=>{console.log(page.requests)},5000)
      });
    });

    blockListLink.addEventListener("click", () => {
      document.body.setAttribute("data-route", "block-list");
    });

    reloadPage.addEventListener("click", () => {
      chrome.tabs.reload((...args) => {
        console.log("reloaded", args);
      });
    });

    document.body.addEventListener("change", (e) => {
      if (e.target.getAttribute("name") == "to-block") {
        const toBlock = [...document.getElementsByName("to-block")]
          .filter((el) => el.checked)
          .map((el) => el.value);
        if (toBlock.length) {
          document.getElementById("block-page-domains").style.display =
            "initial";
        } else {
          document.getElementById("block-page-domains").style.display = "none";
        }
      }
    });

    blockPageDomains.addEventListener("click", () => {
      const toBlock = [...document.getElementsByName("to-block")]
        .filter((el) => el.checked)
        .map((el) => el.value);
      editEntry(page.domain, toBlock);
      document.body.setAttribute("data-route", "block-list");
    });
  }

  function saveEntry(editId) {
    const website = siteInput.value;
    const validationErr = validateUrl(website);
    if (validationErr) {
      siteUrlError.innerHTML =
        validationErr || "Please Input valid website address";
      return;
    } else {
      siteUrlError.innerHTML = "";
    }
    const domains = [];
    let domainErrors = false;
    [...domainInputs()].forEach((i, idx) => {
      const errorDisplay = document
        .getElementsByClassName("domain-entry-group")
        [idx].getElementsByClassName("domain-input-error")[0];
      const validationErr = validateUrl(i.value);
      if (validationErr) {
        errorDisplay.innerHTML = validationErr || "Invalid Domain Name";
        domainErrors = true;
      } else {
        errorDisplay.innerHTML = "";
        domains.push(i.value);
      }
    });
    if (domainErrors) return;
    let btnContainer = document.getElementById("btns-container");

    editEntry(website, domains, editId);
  }

  function addDomainInput() {
    const dynamicId = Date.now() + "" + getUniqueNumber();
    document
      .getElementById("domain-entry-wrapper")
      .insertAdjacentHTML("beforeend", newInput(dynamicId));
    const input = document.querySelector(`#group-${dynamicId} input`);
    input && input.focus();
  }

  function newInput(dynamicId, value = "") {
    return `<div class="domain-entry-group additional-entry-group" id="group-${dynamicId}"><input type="text" class="domain-to-block" value="${value}" />
    <span class="domain-input-error"></span>
  <button class="remove-domain" data-close="group-${dynamicId}" >x</button></div>`;
  }

  function removeDomainInput(closeId) {
    const el = document
      .getElementById("domain-entry-wrapper")
      .querySelector("#" + closeId);
    if (el) el.remove();
    else console.error("no el", el, closeId);
  }

  async function editEntry(website, domains, editId) {
    website = (website || "").trim().replace(/\/+$/, "");

    const data = await loadFromStorage(["blocked"]);
    const oldValues = (data.blocked || []).filter((i) => !!i && !!i.url);
    let newValues = [...oldValues];
    let alreadyPresentIdx = oldValues.findIndex(
      (i) => i.id == editId || i.url == website
    );
    if (alreadyPresentIdx != -1) {
      newValues = newValues.map((e, idx) => {
        return idx == alreadyPresentIdx
          ? { ...e, website: website, blockDomains: domains }
          : e;
      });
    } else {
      newValues = [
        ...newValues,
        {
          url: website,
          domainsToBlock: domains,
          id: Date.now() + "" + getUniqueNumber(),
        },
      ];
    }

    saveItem.setAttribute("disabled", true);
    editItem.setAttribute("disabled", true);
    const saved = await saveToStorage({
      blocked: newValues,
    });
    saveItem.removeAttribute("disabled");
    editItem.removeAttribute("disabled");
    showEntries();
    clearInputs();
  }

  function clearInputs() {
    siteInput.value = "";
    [
      ...document
        .getElementById("domain-entry-wrapper")
        .getElementsByClassName("domain-entry-group"),
    ].forEach((el, idx) => {
      if (idx == 0) el.getElementsByTagName("input")[0].value = "";
      else el.remove();
    });

    document.getElementById("btns-container").setAttribute("data-edit", "none");
  }

  async function showEntries() {
    const data = await loadFromStorage(["blocked"]);
    // entriesContainer.innerHTML = JSON.stringify(data, null, 2);
    if (!data.blocked || !data.blocked.length) {
      entriesTable.style.display = "none";
    } else {
      entriesTable.style.display = "table";
    }
    entriesContainer.innerHTML = (data.blocked || [])
      .reverse()
      .reduce((html, w) => {
        if (!w) return html;
        const entry = new BlockEntry(w).toMap();
        return (
          html +
          `<tr style="height:100%">
			<td>${entry.url}</td>
      <td>${entry.domainsToBlock.join(", ")}</td>
      <td style="padding:0;height:0"><button class="edit-btn"  data-edit="${
        entry.id
      }">Edit</button></td>
			</tr>`
        );
      }, "");
  }

  function populateEntryValues(entryValues) {
    const entry = new BlockEntry(entryValues);
    siteInput.value = entry.originalUrl;
    // first domain entry
    document.getElementsByClassName("domain-to-block")[0].value =
      entry.domainsToBlock[0];

    /* all other domain entries
        - 1)clear any existing inputs
        - 2)add new inputs with values other than first entry
        - 3) toggle submit buttons
    */

    //(1)
    [
      ...document.getElementsByClassName("additional-entry-group"),
    ].forEach((e) => e.remove());
    //(2)
    const additionalDomainsHtml = entry.domainsToBlock
      .slice(1)
      .map((d, idx) => {
        return newInput(entry.id + idx, d);
      })
      .join("");
    document
      .getElementById("domain-entry-wrapper")
      .insertAdjacentHTML("beforeend", additionalDomainsHtml);
    //(3)
    //todo: instead set the id to remove-btn and get from there.
    document
      .getElementById("btns-container")
      .setAttribute("data-edit", "id-" + entry.id);
  }

  function showPageInfo(pageInfo) {
    const url = new URL(pageInfo.url);
    page.domain = url.protocol + "//" + url.hostname;
    document.getElementById("domainName").innerHTML = page.domain;
    document.getElementById("favicon").src = pageInfo.favIconUrl;
    document.getElementById("pageUrl").innerHTML = pageInfo.url;
  }

  function addRequestsListener(tabId) {
    const listener = (reqDetails) => {
      console.log(reqDetails);
      if (reqDetails.tabId == tabId) {
        const _url = new URL(reqDetails.url);
        const domain = _url.protocol + "//" + _url.hostname;
        const domainIdx = page.requests.findIndex((r) => r.domain == domain);
        if (domainIdx >= 0) {
          page.requests[domainIdx].urls.push(_url);
          // console.log(document.querySelector(
          //   "#page-requests tbody tr[data-domain='" +
          //     domain +
          //     "'] ul"
          // ));
          // document.querySelector(
          //   "#page-requests tbody tr[data-domain=" +
          //     domain +
          //     "] ul"
          // ).innerHTML += `<li title="${
          //   reqDetails.url
          // }">${reqDetails.url.substr(0, 150)+"..."}</li>`;
          document.querySelector(
            '#page-requests tbody tr[data-domain="' + domain + '"]'
          ).innerHTML = `<td><label><input type="checkbox" value="${domain}" name="to-block" />${domain}</label></td><td><ul>${page.requests[
            domainIdx
          ].urls
            .map((r) => {
              console.log(r.href);
              return `<li title="${r.href}">${
                r.href.substr(0, 150) + "..."
              }</li>`;
            })
            .join("")}</ul></td>`;
        } else {
          page.requests.push({ domain, urls: [_url] });
          document.querySelector(
            "#page-requests tbody"
          ).innerHTML += `<tr data-domain="${domain}"><td><label><input type="checkbox" value="${domain}" name="to-block" />${domain}</label></td><td><ul><li title="${
            reqDetails.url
          }">${reqDetails.url.substr(0, 150) + "..."}</li></ul></td></tr>`;
        }
      }
    }
    chrome.webRequest.onBeforeRequest.addListener(
      listener,
      { urls: ["<all_urls>"] }
    );
    return listener;
  }

  function removeListeners() {
    // alert('remove listeners')
    if (
      analyzeListener &&
      chrome.webRequest.onBeforeRequest.hasListener(analyzeListener)
    ) {
      // alert('removed');
      chrome.webRequest.onBeforeRequest.removeListener(analyzeListener);
    }
  }

  return {
    addClickListeners,
    showEntries,
    removeListeners,
  };
}

window.addEventListener("load", function () {
  const popup = Popup();
  popup.addClickListeners();
  popup.showEntries();
  window.addEventListener("beforeunload", popup.removeListeners);
});

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   if (request.type == "popupInit") console.log("popup");
//   console.log("message");
//   console.log(
//     sender.tab
//       ? "from a content script:" + sender.tab.url
//       : "from the extension"
//   );
//   if (request.greeting == "hello") sendResponse({ farewell: "goodbye" });
//   return true;
// });
