/**
 * Dates
 * Renvoie dates de début et de fin réelles de tous les cycles d'un programme
 */
const _ = require("lodash");
const helpers = require("./lib/helpers.js");
const config = require("./lib/config.js");
const moment = require("moment");

moment.locale("fr", require("./lib/config.js").momentLocale.fr);

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme>."
  );
}

(async function () {
  let progConfig = await helpers.fetchProgConfig(idProg);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme

  let cycles = _(progConfig)
    .thru(d =>
      _(d.cycles)
      .map(e => e.idCycleProg)
      .value()
    )
    .value();


  let dates = _(cycles).map(async c => {
      let cycleFullCode = helpers.getFullCode.cycle(progConfig, c);
      try {
        seances = await helpers.readFileAsJson(`${config.pathData.local}${progDirectoryName}/${cycleFullCode[0]}_SEANCES ${cycleFullCode[1]}.json`);
        let dates = _(seances)
          .orderBy(d => d.dateHeure)
          .thru(d => [cycleFullCode[1], _.first(d).dateHeure, _.last(d).dateHeure])
          .value();
        return (dates);
      } catch (e) {
        return ([cycleFullCode[1], null]);
      }
    })
    .value();

  dates = await Promise.all(dates);
  dates = _(dates)
    .filter(d => !!d[1]) // Elimine les cycles sans données
    .sortBy(d => d[1])
    .value();


  console.log(_.template("<% _.forEach(dates, d => { %>- <%= d[0] %> : <%= moment(d[1]).format('ddd D MMM') %> - <%= moment(d[2]).format('ddd D MMM') %>\n<% }) %>")({
    dates: dates,
    moment: moment

  }));

})();