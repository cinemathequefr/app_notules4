/**
 * calendar
 * Génère le calendrier des séances du programme à partir des fichiers _MERGE_DEF.json de chaque cycle.
 */
const _ = require("lodash");
// const database = require("./lib/database");
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
// const pages = require("./lib/query/pages.js");
// let evenementsPages;

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

  const progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme

  // Tableau des IDs des catégories du programme.
  // (Utilisé pour faire une requête sur Cinédoc pour obtenir le foliotage.)
  // TODO: déplacer dans le rendu du calendrier papier ?
  // let catsInProg = _(progConfig)
  //   .thru((d) => {
  //     return _(d.cycles)
  //       .map((e) =>
  //         _(e.sousCycles)
  //           .map((f) => f.cats)
  //           .value()
  //       )
  //       .value();
  //   })
  //   .flattenDeep()
  //   .uniq()
  //   .sort()
  //   .value();

  // TODO: déplacer dans le rendu du calendrier papier.
  // try {
  //   const db = await database.attach(config.access.db);
  //   console.log("Connecté à la base de données.");
  //   evenementsPages = await pages(db, catsInProg);
  // } catch (e) {
  //   console.log(e);
  // }

  // On extrait un tableau contenant pour chaque cycle, le code de son répertoire et son nom ([["PROG99_CYCL460","Hugo Santiago"],...]).
  let o = _(progConfig.cycles)
    .map((d) => helpers.getFullCode.cycle(progConfig, d.idCycleProg))
    .value();

  // On crée un tableau avec les données MERGE_DEF des cycles du programme ([{data, info}]), en ajoutant à chacun la propriété `cycle` (titre du cycle).
  o = await queue.addAll(
    _(o).map((d) => {
      return async () =>
        new Promise(async (resolve) => {
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
                    "idEvenement",
                    "titreEvenement",
                    "typeEvenement",
                    "typeConference",
                    "titreEvenement",
                    "idFilm",
                    "titre",
                    "art",
                    "realisateurs",
                    "annee",
                    "duree",
                    "version",
                    "format",
                    "mention",
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
                idEvenement: v[0].idEvenement,
                // page: _(evenementsPages)
                //   .thru((g) => {
                //     let h = _(g).find(
                //       (g) => g.idevenement === v[0].idEvenement
                //     );
                //     return h ? h.numeroPage : null;
                //   })
                //   .value(),
                titreEvenement: v[0].titreEvenement,
                typeEvenement: v[0].typeEvenement,
                typeConference: v[0].typeConference,
                mention: v[0].mention,
                items: _(v)
                  .map((w) =>
                    _({})
                      .assign(
                        _.pick(w, [
                          "idFilm",
                          "idEvenement",
                          // "titreEvenement",
                          "typeConference",
                          "titre",
                          "art",
                          "realisateurs",
                          "annee",
                          "duree",
                          "version",
                          "format",
                          "ordre",
                        ]),
                        { isConf: v[0].typeEvenement === 14 }
                      )
                      .value()
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
    .value();

  // Réunit les séances film + conférence en une seule séance.
  // Réunit les séances identiques associées à plusieurs sous-cycles
  // Pour toutes les séances, la propriété `cycle` devient un tableau de tableaux : [[titreCycle1, titreSousCycle1], [titreCycle2, titreSousCycle2], ...].
  // Trie les séances.
  o = _(o)
    .groupBy((d) => d.idSeance)
    .map((d) =>
      _({})
        .assign(d[0], {
          idSeance: Number(d[0].idSeance),
          cycle: _(d)
            .map((d) => [d.cycle, d.titreSousCycle])
            .value(),
          items: _(d)
            .map((e) => e.items)
            .flatten()
            .uniqBy((e) => e.ordre)
            .orderBy((e) => e.ordre)
            .value(),
        })
        .omit("titreSousCycle")
        .value()
    )
    .sortBy((v) => [v.dateHeure, v.idSalle[0]])
    .value();

  // Filtrage des titres de cycles (à ajuster selon les besoins)
  // TODO: déplacer dans le rendu du calendrier papier.
  // o = _(o)
  //   .map((d) =>
  //     _({})
  //       .assign(d, {
  //         cycle: _(d.cycle)
  //           .map((e) => {
  //             if (e[0] === "Ciné-club de Frédéric Bonnaud") return [e[0]];
  //             if (e[0] === "Séances Jeune public")
  //               return ["Séance Jeune public", ""];
  //             if (e[0] === "Séances spéciales") return ["Séance spéciale", ""];
  //             if (e[0] === "Cinéma bis" || e[0] === "Aujourd'hui le cinéma")
  //               return e;
  //             return null; // Autres cass : on met cycle à null pour le retirer à l'étape suivante
  //           })
  //           .filter((e) => e !== null)
  //           .value(),
  //       })
  //       .value()
  //   )
  //   .value();

  // console.log(JSON.stringify(o, null, 2));

  // Formatage calendrier : regroupement par date.
  const rendered = _(o)
    .groupBy((d) => d.dateHeure.substring(0, 10))
    .mapValues((day) =>
      _(day)
        .map((seance) => {
          return {
            idSeance: seance.idSeance,
            dateHeure: seance.dateHeure, // On garde quand même ici `dateHeure`.
            // heure: seance.dateHeure.substring(11, 16),
            salle: seance.idSalle[0],
            cycle: seance.cycle,
            titreSousCycle: seance.titreSousCycle,
            titreEvenement: seance.titreEvenement,
            mention: seance.mention,
            // page: seance.page,
            items: _(seance.items)
              .map((d) => {
                return {
                  idFilm: d.idFilm || undefined,
                  idConf:
                    d.isConf && _.isUndefined(d.idFilm)
                      ? d.idEvenement
                      : undefined,
                  // idConf: d.isConf ? d.idEvenement : undefined,
                  titre: d.isConf
                    ? ((t) => {
                        // Pour les titres d'items de type Action culturelle, retirer l'éventuel préfixe "Film + ".
                        if (_(t).startsWith("Film + ")) {
                          return _.upperFirst(t.substring(7));
                        } else {
                          return t;
                        }
                      })(d.titre)
                    : d.titre,
                  // titre: d.titre,
                  art: d.art || undefined,
                  realisateurs: d.realisateurs,
                  typeConference: d.typeConference || undefined,
                  annee: d.annee || undefined, // Normalement, toujours présent.
                  duree: d.duree || undefined, // Normalement, toujours présent.
                  version: d.version || undefined,
                  format: d.format || undefined,
                  // isConf: d.isConf,
                };
              })
              .value(),
          };
        })
        // Calcul d'un hash avec la composition de la séance (succession des films/conférences).
        .map((seance) =>
          _({})
            .assign(seance, {
              hashEvenement: _(seance.items)
                .map((d) => (d.idFilm ? `f${d.idFilm}` : `c${d.idConf}`))
                .value()
                .join(""),
            })
            .value()
        )
        .value()
    )
    .value();

  // await helpers.writeFileInFolder(
  //   `${basePath}/${progDirectoryName}`,
  //   "",
  //   `${progDirectoryName}_CALENDAR.json`,
  //   JSON.stringify(rendered, null, 2),
  //   "utf8"
  // );

  // console.log(JSON.stringify(rendered, null, 2));

  //TEST
  await doCalendar.taggedTextInDesign(rendered, idProg);
  // await helpers.writeFileInFolder(
  //   `${basePath}/${progDirectoryName}`,
  //   "",
  //   `${progDirectoryName}_CALENDAR.txt`,
  //   doCalendar.taggedTextInDesign(rendered),
  //   "latin1"
  // );

  process.exit(0);
})();
