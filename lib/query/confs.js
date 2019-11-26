const _ = require("lodash");
const execQuery = require("../exec_query");
const config = require("../config");
const queries = require("../queries");
const helpers = require("../helpers");
const format = require("../format");
const turndownService = new require("turndown")(config.turndown);

async function getConfsFromCats(db, idCats, idProg) {
  let confs = await execQuery.single(db, queries.confsFromCats, [
    idCats,
    idProg
  ]);

  confs = _(confs)
    .map(d => helpers.keysToCamel(d))
    .map(d =>
      _({})
      .assign(d, {
        titre: format.cudm(d.titre)
      })
      .value()
    )
    .groupBy("idEvenement")
    .mapValues(d => d[0])
    .value();
  return confs;
}

async function getConfsTextesFromCats(db, idCats, idProg) {
  let confsTextes = await execQuery.single(db, queries.confsTextesFromCats, [
    idCats,
    idProg
  ]);

  confsTextes = _(confsTextes)
    .map(d => helpers.keysToCamel(d))
    .filter(d => _.kebabCase(d.texte) !== "") // Retire les textes sans contenu réel
    .groupBy("idEvenement")
    .mapValues(d => {
      return {
        textes: _(d)
          .map(f => {
            return {
              typeTexte: f.typeTexte,
              texte: format.stripNewLines(
                // Retire les sauts de ligne à l'intérieur d'un texte
                turndownService.turndown(format.cudm(f.texte))
              )
            };
          })
          .value()
      };
    })
    .value();

  return confsTextes;
}

async function getConfsPersonsFromCats(db, idCats, idProg) {
  let confsPersons = await execQuery.single(db, queries.confsPersonsFromCats, [
    idCats,
    idProg
  ]);

  confsPersons = _(confsPersons)
    .map(d => helpers.keysToCamel(d))
    .groupBy("idEvenement")
    .mapValues(d => {
      return {
        intervenants: _(d)
          .filter(f => f.idFonction !== 38) // On ignore les "intervenants" dont le rôle est "sujet".
          .map(f => {
            return {
              nomComplet: format.formatName(f.prenom, f.particule, f.nom),
              idFonction: f.idFonction,
              fonction: f.fonction,
              ordre: f.ordre
            };
          })
          .sortBy([
            f => _.indexOf([140, 141, 139, 142, 39, 143, 40], f.idFonction), // Tri selon l'importance de la fonction
            "ordre"
          ])
          .value()
      };
    })
    .value();

  return confsPersons;
}

module.exports = async function (db, cycleConfig) {
  let idCats = helpers.getIdCats(cycleConfig);
  let idProg = cycleConfig.idProg;

  try {
    var confs = await getConfsFromCats(db, idCats, idProg);
    var confsTextes = await getConfsTextesFromCats(db, idCats, idProg);
    var confsPersons = await getConfsPersonsFromCats(db, idCats, idProg);
  } catch (e) {
    console.error(e);
  }

  let confsMerge = _.merge(confs, confsTextes, confsPersons);
  confsMerge = _(confsMerge).map().value();

  // Traitements finaux
  confsMerge = _(confsMerge)
    .map(d => {
      if (d.idTypeConference === 55) { // Conférence

        let intervenants = _(d.intervenants)
          .filter(e => e.idFonction === 139) // On ne garde que les intervenants ayant fonction de conférencier
          .map(e => e.nomComplet)
          .value();

        if (intervenants.length === 0) console.log(`Attention : L'évenement (conférence) ${ d.idEvenement } n'a pas d'intervenants.`);

        intervenants = format.joinLast(
          ", ",
          " et ",
          intervenants
        );

        return _({})
          .assign(d, {
            sousTitre: `${d.typeConference} ${format.de(
            intervenants
          )}${intervenants}`
          })
          .value();
      } else {
        return d;
      }
    })
    // Mention d'animation
    .map(d => {
      let intervenants = _(d.intervenants)
        .filter(e => e.idFonction === 40)
        .map(e => e.nomComplet)
        .value();
      if (intervenants.length > 0) {
        return _({}).assign(d, {
          mentionAnimation: `Rencontre animée par ${format.joinLast(", ", " et ", intervenants)}`
        }).value();
      }
      return d;
    })
    .value();

  // console.log(JSON.stringify(confsMerge, null, 2));

  return confsMerge;
};