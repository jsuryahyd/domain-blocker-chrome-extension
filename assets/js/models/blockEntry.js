function BlockEntry(params) {
  if (!params || typeof params != "object")
    throw "no params passsed for BlockEntry " + params;
  let { url, domainsToBlock, id } = params;
  if (!id) throw "no id for " + JSON.stringify({ url, domainsToBlock, id });
  if (!url) throw "no url for " + JSON.stringify({ url, domainsToBlock, id });
  if (!domainsToBlock || !domainsToBlock.length)
    throw (
      "no domainsToBlock for " + JSON.stringify({ url, domainsToBlock, id })
    );
  if (url.indexOf("http") == -1) {
    // throw "Please include http:// | https:// in website address";
    this.allProtocols = true;
  }

  this.url = new URL(url.indexOf("http") == -1 ? "http://" + url : url); //just to emulate they are added
  this.originalUrl = url;
  this.domainsToBlock = domainsToBlock;
  this.id = id;
  this.toMap = () => {
    return { url: url, domainsToBlock: this.domainsToBlock, id: this.id };
  };
}
