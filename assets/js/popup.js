/// <reference path="../../chrome.d.ts"/>
function Popup() {
  const siteInput = document.getElementById("site-url");
  const siteUrlError = document.getElementById("siteUrlError");

  const addDomainBtn = document.getElementById("add-domain");
  const saveItem = document.getElementById("save-entry");
  const domainInputs = () => document.getElementsByClassName("domain-to-block");
  const entriesContainer = document.getElementById("block-list-entries");

  function addClickListeners() {
    addDomainBtn.addEventListener("click", addDomainInput);
    document.addEventListener("click", (e) => {
      if ([...e.target.classList].includes("remove-domain")) {
        e.stopPropagation();
        const closeId = e.target.getAttribute("data-close");
        removeDomainInput(closeId);
      }
    });
    saveItem.addEventListener("click", () => {
      const website = siteInput.value;
      if (!is_url(website)) {
        siteUrlError.innerHTML = "Please Input valid website address";
				return 
			}else{
				siteUrlError.innerHTML = ""
			}
      const domains = [];
			let domainErrors = false;
			[...domainInputs()].forEach((i, idx) => {
        const errorDisplay = document
          .getElementsByClassName("domain-entry-group")
          [idx].getElementsByClassName("domain-input-error")[0];
        if (!is_url(i.value)) {
					errorDisplay.innerHTML = "Invalid Domain Name";
					domainErrors = true;
        } else {
          errorDisplay.innerHTML = "";
					domains.push(i.value);
        }
      });
			if(domainErrors) return
      addDomain(website, domains);
    });

    showEntries();
  }

  function addDomainInput() {
    const dynamicId = Date.now() + "" + getUniqueNumber();
    document.getElementById("domain-entry-wrapper").insertAdjacentHTML(
      "beforeend",
      `<div class="domain-entry-group" id="group-${dynamicId}"><input type="text" class="domain-to-block" />
			<span class="domain-input-error"></span>
		<button class="remove-domain" data-close="group-${dynamicId}" >x</button></div>`
    );
  }

  function removeDomainInput(closeId) {
    const el = document
      .getElementById("domain-entry-wrapper")
      .querySelector("#" + closeId);
    if (el) el.remove();
    else console.error("no el", el, closeId);
  }

  //refactor this func and params it takes:validate outside this func
  async function addDomain(website, domains) {
    //todo: show entry already exxists error
    saveItem.setAttribute("disabled", true);
    const data = await loadFromStorage(["blocked"]);
    const saved = await saveToStorage({
      blocked: [
        ...(data.blocked || []).filter(i=>!!i && !!i.website),
        { website: website, blockDomains: domains, blockWebsite: false },
      ],
    });
    saveItem.removeAttribute("disabled");
    showEntries();
    clearInputs();
    console.log("*********", await loadFromStorage(["blocked"]));
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
  }

  async function showEntries() {
    const data = await loadFromStorage(["blocked"]);
    // entriesContainer.innerHTML = JSON.stringify(data, null, 2);
    entriesContainer.innerHTML = data.blocked.reverse().reduce((html, w) => {
			if(!w) return html;
      return (
        html +
        `<tr>
			<td>${w.website}</td>
			<td>${w.blockDomains.join(", ")}</td>
			</tr>`
      );
    }, "");
  }

  return {
    addClickListeners,
  };
}

window.addEventListener("load", function () {
  const popup = Popup();
  popup.addClickListeners();
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