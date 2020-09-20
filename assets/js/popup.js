/// <reference path="../../chrome.d.ts"/>
function Popup() {



  const siteInput = document.getElementById("site-url");
  const siteUrlError = document.getElementById("siteUrlError");

  const addDomainBtn = document.getElementById("add-domain");
  const saveItem = document.getElementById("save-entry");
  const editItem = document.getElementById("edit-entry");
  const domainInputs = () => document.getElementsByClassName("domain-to-block");

  const entriesTable = document.getElementById("entries-section");

  const entriesContainer = document.getElementById("block-list-entries");
  const removeEntry = document.getElementById("remove-entry");

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
    saveItem.addEventListener("click", () => {
      const website = siteInput.value;
      if (!is_url(website)) {
        siteUrlError.innerHTML = "Please Input valid website address";
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
        if (!is_url(i.value)) {
          errorDisplay.innerHTML = "Invalid Domain Name";
          domainErrors = true;
        } else {
          errorDisplay.innerHTML = "";
          domains.push(i.value);
        }
      });
      if (domainErrors) return;
      addDomain(website, domains);
    });
    editItem.addEventListener("click", () => {
      const website = siteInput.value;
      if (!is_url(website)) {
        siteUrlError.innerHTML = "Please Input valid website address";
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
        if (!is_url(i.value)) {
          errorDisplay.innerHTML = "Invalid Domain Name";
          domainErrors = true;
        } else {
          errorDisplay.innerHTML = "";
          domains.push(i.value);
        }
      });
      if (domainErrors) return;
      let editId;
      let btnContainer = document.getElementById("btns-container");
      try{
        editId = btnContainer.getAttribute("data-edit").split("id-")[1]
      }catch(e){
        console.log("no edit for you ",)
      }
      editEntry(website, domains,editId);      
    });

    removeEntry.addEventListener("click", async () => {
      let removeId;
      let btnContainer = document.getElementById("btns-container");
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
  }

  function addDomainInput() {
    const dynamicId = Date.now() + "" + getUniqueNumber();
    document
      .getElementById("domain-entry-wrapper")
      .insertAdjacentHTML("beforeend", newInput(dynamicId));
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

  async function addDomain(website, domains) {
    website = (website || "").trim().replace(/\/+$/, "");

    const data = await loadFromStorage(["blocked"]);
    const oldValues = (data.blocked || []).filter((i) => !!i && !!i.website);
    let newValues = [...oldValues];
    let alreadyPresentIdx = oldValues.findIndex((i) => i.website == website);
    if (alreadyPresentIdx != -1) {
      newValues = newValues.map((e, idx) => {
        return idx == alreadyPresentIdx ? { ...e, blockDomains: domains } : e;
      });
    } else {
      newValues = [
        ...newValues,
        {
          website: website,
          blockDomains: domains,
          blockWebsite: false, //todo: not using this!!!
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
    // console.log("*********", await loadFromStorage(["blocked"]));
  }

  async function editEntry(website, domains,editId) {
    website = (website || "").trim().replace(/\/+$/, "");

    const data = await loadFromStorage(["blocked"]);
    const oldValues = (data.blocked || []).filter((i) => !!i && !!i.website);
    let newValues = [...oldValues];
    let alreadyPresentIdx = oldValues.findIndex((i) => i.id == editId);
    if (alreadyPresentIdx != -1) {
      newValues = newValues.map((e, idx) => {
        return idx == alreadyPresentIdx ? { ...e, blockDomains: domains } : e;
      });
    } else {
      newValues = [
        ...newValues,
        {
          website: website,
          blockDomains: domains,
          blockWebsite: false,
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
  }

  async function showEntries() {
    const data = await loadFromStorage(["blocked"]);
    // entriesContainer.innerHTML = JSON.stringify(data, null, 2);
    if(!data.blocked || !data.blocked.length){
      entriesTable.style.display = "none"
    }else{
      entriesTable.style.display = "table"
    }
    entriesContainer.innerHTML = (data.blocked || [])
      .reverse()
      .reduce((html, w) => {
        if (!w) return html;
        return (
          html +
          `<tr style="height:100%">
			<td>${w.website}</td>
      <td>${w.blockDomains.join(", ")}</td>
      <td style="padding:0;height:0"><button class="edit-btn"  data-edit="${
        w.id
      }">Edit</button></td>
			</tr>`
        );
      }, "");
  }

  function populateEntryValues(entry) {
    const entryValues = new BlockEntry(entry);
    siteInput.value = entryValues.website;
    // first domain entry
    document.getElementsByClassName("domain-to-block")[0].value =
      entryValues.blockDomains[0];

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
    const additionalDomainsHtml = entryValues.blockDomains
      .slice(1)
      .map((d, idx) => {
        return newInput(entryValues.id + idx, d);
      })
      .join("");
    document
      .getElementById("domain-entry-wrapper")
      .insertAdjacentHTML("beforeend", additionalDomainsHtml);
    //(3)
    //todo: instead set the id to remove-btn and get from there.
    document
      .getElementById("btns-container")
      .setAttribute("data-edit", "id-" + entryValues.id);
  }

  return {
    addClickListeners,
    showEntries,
  };
}

window.addEventListener("load", function () {
  const popup = Popup();
  popup.addClickListeners();
  popup.showEntries();
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
