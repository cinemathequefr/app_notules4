const _ = require("lodash");
const execQuery = require("../exec_query");
const helpers = require("../helpers");
const queries = require("../queries");

module.exports = async function(db, cycleConfig) {
  let cats = await execQuery.single(db, queries.catsFromCycle, [
    cycleConfig.idCycleProg
  ]);

  cats = _(cats)
    .map(d => helpers.keysToCamel(d))
    .value();

  return cats;
};
