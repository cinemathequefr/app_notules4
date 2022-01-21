const _ = require("lodash");
const execQuery = require("../exec_query");
const helpers = require("../helpers");
const queries = require("../queries");

/**
 * @param { Object } db Instance de base de données
 * @param {Array} idCats Tableau d'id de catégories
 * @return {Object}
 */
module.exports = async function (db, idCats) {
  let pages = await execQuery.single(db, queries.pagesFromCats, [idCats]);

  pages = _(pages)
    .map((d) => helpers.keysToCamel(d))
    .value();

  return pages;
};
