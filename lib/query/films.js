const _ = require("lodash");
const moment = require("moment");
const execQuery = require("../exec_query");
const config = require("../config");
const queries = require("../queries");
const helpers = require("../helpers");
const format = require("../format");
const turndownService = new require("turndown")(config.turndown);

async function getFilmsFromCats(db, idCats, idProg) {
  let films = await execQuery.single(db, queries.filmsFromCats, [idCats, idProg]);
  films = _(films)
    .map(d => helpers.keysToCamel(d))
    .map(d => _({}).assign(
      format.normalizeTitle(
        format.cudm(d.titreVo),
        format.cudm(d.artVo),
        format.cudm(d.titreFr),
        format.cudm(d.artFr),
        format.cudm(d.titreFrMod),
        format.cudm(d.artFrMod)
      ),
      // {
      //   annee: parseInt(moment(d.dateSortie).format("YYYY"), 10) ||
      //     d.anneeSortie ||
      //     d.annee
      // },
      _(d).omit(["titreVo", "artVo", "titreFr", "artFr", "titreFrMod", "artFrMod"]).value()
      // _(d).omit(["titreVo", "artVo", "titreFr", "artFr", "titreFrMod", "artFrMod", "annee", "anneeSortie", "dateSortie"]).value()
    ).value())
    .groupBy("idFilm")
    .mapValues(d => d[0])
    .mapValues(d =>
      _(d)
      .assign({
        pays: format.expandCountries(d.pays).join("-")
      })
      .value()
    )
    .value();
  return films;
}


// BUG (mineur) : (cf. journal 9 octobre 2019, Godard) : la requête SQL sous-jacente peut trouver des textes
// qui ne seront dans les faits rattachés à aucun film obtenu par la requête principale : au moment de la fusion
// des résultats de requêtes, ces textes se retrouvent placés dans la collection des films et comptabilisés comme tels.
async function getFilmsTextesFromCats(db, idCats, idProg) {
  let filmsTextes = await execQuery.single(db, queries.filmsTextesFromCats, [idCats, idProg]);
  filmsTextes = _(filmsTextes)
    .map(d => helpers.keysToCamel(d))
    .filter(d => _.kebabCase(d.texte) !== "") // Retire les textes sans contenu réel
    .groupBy("idFilm")
    .mapValues(d => {
      return {
        textes: _(d).map(f => {
          return {
            typeTexte: f.typeTexte,
            texte: format.stripNewLines( // Retire les sauts de ligne à l'intérieur d'un texte
              turndownService.turndown(
                format.cudm(f.texte)
              )
            )
          };
        }).value()
      };
    })
    .value();
  return filmsTextes;
}

async function getFilmsGeneriquesFromCats(db, idCats, idProg) {
  let filmsGeneriques = await execQuery.single(db, queries.filmsGeneriquesFromCats, [idCats, idProg]);
  filmsGeneriques = _(filmsGeneriques)
    .map(d => helpers.keysToCamel(d))
    // .filter(d => d.fonction === 32) // Filtrage pour conserver uniquement la fonction interpète (désactiver pour la requête modifiée)
    .orderBy(d => d.ordre)
    .groupBy(d => d.idFilm)
    .mapValues(d => {
      return {
        generique: _(d)
          .take(4)
          .map(f => format.formatName(f.prenom, f.particule, f.nom))
          .value()
      };
    })
    .value();

  return filmsGeneriques;
}

async function getFilmsAdaptationsFromCats(db, idCats, idProg) {
  let filmsAdaptations = await execQuery.single(db, queries.filmsAdaptationsFromCats, [idCats, idProg]);

  filmsAdaptations = _(filmsAdaptations)
    .map(d => helpers.keysToCamel(d))
    .groupBy("idFilm")
    .mapValues(d => {
      return {
        adaptation: format
          .beforeAfterStr(
            "",
            ".",
            _(d)
            .groupBy("mention")
            .map(c => {
              let auteurs = format.joinLast(" , ", " et ", _(c).map(b => format.formatName(b.prenom, b.particule, b.nom)).value());
              return _.upperFirst(c[0].mention) + " " + format.de(auteurs) + auteurs;
            })
            .value()
            .join(`.  \n`)
          )
          .replace(/\"([^\"]+)\"/gi, "_$1_") // Remplace les guillemets des titres par l'italique markdown `_`
      };
    })
    .value();

  return filmsAdaptations;
}

module.exports = async function (db, cycleConfig) {
  let idCats = helpers.getIdCats(cycleConfig);
  let idProg = cycleConfig.idProg;

  try {
    var films = await getFilmsFromCats(db, idCats, idProg);
    var filmsTextes = await getFilmsTextesFromCats(db, idCats, idProg);
    var filmsGeneriques = await getFilmsGeneriquesFromCats(db, idCats, idProg);
    var filmsAdaptations = await getFilmsAdaptationsFromCats(db, idCats, idProg);
  } catch (e) {
    console.error(e);
  }

  let filmsMerged = _.merge(films, filmsTextes, filmsGeneriques, filmsAdaptations);

  filmsMerged = _(filmsMerged).map().orderBy(d => _.kebabCase(d.titre)).value();
  return filmsMerged;
};