const fs = require("fs");
const { exec } = require("child_process");
function Deploy() {
  let envVars = {};
  let tempFolderName = "./.build";

  function createZip() {
    createNewTempFolder();
  } //deploying

  function createManifestForDevelopment() {
		replaceManifestPlaceholders(true)
	}

  function createNewTempFolder() {
    deleteTempFolder();
    fs.mkdir(tempFolderName, {}, (err) => {
      if (err) return console.error(err);
      console.log("temp build folder created");
      exec(
        "rsync -r ./* --exclude 'manifest.dummy.json' --exclude '*.zip' --exclude 'deploy.js' .build/",
        (err, stdout, stderr) => {
          if (err) return console.error(err);
          console.log(err, stdout, stderr);
          console.log("copied");
          replaceManifestPlaceholders();
        }
      );
    });
  }
  function replaceManifestPlaceholders(isDev) {
    fs.readFile("./.env", "utf-8", (err, data) => {
      if (err) return console.error("error loading env :" + err);
      const vars = {};
      data
        .split("\n")
        .filter(
          (line) =>
            !line.startsWith("#") && [...line.matchAll(/=/g)].length == 1
        )
        .forEach((i) => (vars[i.split("=")[0]] = i.split("=")[1]));

      envVars = vars;

      fs.readFile("./manifest.dummy.json", "utf-8", (err, data) => {
        if (err) return console.error("error loading env :" + err);
        const newData = data.replace(/\{\{.*\}\}/g, (match) => {
          // console.log(match,vars[match.replace(/(^\{\{)|(\}\}$)/g, "")]);
          return vars[match.replace(/(^\{\{)|(\}\}$)/g, "")];
        });

        fs.writeFile(
          isDev ? "./manifest.json" : tempFolderName + "/manifest.json",
          newData,
          { encoding: "utf-8" },
          (err) => {
           if(err) return console.error(err, "fileWriteError");
            !isDev && zipTempFolder();
          }
        );
      });
    });
  }

  function zipTempFolder() {
    // const zipFileName = `sticky_notes-${new Date().toLocaleDateString().replace(/\//g,"-")}.zip`
    const zipFileName = `sticky_notes-${envVars["version"] || ""}\(${new Date()
      .toLocaleString()
      .replace(/\//g, "-")}\).zip`;
    exec(
      `cd .build && zip "../${zipFileName}" -r ./* -x 'manifest.source.json' -x '*.zip' && cd ..`,
      (err, output, stderr) => {
        if (err) return console.error(err);
        console.log(err, output, stderr);
        console.log("zipped");
        deleteTempFolder();
      }
    );
  }

  function deleteTempFolder() {
    if (fs.existsSync(tempFolderName)) {
      fs.rmdirSync(tempFolderName, { recursive: true });
    }
  }

  return {
    // deleteTempFolder,
    // zipTempFolder,
    // createNewTempFolder,
    // replaceManifestPlaceholders,
		 createZip,
	createManifestForDevelopment
  };
}
const buildHelper = Deploy();
// buildHelper.createZip();
module.exports = buildHelper;
