const fs = require("fs");
const _ = require("lodash");
const { promisify } = require("util");
const helpers = require("./lib/helpers.js");
const format = require("./lib/format.js");
const doMerge = require("./lib/transforms/merge.js");
// const cleanTitreEvenement = require("./lib/transforms/clean_titre_evenement.js");
const doRender = require("./lib/transforms/render.js");
const doMarkdown = require("./lib/transforms/markdown.js");
const doTaggedText = require("./lib/transforms/tt.js");

const basePath = require("./config/access.js").pathData.remote;

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
  var idCycle = helpers.toNumOrNull(args.c[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>"
  );
}

(async function() {
  let progConfig = await helpers.fetchProgConfig(idProg);
  let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  let cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  let films;
  let seances;
  let confs = [];
  let texts; // = {};
  let merge;
  let render;
  let markdown;
  let taggedText;
  let isDef = false;

  // Lecture des données séances
  seances = await helpers.readFileAsJson(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
    `${cycleFullCode[0]}_SEANCES ${cycleFullCode[1]}.json`
  );

  // Lecture des données films
  // On cherche en priorité le fichier _FILMS_EDIT.json
  // A défaut, on prend le fichier _FILMS.json sur local (données non définitives)
  try {
    films = await helpers.readFileAsJson(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
      `${cycleFullCode[0]}_FILMS_EDIT ${cycleFullCode[1]}.json`
    );
    isDef = true;
  } catch (e) {
    try {
      films = await helpers.readFileAsJson(
        `${basePath}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.json`
      );
      isDef = false;
    } catch (e) {
      console.log(e); // Erreur fatale : ni _FILMS_EDIT.json, ni _FILMS.json n'ont été trouvés
      process.exit(1); // Faut-il sortir du process ou continuer sans films ?
    }
  }

  // Lecture des données _CONFS
  try {
    confs = await helpers.readFileAsJson(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
      `${cycleFullCode[0]}_CONFS_DEF ${cycleFullCode[1]}.json`
    );
    console.log("Info : utilise les données CONFS_EDIT.");
  } catch (e) {
    try {
      confs = await helpers.readFileAsJson(
        `${basePath}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_CONFS ${cycleFullCode[1]}.json`
      );
      console.log("Info : utilise les données CONFS (non _EDIT).");
    } catch (e) {
      console.log("Info : aucune donnée _CONFS n'a  été trouvée.");
    }
  }

  // Lecture des données _TEXTS
  try {
    texts = await helpers.readFileAsJson(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
      `${cycleFullCode[0]}_TEXTS_EDIT ${cycleFullCode[1]}.json`
    );
    console.log("Info : utilise les données TEXTS_EDIT.");
  } catch (e) {
    try {
      texts = await helpers.readFileAsJson(
        `${basePath}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_TEXTS ${cycleFullCode[1]}.json`
      );
      console.log("Info : utilise les données TEXTS (non _EDIT).");
    } catch (e) {
      console.log("Info : aucune donnée _TEXTS n'a  été trouvée.");
    }
  }

  // _MERGE : Fusion des données films, séances, confs et texts.
  merge = doMerge(cycleConfig, films, seances, confs, texts);
  // merge = cleanTitreEvenement(merge); // cf. 2019-10-03

  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
    `${cycleFullCode[0]}_MERGE${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.json`,
    JSON.stringify(merge, null, 2),
    "utf8"
  );
  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
      `${cycleFullCode[0]}_MERGE ${cycleFullCode[1]}.json`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_MERGE ${cycleFullCode[1]}.json`
      );
    }
  }

  // _RENDER : Transformation de _MERGE en prenant en compte les regroupements et tri dans les sous-cycles
  render = {
    header: cycleConfig,
    data: doRender(merge.data)
  };
  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
    `${cycleFullCode[0]}_RENDER${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.json`,
    JSON.stringify(render, null, 2),
    "utf8"
  );
  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
      `${cycleFullCode[0]}_RENDER ${cycleFullCode[1]}.json`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_RENDER ${cycleFullCode[1]}.json`
      );
    }
  }

  // Conversion de _RENDER au format Markdown
  markdown = doMarkdown(render);
  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}`,
    `${cycleFullCode[0]}_CYCLE${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.md`,
    markdown,
    "utf8"
  );
  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}`,
      `${cycleFullCode[0]}_CYCLE ${cycleFullCode[1]}.md`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_CYCLE ${cycleFullCode[1]}.md`
      );
    }
  }

  // Conversion de _RENDER au format Tagged Text
  taggedText = doTaggedText(render);
  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}`,
    `${cycleFullCode[0]}_CYCLE${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.txt`,
    taggedText,
    "latin1"
  );
  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}`,
      `${cycleFullCode[0]}_CYCLE ${cycleFullCode[1]}.txt`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_CYCLE ${cycleFullCode[1]}.txt`
      );
    }
  }
})();
