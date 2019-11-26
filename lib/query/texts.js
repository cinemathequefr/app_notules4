const _ = require("lodash");
const moment = require("moment");
const execQuery = require("../exec_query");
const config = require("../config");
const queries = require("../queries");
const helpers = require("../helpers");
const format = require("../format");
const turndownService = new require("turndown")(config.turndown);

/**
 * getTextsFromCats
 * Obtient les textes associés à des idCategorie
 */
async function getTextsFromCats(db, idCats, idProg) {
  let textsCats = await execQuery.single(db, queries.textsFromCats, [idCats, idProg]);

  textsCats = _(textsCats)
    .map(d => helpers.keysToCamel(d))
    .filter(d => _.kebabCase(d.texte) !== "") // Retire les textes sans contenu réel
    .groupBy("idCategorie")
    .mapValues(d => {
      return _(d).map(f => {
        return {
          typeTexte: f.typeTexte,
          texte: format.stripNewLines( // Retire les sauts de ligne à l'intérieur d'un texte
            turndownService.turndown(
              format.cudm(f.texte)
            )
          )
        }
      }).value()
    }).value();
  return textsCats;
}

/**
 * getTextsFromCycle
 * Obtient les textes associés à un idCycle
 */
async function getTextsFromCycle(db, idCycle, idProg) {
  let textsCycle = await execQuery.single(db, queries.textsFromCycle, [idCycle, idProg]);
  textsCycle = _(textsCycle)
    .map(d => helpers.keysToCamel(d))
    .filter(d => _.kebabCase(d.texte) !== "") // Retire les textes sans contenu réel
    .groupBy("idCycle")
    .mapValues(d => {
      return _(d).map(f => {
        return {
          typeTexte: f.typeTexte,
          texte: format.stripNewLines( // Retire les sauts de ligne à l'intérieur d'un texte
            turndownService.turndown(
              format.cudm(f.texte)
            )
          )
        }
      }).value()
    })
    .value();
  return textsCycle;
}


module.exports = async function (db, cycleConfig) {
  let idCats = helpers.getIdCats(cycleConfig);
  let idCycle = cycleConfig.idCycleProg;
  let idProg = cycleConfig.idProg;
  let texts = null;

  try {
    texts = {
      cycle: await getTextsFromCycle(db, idCycle, idProg),
      cats: await getTextsFromCats(db, idCats, idProg)
    };

  } catch (e) {
    console.error(e);
  }

  return texts;
};