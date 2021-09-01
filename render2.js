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
  seances = seancesAddFilmsConfs(seances, films, confs);
  seances = seancesAddRelated(seances);
  let merge = seances;

  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}/generated_test`,
    `${cycleFullCode[0]}_MERGE2${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.json`,
    JSON.stringify(merge, null, 2),
    "utf8"
  );
  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/generated_test`,
      `${cycleFullCode[0]}_MERGE2 ${cycleFullCode[1]}.json`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_MERGE2 ${cycleFullCode[1]}.json`
      );
    }
  }
})();

/**
 * seancesAddRelated
 * Complète les données séances ayant une séance associée avec une propriété `mentionAssoc` donnant des indications sur la séance "jumelle".
 * Dans le cas de { typeAssoc: 117 } (consécutives), il s'agit de deux séances véritablement distinctes.
 * Dans le cas de { typeAssoc: 118 } (regroupées), il s'agit de 2 "segments" d'une même séance.
 * @param {Array} seances Tableau de données séances (d'un cycle)
 * @return {Array} Table de données séances complété
 */
function seancesAddRelated(seances) {
  return _(seances)
    .map((d) => {
      let typeAssoc = d.typeAssoc;
      if (typeAssoc === 118 || typeAssoc === 117) {
        let j = _(seances).find(
          (e) =>
            e.typeAssoc === typeAssoc &&
            e.idSeance === (typeAssoc === 117 ? d.idSeanceAssoc : d.idSeance) &&
            e.typeEvenement === (d.typeEvenement === 13 ? 14 : 13)
        );
        if (!j) return d;
        let mentionAssoc = null;
        if (typeAssoc === 118 && j.typeEvenement === 13)
          mentionAssoc = { mentionAssoc: `Séance regroupée. Voir aussi film.` };
        if (typeAssoc === 118 && j.typeEvenement === 14)
          mentionAssoc = {
            mentionAssoc: `Séance regroupée. Voir aussi conférence.`,
          };
        if (typeAssoc === 117 && j.typeEvenement === 13)
          mentionAssoc = {
            mentionAssoc: `Séance consécutive. Voir aussi film.`,
          };
        if (typeAssoc === 117 && j.typeEvenement === 14)
          mentionAssoc = {
            mentionAssoc: `Séance consécutive. Voir aussi conférence.`,
          };

        return _(d).assign(mentionAssoc).value();
      } else return d;
    })
    .value();
}

/**
 * seancesAddFilmsConfs
 * A partir des données séances, films et conférence, renvoie des données fusionnées (avec le détail des films/conférences)
 * suivant l'énumération des séances.
 * @param {Array} seances
 * @param {Array} films
 * @param {Array} confs
 * @return {Array} Données fusionnées
 */
function seancesAddFilmsConfs(seances, films, confs) {
  return _(seances)
    .map((s) => {
      if (s.typeEvenement === 13) {
        return _(s)
          .assign({
            items: _(s.items)
              .map((s1) =>
                _(s1)
                  .assign(_(films).find((f) => f.idFilm === s1.idFilm))
                  .value()
              )
              .value(),
          })
          .value();
      }
      if (s.typeEvenement === 14) {
        return _(s)
          .assign({
            items: [
              _(s.items[0])
                .assign(_(confs).find((c) => c.idEvenement === s.idEvenement))
                .value(),
            ],
          })
          .value();
      }
    })
    .value();
}

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
