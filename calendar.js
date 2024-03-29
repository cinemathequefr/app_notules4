/**
 * calendar
 * Génère le calendrier des séances du programme à partir des fichiers _MERGE_DEF.json de chaque cycle.
 */
const _ = require("lodash");
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

  const progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme

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

  const seances = _(o)
    .map((seance) => {
      return {
        idSeance: seance.idSeance,
        idEvenement: seance.idEvenement, // On garde `idEvenement` car il est nécessaire dans le rendu taggedTextInDesign pour le foliotage.
        dateHeure: seance.dateHeure, // Bien que le regroupement soit fait sur la date, on garde ici la valeur dateHeure complète.
        salle: seance.idSalle[0],
        cycle: seance.cycle,
        titreSousCycle: seance.titreSousCycle,
        titreEvenement: seance.titreEvenement,
        mention: seance.mention,
        items: _(seance.items)
          .map((d) => {
            return {
              idFilm: d.idFilm || undefined,
              idConf:
                d.isConf && _.isUndefined(d.idFilm) ? d.idEvenement : undefined,
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
              art: d.art || undefined,
              realisateurs: d.realisateurs,
              typeConference: d.typeConference || undefined,
              annee: d.annee || undefined, // Normalement, toujours présent.
              duree: d.duree || undefined, // Normalement, toujours présent.
              version: d.version || undefined,
              format: d.format || undefined,
            };
          })
          .value(),
      };
    })
    // Calcul d'un hash avec la composition de la séance (succession des films/conférences).
    // Ce `hashEvenement` est plus fiable que `idEvenement` puisqu'il décrit précisément la composition de la séance.
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
    .value();

  // NE PAS UTILISER. GENERER CE FICHIER AVEC app_notules4_2.
  // Ecriture du calendrier JSON.
  // await helpers.writeFileInFolder(
  //   `${basePath}/${progDirectoryName}`,
  //   "",
  //   `${progDirectoryName}_SEANCES.json`,
  //   JSON.stringify(seances, null, 2),
  //   "utf8"
  // );

  // Ecriture du calendrier Tagged
  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    "",
    `${progDirectoryName}_CALENDAR.txt`,
    await doCalendar.taggedTextInDesign(seances, idProg),
    "latin1"
  );

  process.exit(0);
})();
