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
  access: require("./config/access.js"),
};
const PQueue = require("p-queue"); // https://github.com/sindresorhus/p-queue
const queue = new PQueue({
  concurrency: 1,
});

const doCalendar = require("./lib/transforms/calendar.js");

const basePath = config.access.pathData.remote;

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme>"
  );
}

(async function () {
  let progConfig = await helpers.fetchProgConfig(
    idProg,
    config.access.pathDataConfig
  );

  // let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme

  let o = _(progConfig.cycles)
    .map((d) => helpers.getFullCode.cycle(progConfig, d.idCycleProg))
    .value();

  o = await queue.addAll(
    _(o).map((d) => {
      return async () =>
        new Promise(async (resolve, reject) => {
          let res;
          try {
            res = await helpers.readFileAsJson(
              `${basePath}/${progDirectoryName}`,
              `${d[0]} ${d[1]}/generated`,
              `${d[0]}_MERGE_DEF ${d[1]}.json`
            );

            res = _(res).assign({ cycle: d[1] }).value();

            resolve(res);
          } catch (e) {
            resolve({ data: [] });
            // reject(e);
          }
        });
    })
  );

  o = _(o)
    .map((d) =>
      _(d.data)
        .map((e) => {
          let titreSousCycle = e.titreSousCycle;
          return _(e.items)
            .map((f) => {
              return _({})
                .assign(
                  _.pick(f, [
                    "idSeance",
                    "ordre",
                    "dateHeure",
                    "idSalle",
                    "titreEvenement",
                    "mention",
                    "idFilm",
                    "titre",
                    "art",
                    "realisateurs",
                    "annee",
                    "duree",
                    "version",
                  ]),
                  { titreSousCycle }
                )
                .value();
            })
            .groupBy("idSeance")
            .map((v, k) => {
              return {
                idSeance: k,
                cycle: d.cycle,
                titreSousCycle: v[0].titreSousCycle,
                dateHeure: v[0].dateHeure,
                idSalle: v[0].idSalle,
                titreEvenement: v[0].titreEvenement,
                mention: v[0].mention,
                items: _(v)
                  .map((w) =>
                    _.pick(w, [
                      "idFilm",
                      "titre",
                      "art",
                      "realisateurs",
                      "annee",
                      "duree",
                      "version",
                      "mention",
                    ])
                  )
                  .value(),
              };
            })
            .value();
        })
        .flatten()
        .value()
    )
    .flatten()
    .sortBy((v) => v.dateHeure)
    .value();

  const rendered = _(o)
    .groupBy((d) => d.dateHeure.substring(0, 10))
    .mapValues((day) =>
      _(day)
        .map((seance) => {
          return {
            salle: seance.idSalle[0],
            heure: seance.dateHeure.substring(11, 16),
            cycle: seance.cycle,
            titreSousCycle: seance.titreSousCycle,
            mention: seance.mention,
            items: _(seance.items)
              .map((d) => {
                return {
                  titre: d.titre,
                  art: d.art,
                  realisateurs: d.realisateurs,
                  duree: d.duree,
                  version: d.version,
                };
              })
              .value(),
          };
        })
        .value()
    )
    .value();

  console.log(doCalendar(rendered));

  // await helpers.writeFileInFolder(
  //   `${basePath}/${progDirectoryName}`,
  //   "",
  //   `${progDirectoryName}_CALENDAR.json`,
  //   JSON.stringify(o, null, 2),
  //   "utf8"
  // );
})();
