/**
 * Ce module exporte une fonction asynchrone servant à obtenir un objet (sérialisable en document JSON) des données de séances d'un cycle.
 * Cette fonction reçoit 2 arguments : une instance de la base de données et un objet de configuration du cycle.
 * L'objet de configuration du cycle est de la forme : { idProg: 55, idCycleProg: 413, titreCycle: "Michel Deville", sousCycles: [{ titre: "Les films", cats: [1844], tri: 1 }]}.
 * Il liste en particulier les idCategorie qui servent de critère de requête sur la base.
 * L'objet de retour est obtenu par la fusion de 3 opérations successives de requête sur la base + transformation lodash :
 * - Obtention des données "générales de séance" (identifiants divers, date/heure, salle, items de la séance)
 * - Obtention des données de mention de la séance ("séance présentée par"), mises en forme.
 * - Obtention des données de copies des films de la séance (format, version, durée).
 */
const _ = require("lodash");
const moment = require("moment");
const execQuery = require("../exec_query");
const config = require("../config");
const queries = require("../queries");
const helpers = require("../helpers");
const format = require("../format");

/**
 * getSeancesFromCats
 * @description
 * A partir d'une liste d'id de catégories, renvoie la collection des séances (validées) (idSeance, puis idFilm comme clés de regroupement)
 * N'inclut pas d'informations de copie.
 * @param {Object} db Instance de base de données
 * @param {Array} idCats Tableau d'id de catégories
 * @param {Integer} idProg Id de programme
 * @return {Object}
 */
async function getSeancesFromCats(db, idCats, idProg) {
  let seancesFilms = await execQuery.single(db, queries.seancesFilmsFromCats, [idCats, idProg]);
  let seancesConfs = await execQuery.single(db, queries.seancesConfsFromCats, [idCats, idProg]);
  let seances = _.concat(seancesFilms, seancesConfs);

  seances = _(seances)
    .map(d => helpers.keysToCamel(d))
    .groupBy(d => d.idSeance)
    .value();

  // On transforme chaque séance pour passer d'une structure à plat à une structure hiérarchisée (une séance = un objet avec en-tête et liste d'items)

  // NOTE: inexplicablement, les données générées par cette version (prenant en compte les séances confs) ne peuvent par être correctement fusionnées (_.merge) avec les infos de copies correspondantes.
  // (Le détail des copies est ignoré). Voir journal du 26/06/19. J'en reste pour l'instant à la version précédente, qui n'inscrit pas les items de séances confs.

  // seances = _(seances)
  //   .mapValues(d => {
  //     return _(d[0])
  //       .pick([
  //         "idCategorie",
  //         "typeEvenement",
  //         "idEvenement",
  //         "idSeance",
  //         "dateHeure",
  //         "idSalle",
  //         "typeSeance",
  //         "titreEvenement",
  //         "idSeanceAssoc",
  //         "typeAssoc"
  //       ])
  //       .assign({
  //         items: _(d).thru(d => {
  //           if (d[0].typeEvenement === 14) {
  //             return _.fromPairs([
  //               [
  //                 `_${d[0].idEvenement}`,
  //                 {
  //                   idConf: d[0].idEvenement,
  //                   ordre: 1
  //                 }
  //               ]
  //             ]);
  //           } else {
  //             return _(d)
  //               .map(e =>
  //                 _(e)
  //                 .pick(["idFilm", "ordre"])
  //                 .value()
  //               )
  //               .sortBy("ordre")
  //               .groupBy("idFilm")
  //               .mapValues(e => e[0])
  //               .value();
  //           }
  //         })
  //       }, {
  //         dateHeure: moment(d[0].dateHeure).format("YYYY-MM-DD[T]HH:mm:ss"),
  //         idSalle: config.dict.salles[d[0].idSalle]
  //       })
  //       .value();
  //   })
  //   .value();

  // NOTE: ancienne version (ne prend pas en compte les séances confs) avec laquelle la fusion des infos de copies fonctionne.
  // On conserve a priori cette version, et on ne cherche pas à inscrire à ce stade de détails sur l'item conf (voir journal 27/06/19)
  seances = _(seances)
    .mapValues(d => {
      return _({})
        .assign(
          _(d[0])
          .pick([
            "idCategorie",
            "typeEvenement",
            "idEvenement",
            "idSeance",
            "dateHeure",
            "idSalle",
            "typeSeance",
            // "titreEvenement",
            "idSeanceAssoc",
            "typeAssoc"
          ])
          .value(), {
            items: _(d)
              .map(e =>
                _(e)
                .pick(["idFilm", "ordre"])
                .value()
              )
              .sortBy("ordre")
              .groupBy("idFilm")
              .mapValues(e => e[0])
              .value(),
            dateHeure: moment(d[0].dateHeure).format("YYYY-MM-DD[T]HH:mm:ss"),
            idSalle: config.dict.salles[d[0].idSalle]
          }
        )
        .value();
    })
    .value();

  return seances;
}

/**
 * getSeancesMentionsFromCats
 * @description
 * A partir d'une liste d'id de catégories, renvoie la collection des mentions de séances mises en forme (idSeance comme clé de regroupement)
 * @param {Object} db Instance de base de données
 * @param {Array} idCats Tableau d'id de catégories
 * @param {Integer} idProg Id de programme
 * @return {Object}
 */
async function getSeancesMentionsFromCats(db, idCats, idProg) {
  let seancesMentions = await execQuery.single(db, queries.seancesMentionsFromCats, [idCats, idProg]);
  return _(seancesMentions)
    .map(d => helpers.keysToCamel(d))
    .groupBy("idSeance")
    .mapValues(d =>
      _(d)
      .groupBy("mentionSeance")
      .mapValues(c =>
        _(c)
        .orderBy("ordre")
        .map(b => format.formatName(b.prenom, b.particule, b.nom) + (_.kebabCase(b.note) === "sous-reserve" ? " (sous réserve)" : ""))
        .value()
      )
      .mapValues(c => format.joinLast(", ", " et ", c))
      .map((v, k) => (config.dict.mentionSeance[k] || "") + v)
      .value()
    )
    .mapValues(c => c.join(". "))
    .mapValues(c => ({
      mention: c
    }))
    .value();
}

/**
 * getSeancesCopiesFromCats
 * @description
 * A partir d'une liste d'id de catégories, renvoie la collection des informations de copie (validées) (idSeance, puis idFilm comme clés de regroupement)
 * @param {Object} db Instance de base de données
 * @param {Array} idCats Tableau d'id de catégories
 * @param {Integer} idProg Id de programme
 * @return {Object}
 */
async function getSeancesCopiesFromCats(db, idCats, idProg) {
  let seancesCopies = await execQuery.single(db, queries.seancesCopiesFromCats, [idCats, idProg]);

  return _(seancesCopies)
    .map(d => helpers.keysToCamel(d))
    .groupBy("idSeance")
    .mapValues(d =>
      _(d)
      .groupBy("idFilm")
      .mapValues(e =>
        _(e)
        .thru(f => {
          return (
            _.find(f, g => g.valide === 1) ||
            _.find(f, g => g.stDemande === 1) ||
            f[0]
          );
        })
        .value()
      )
      .mapValues(e =>
        _(e)
        .assign({
          sousTitres: e.stDemande === 1 && !e.intertitres ? 23 : e.sousTitres, // Sous-titres demandés équivaut à STF
          intertitres: e.stDemande === 1 && e.intertitres ? 25 : e.intertitres // Avec intertitres : sous-titres demandés équivaut à INT. FR.
        })
        .value()
      )
      .mapValues(e =>
        _(e)
        .assign({
          version: (config.dict.version[e.version] || "") +
            (config.dict.sousTitres[e.sousTitres] || "") ||
            (config.dict.intertitres[e.intertitres] || ""),
          format: config.dict.format[e.format] || ""
        })
        .omit(["sousTitres", "intertitres", "stDemande"])
        .value()
      )
      .value()
    )
    .mapValues(e => {
      return {
        items: e
      };
    })
    .value();
}

/**
 * @param {Object} db Instance de base de données
 * @param {Object} cycleConfig Objet de configuration du cycle, de la forme : { idProg: 55, idCycleProg: 413, titreCycle: "Michel Deville", sousCycles: [{ titre: "Les films", cats: [1844], tri: 1 }]}.
 * @returns {Object} Objet (séralisable en JSON) de données de cycle
 */
module.exports = async function (db, cycleConfig) {
  let idProg = cycleConfig.idProg;
  let idCats = helpers.getIdCats(cycleConfig);

  try {
    var seances = await getSeancesFromCats(db, idCats, idProg);
    var seancesMentions = await getSeancesMentionsFromCats(db, idCats, idProg);
    var seancesCopies = await getSeancesCopiesFromCats(db, idCats, idProg);
  } catch (e) {
    console.error(e);
  }

  // 2019-10-07 : Ajoute les titres d'évenements spécifiés dans la configuration du cycle
  let titreEvenements = _(cycleConfig).get("titreEvenements");
  seances = _(seances).mapValues((v, k) => {
    let t = _(titreEvenements).get(v.idEvenement);
    return t ? _(v).assign({
      titreEvenement: t
    }).value() : v;
  }).value();

  let seancesMerged = _.merge(seances, seancesMentions, seancesCopies);

  // Transforme des objets en tableaux : retire idSeances en clé de séance, et idFilm en clé d'item de séance + tri final
  seancesMerged = _(seancesMerged).map(d => _(d).mapValues((v, k) => {
      return k === "items" ? _(v).map().orderBy("ordre").value() : v;
    }).value())
    .orderBy("dateHeure")
    .value();

  // Rapproche les séances associées, effectue une numérotation commune des items, leur donne la même idSeance, date/heure, salle.
  seancesMerged = _(seancesMerged)
    .thru(data => {
      let ignore = [];
      return _(data).reduce((acc, i) => {

        if (!i.idSeanceAssoc || i.typeAssoc === 117) { // Essai : ignorer aussi les associations de type séances consécutives
          return _.concat(acc, i);
        } else if (_.indexOf(ignore, i.idSeance) > -1) {
          return acc;
        } else {
          let temp = _(i)
            .concat(_.find(data, d => d.idSeance === i.idSeanceAssoc) || [])
            .sortBy(d => d.dateHeure)
            .value();
          ignore.push(i.idSeanceAssoc);
          temp = _(temp)
            .map(d =>
              _({})
              .assign(d, {
                idSeance: temp[0].idSeance,
                dateHeure: temp[0].dateHeure,
                idSalle: temp[0].idSalle
              })
              .omit("idSeanceAssoc")
              .value()
            )
            .thru(d => {
              let p = 0;
              return _(d)
                .map(e =>
                  _({})
                  .assign(e, {
                    items: _(e.items)
                      .map(f =>
                        _({})
                        .assign(f, {
                          ordre: ++p
                        })
                        .value()
                      )
                      .value()
                  })
                  .value()
                )
                .value();
            })
            .value();
          return _.concat(acc, temp);
        }
      }, []);
    })
    .value();

  // Traitement supplémentaire pour intégrer une mention de type typeSeance ("Avant-première", "Ouverture...") à `mention`
  seancesMerged = _(seancesMerged).map(d => {
      if (d.mention || d.typeSeance) {
        d = _(d).assign({
            mention: format.joinLast(". ", null, [config.dict.typeSeance[d.typeSeance], d.mention])
          })
          .value();
      }
      return _(d).pickBy(_.identity).value();
    })
    .value();

  return seancesMerged;
};