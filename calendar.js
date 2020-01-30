/**
 * calendar
 * Génère le calendrier des séances du programme à partir des fichiers _MERGE.json de chaque cycle.
 * En cours.
 */

// const fs = require("fs");
const _ = require("lodash");
// const { promisify } = require("util");
const helpers = require("./lib/helpers.js");
const config = {
  access: require("./config/access.js")
};
const PQueue = require("p-queue"); // https://github.com/sindresorhus/p-queue
const queue = new PQueue({
  concurrency: 1
});

const basePath = config.access.pathData.remote;

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme>"
  );
}

(async function() {
  let progConfig = await helpers.fetchProgConfig(
    idProg,
    config.access.pathDataConfig
  );

  // let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme

  let o = _(progConfig.cycles)
    .map(d => helpers.getFullCode.cycle(progConfig, d.idCycleProg))
    .value();

  o = await queue.addAll(
    _(o).map(d => {
      return async () =>
        new Promise(async (resolve, reject) => {
          let res;
          try {
            res = await helpers.readFileAsJson(
              `${basePath}/${progDirectoryName}`,
              `${d[0]} ${d[1]}/generated`,
              `${d[0]}_MERGE_DEF ${d[1]}.json`
            );

            resolve(res);
          } catch (e) {
            reject(e);
          }
        });
    })
  );

  o = _(o)
    .map(d =>
      _(d.data)
        .map(e =>
          _(e.items)
            .map(f =>
              _.pick(f, [
                "idSeance",
                "ordre",
                "dateHeure",
                "idSalle",
                "idFilm",
                "titre",
                "art",
                "realisateurs",
                "annee"
              ])
            )
            .groupBy("idSeance")
            .map((v, k) => {
              return {
                idSeance: k,
                dateHeure: v[0].dateHeure,
                idSalle: v[0].idSalle,
                items: _(v)
                  .map(w =>
                    _.pick(w, [
                      "idFilm",
                      "titre",
                      "art",
                      "realisateurs",
                      "annee"
                    ])
                  )
                  .value()
              };
            })
            .value()
        )
        .flatten()
        .value()
    )
    .flatten()
    .sortBy(v => v.dateHeure)
    .value();

  // console.log(JSON.stringify(o, null, 2));
  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    "",
    `${progDirectoryName}_CALENDAR.json`,
    JSON.stringify(o, null, 2),
    "utf8"
  );
})();
