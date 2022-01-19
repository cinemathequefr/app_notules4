const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");
const ba = format.beforeAfterStr;

moment.locale("fr", require("../../config/main.js").momentLocale.fr);

/**
 * rawText
 * @description
 * Transforme les données calendar d'un cycle en document texte brut (.txt)
 * @param {Array} data Données calendar
 * @returns {String} Rendu
 */
function rawText(data) {
  let temp = _.template(
    `
<% _.forOwn(data, (dayProg, day) => { %>
  <%= moment(day).format("dd D MMM") %>
  [CRLF]
  <% _.forEach(dayProg, seance => { %>
    <%= seance.salle %>[TAB]<%= seance.heure %>[TAB]
    <% _.forEach(seance.cycle, (cycle, i) => { %>
      <% if (i > 0) { %>[TAB][TAB]<% } %>
      <%= cycle[0] %><%= ba(" : ", "", cycle[1]) %>
      [CRLF]
    <% }) %>
    <% _.forEach(seance.items, (item, i) => { %>
      <% if (i > 0  || (i === 0 && seance.cycle.length > 0)) { %>[TAB][TAB]<% } %>
      <%= format.artTitre(item.art, item.titre) %>
      <% if (item.realisateurs || item.duree || item.version) { %>
        [CRLF]
        [TAB][TAB]
        <%= ba("", " ", item.realisateurs) %>
        <% if (item.duree || item.version) { %>
          (<%= item.duree %>'<%= ba(", ", "", item.version) %>)
        <% } %>
      <% } %>
      [SPACE][p.<0x2009>xx][CRLF]
    <% }) %>
    <% if (seance.mention) { %>
      [TAB][TAB]<%= seance.mention %>
      [CRLF]
    <% } %>
  <% }) %>
  [CRLF]
<% }) %>
`
      .replace(/\n\s*/g, "")
      .replace(/\[SPACE\]/g, " ")
      .replace(/\[TAB\]/g, "\t")
      .replace(/\[CRLF\]/g, "\n")
  );
  let output = temp({
    data,
    format,
    moment,
    ba,
  });
  return output;
}

/**
 * taggedTextInDesign
 * @description
 * Transforme les données calendar d'un cycle en document tagged text InDesign (.txt)
 * @param {Array} data Données calendar
 * @returns {String} Rendu
 */
function taggedTextInDesign(data) {
  let temp = _.template(
    `
<% _.forOwn(data, (dayProg, day) => { %>
  <%= moment(day).format("dd D MMM") %>
  [CRLF]
  <% _.forEach(dayProg, seance => { %>
    <%= seance.salle %>[TAB]<%= seance.heure %>[TAB]
    <% _.forEach(seance.cycle, (cycle, i) => { %>
      <% if (i > 0) { %>[TAB][TAB]<% } %>
      <%= cycle[0] %><%= ba(" : ", "", cycle[1]) %>
      [CRLF]
    <% }) %>
    <% _.forEach(seance.items, (item, i) => { %>
      <% if (i > 0  || (i === 0 && seance.cycle.length > 0)) { %>[TAB][TAB]<% } %>
      <%= format.artTitre(item.art, item.titre) %>
      <% if (item.realisateurs || item.duree || item.version) { %>
        [CRLF]
        [TAB][TAB]
        <%= ba("", " ", item.realisateurs) %>
        <% if (item.duree || item.version) { %>
          (<%= item.duree %>'<%= ba(", ", "", item.version) %>)
        <% } %>
      <% } %>
      [SPACE][p.xx][CRLF]
    <% }) %>
    <% if (seance.mention) { %>
      [TAB][TAB]<%= seance.mention %>
      [CRLF]
    <% } %>
  <% }) %>
  [CRLF]
<% }) %>
`
      .replace(/\n\s*/g, "")
      .replace(/\[SPACE\]/g, " ")
      .replace(/\[TAB\]/g, "\t")
      .replace(/\[CRLF\]/g, "\n")
  );
  let output = temp({
    data,
    format,
    moment,
    ba,
  });

  console.log(output);

  return output;
}

module.exports = { rawText, taggedTextInDesign };
