/**
 * Ce script de ligne de commande fait des requêtes sur la base de données et
 * génère les fichiers de données films et seances correspondant au programme et cycle passé en paramètres.
 */
const fs = require("fs");
const _ = require("lodash");
const database = require("./lib/database");
const config = require("./lib/config.js");
const seances = require("./lib/query/seances.js");
const films = require("./lib/query/films.js");
const confs = require("./lib/query/confs.js");
const texts = require("./lib/query/texts.js");

const helpers = require("./lib/helpers.js");
const { promisify } = require("util"); // https://stackoverflow.com/questions/40593875/using-filesystem-in-node-js-with-async-await

// const copyFile = promisify(fs.copyFile);

// Décode les arguments passés de la forme : -p 55 -c 400 -f
try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));

  var idProg = helpers.toNumOrNull(args.p[0]);
  var idCycle = helpers.toNumOrNull(args.c[0]);
  var doFilms = !_.isUndefined(args.f);
  var doSeances = !_.isUndefined(args.s);
  var doConfs = !_.isUndefined(args.a); // Flag `a` comme "action culturelle"
  var doTexts = !_.isUndefined(args.t); // Flag `a` comme "action culturelle"
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>."
  );
}

// TODO: vérification de l'existence du répertoire du programme (sinon erreur et suggérer d'exécuter le script init)

(async function() {
  let progConfig = await helpers.fetchProgConfig(idProg);
  let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  let cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  try {
    const db = await database.attach(config.db);

    console.log(
      `Importation des données pour le cycle ${cycleFullCode.join(" ")}.`
    );
    console.log("Connecté à la base de données.");

    // Films
    if (doFilms) {
      console.log(`Requête films.`);
      let f = await films(db, cycleConfig);
      console.log(`Films : ${_.map(f).length} items.`);

      await helpers.writeFileInFolder(
        `${config.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.json`,
        JSON.stringify(f, null, 2),
        "utf8"
      );

      // 2019-11-18 : On compare ces données avec celles d'un éventuel fichier _FILM_DEF.json pour voir s'il y a des films supplémentaires.
      // Si c'est le cas, un fichier _FILMS_ADD.json contenant les ajouts est écrit.
      try {
        let f_def = await helpers.readFileAsJson(
          `${config.pathData.remote}/${progDirectoryName}`,
          `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
          `${cycleFullCode[0]}_FILMS_DEF ${cycleFullCode[1]}.json`
        );

        let f_additions = _.differenceBy(f, f_def, "idFilm");

        if (f_additions.length > 0) {
          await helpers.writeFileInFolder(
            `${config.pathData.remote}/${progDirectoryName}`,
            `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
            `${cycleFullCode[0]}_FILMS_ADD ${cycleFullCode[1]}.json`,
            JSON.stringify(f_additions, null, 2),
            "utf8"
          );
          console.log(
            `${f_additions.length} films supplémentaires ont été trouvés. Un fichier d'ajouts a été écrit : ${cycleFullCode[0]}_FILMS_ADD ${cycleFullCode[1]}.json`
          );
        }
      } catch (e) {}
    }

    // Confs (flag -a)
    if (doConfs) {
      console.log(`Requête confs.`);
      let c = await confs(db, cycleConfig);
      console.log(`Conférences : ${_.map(c).length} items.`);
      await helpers.writeFileInFolder(
        `${config.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_CONFS ${cycleFullCode[1]}.json`,
        JSON.stringify(c, null, 2),
        "utf8"
      );
    }

    // Textes (flag -t)
    if (doTexts) {
      console.log(`Requête textes.`);
      let t = await texts(db, cycleConfig);
      console.log(
        `Textes : ${
          _(t)
            .map(d =>
              _(d)
                .map()
                .value()
            )
            .flattenDeep()
            .value().length
        } items.`
      );
      await helpers.writeFileInFolder(
        `${config.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_TEXTS ${cycleFullCode[1]}.json`,
        JSON.stringify(t, null, 2),
        "utf8"
      );
    }

    // Séances (flag -s)
    if (doSeances) {
      console.log(`Requête séances.`);
      let s = await seances(db, cycleConfig);
      console.log(`Séances : ${s.length} items.`);

      await helpers.writeFileInFolder(
        `${config.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_SEANCES ${cycleFullCode[1]}.json`,
        JSON.stringify(s, null, 2),
        "utf8"
      );
    }
    database.detach(db);
  } catch (e) {
    console.log(e);
  }
})();
