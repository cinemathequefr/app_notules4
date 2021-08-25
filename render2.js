// Script pour générer un fichier _MERGE2, nouvelle structure de données pour remplacer _MERGE.
// Cette nouvelle structure suivra directement la structure des fichiers _SEANCES, en complétant les items par les données provenant de _FILMS et _CONFS.
// cf. journal du 25 août 2021.

const fs = require("fs");
const _ = require("lodash");
const { promisify } = require("util");
const helpers = require("./lib/helpers.js");
const config = {
  access: require("./config/access.js"),
};

const basePath = config.access.pathData.remote;

let args, idProg, idCycle;
let isDef = false;

try {
  args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  idProg = helpers.toNumOrNull(args.p[0]);
  idCycle = helpers.toNumOrNull(args.c[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>"
  );
}

(async function () {
  const progConfig = await helpers.fetchProgConfig(
    idProg,
    config.access.pathDataConfig
  );
  const cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  const progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  const cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  // Lecture des données séances
  seances = await helpers.readFileAsJson(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
    `${cycleFullCode[0]}_SEANCES ${cycleFullCode[1]}.json`
  );

  // Lecture des données films
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

  // Lecture des données confs
  try {
    confs = await helpers.readFileAsJson(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
      `${cycleFullCode[0]}_CONFS_EDIT ${cycleFullCode[1]}.json`
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

  seances = seancesAddCycleInfo(cycleConfig, seances);

  console.log(seances);
})();

/**
 * seancesAddCycleInfo
 * Complète les données de séances : pour chaque séance, ajoute le titre de son cycle et sous-cycle.
 * @param {Object} cycleConfig
 * @param {Array} seances
 * @return {Array}
 */
function seancesAddCycleInfo(cycleConfig, seances) {
  return _(seances)
    .map((s) => {
      let titreSousCycle;
      // Transforme la propriété sousCycles en tableau faisant correspondre à chaque `idCategorie` le titre de son sous-cycle,
      // puis renvoie le titre du sous-cycle correspondant à l'`idCategorie` de la séance.
      titreSousCycle = _(cycleConfig.sousCycles)
        .map((e) =>
          _(e.cats)
            .map((f) => [e.titre, f])
            .value()
        )
        .flatten()
        .find((g) => g[1] === s.idCategorie)[0];
      titreSousCycle = !_.isUndefined(titreSousCycle)
        ? { titreSousCycle }
        : null;

      return _(s)
        .assign({ titreCycle: cycleConfig.titreCycle }, titreSousCycle)
        .value();
    })
    .value();
}
