/**
 * Ce script de ligne de commande fait des requêtes sur la base de données et
 * génère les fichiers de données films et seances correspondant au programme et cycle passé en paramètres.
 */
const fs = require("fs");
const _ = require("lodash");
const database = require("./lib/database");
const config = {
  main: require("./config/main.js"),
  access: require("./config/access.js"),
};
const seances = require("./lib/query/seances.js");
const films = require("./lib/query/films.js");
const confs = require("./lib/query/confs.js");
const texts = require("./lib/query/texts.js");
const cats = require("./lib/query/cats.js"); // Requête de contrôle de cohérence des catégories

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
  var doTexts = !_.isUndefined(args.t);
} catch (e) {
  console.error(
    "ERREUR : Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>."
  );
  process.exit(1);
}

// TODO: vérification de l'existence du répertoire du programme (sinon erreur et suggérer d'exécuter le script init)

(async function () {
  let progConfig = await helpers.fetchProgConfig(
    idProg,
    config.access.pathDataConfig
  );
  let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  let cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  try {
    const db = await database.attach(config.access.db);

    console.log("Connecté à la base de données.");

    // Vérification de la cohérence des catégories
    let catsListDb = await cats(db, cycleConfig);
    let diffCats = _(catsListDb)
      .differenceWith(
        helpers.getIdCats(cycleConfig),
        (e1, e2) => e1.idCategorie === e2
      )
      .map((e) => `- ${_.values(e).join(" : ")}`)
      .value()
      .join("\n");

    if (diffCats.length > 0) {
      console.log(
        `AVERTISSEMENT : des catégories de ce cycle ne sont pas déclarées dans le fichier de configuration du cycle :\n${diffCats}\n`
      );
    } else {
      console.log(
        "Les catégories de ce cycle sont bien toutes déclarées dans le fichier de configuration du cycle."
      );
    }

    console.log(
      `Importation des données pour le cycle ${cycleFullCode.join(" ")}.`
    );

    // Films
    if (doFilms) {
      console.log(`Requête films.`);
      let f = await films(db, cycleConfig);
      console.log(`Films : ${_.map(f).length} items.`);

      await helpers.writeFileInFolder(
        `${config.access.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.json`,
        JSON.stringify(f, null, 2),
        "utf8"
      );

      // 2019-11-18 : On compare ces données avec celles d'un éventuel fichier _FILMS_EDIT.json pour voir s'il y a des films supplémentaires.
      // Si c'est le cas, un fichier _FILMS_ADD.json contenant les ajouts est écrit.
      try {
        let f_def = await helpers.readFileAsJson(
          `${config.access.pathData.remote}/${progDirectoryName}`,
          `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
          `${cycleFullCode[0]}_FILMS_EDIT ${cycleFullCode[1]}.json`
        );

        let f_additions = _.differenceBy(f, f_def, "idFilm");
        console.log(f_additions);

        if (f_additions.length > 0) {
          await helpers.writeFileInFolder(
            `${config.access.pathData.remote}/${progDirectoryName}`,
            `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
            `${cycleFullCode[0]}_FILMS_ADD ${cycleFullCode[1]}.json`,
            JSON.stringify(f_additions, null, 2),
            "utf8"
          );
          console.log(
            `AVERTISSEMENT : ${f_additions.length} films supplémentaires ont été trouvés. Un fichier d'ajouts a été écrit : ${cycleFullCode[0]}_FILMS_ADD ${cycleFullCode[1]}.json`
          );
        }
      } catch (e) {
        // console.log(e);
      }
    }

    // Confs (flag -a)
    if (doConfs) {
      console.log(`Requête confs.`);
      let c = await confs(db, cycleConfig);
      console.log(`Conférences : ${_.map(c).length} items.`);
      await helpers.writeFileInFolder(
        `${config.access.pathData.remote}/${progDirectoryName}`,
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
            .map((d) => _(d).map().value())
            .flattenDeep()
            .value().length
        } items.`
      );
      await helpers.writeFileInFolder(
        `${config.access.pathData.remote}/${progDirectoryName}`,
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
        `${config.access.pathData.remote}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_SEANCES ${cycleFullCode[1]}.json`,
        JSON.stringify(s, null, 2),
        "utf8"
      );
    }
    database.detach(db);
    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
