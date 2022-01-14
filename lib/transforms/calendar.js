const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");

moment.locale("fr", require("../../config/main.js").momentLocale.fr);

const temp = _.template(
  `
  <% _.forOwn(data, (dayProg, day) => { %>
    <%= moment(day).format("dd D MMM") %>
    [CRLF]
    <% _.forEach(dayProg, seance => { %>
      <%= seance.salle %>\t<%= seance.heure %>\t<%= seance.cycle %> : <%= seance.titreSousCycle %>
      <% _.forEach(seance.items, item => { %>
        [CRLF]\t\t<%= format.artTitre(item.art, item.titre) %>
        [CRLF]\t\t<%= item.realisateurs %> (<%= item.duree %>', <%= item.version %>)
      <% }) %>
      [CRLF]
    <% }) %>
    [CRLF][CRLF]
  <% }) %>
  `
    .replace(/\n\s*/g, "")
    .replace(/\[CRLF\]/g, "\n")
);
// const temp = _.template(`<%= _.forEach(data, d => d.date); %>`);

/**
 * calendar
 * @description
 * Transforme les données calendar d'un cycle en document Calendar
 * @param {Array} data Données calendar
 * @returns {String} Rendu
 */
function calendar(data) {
  let o = temp({
    data: data,
    format: format,
    moment: moment,
    ba: format.beforeAfterStr, // Raccourci
  });
  console.log("Voilà:");
  return o;
}

module.exports = calendar;
