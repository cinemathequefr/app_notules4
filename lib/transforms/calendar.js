const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");
const replaceAnsiByEntities = require("../../lib/replace_ansi_by_entities.js");
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
      .replace(/\[CRLF\]/g, "\r\n")
  );
  let output = temp({
    data,
    format,
    moment,
    ba,
  });

  output = replaceAnsiByEntities(output);
  return output;
}

{
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
<ANSI-WIN>[CRLF]
<vsn:8><fset:InDesign-Roman><dcs:CYCLEBLEU=<Nextstyle:CYCLEBLEU>><dcs:CYCLEROUGE=<Nextstyle:CYCLEROUGE>><dcs:SALLE=<Nextstyle:SALLE>><dcs:HEURE=<Nextstyle:HEURE>><dcs:EVENEMENT=<Nextstyle:EVENEMENT>><dps:DATE=<Nextstyle:DATE>><dcs:FILM=<Nextstyle:FILM>><dcs:DETAIL=<Nextstyle:DETAIL>><dcs:FOLIO=<Nextstyle:FOLIO>><dcs:INFOS=<Nextstyle:INFOS>><dcs:VOST=<Nextstyle:VOST>>[CRLF]
<% _.forOwn(data, (dayProg, day) => { %>
  <pstyle:DATE><%= moment(day).format("dd D MMM") %>
  [CRLF]
  <% _.forEach(dayProg, seance => { %>
    <pstyle:><cstyle:SALLE><%= salle(seance.salle) %><cstyle:>[TAB]<cstyle:HEURE><%= seance.heure.replace(":", "h") %><cstyle:>[TAB]
    <% _.forEach(seance.cycle, (cycle, i) => { %>
      <% if (i > 0) { %>[TAB][TAB]<% } %>
      <cstyle:sections><%= cycle[0] %><%= ba(" : ", "", cycle[1]) %><cstyle:>
      [CRLF]
    <% }) %>
    <% _.forEach(seance.items, (item, i) => { %>
      <% if (i > 0  || (i === 0 && seance.cycle.length > 0)) { %>[TAB][TAB]<% } %>
      <% if (item.isConf) { %><cstyle:EVENEMENT><% } else { %><cstyle:FILM><% } %>
      <% if (i > 0) { %>+[SPACE]<% } %>
      <%= format.artTitre(item.art, item.titre) %>
      <cstyle:>
      <% if (item.realisateurs || item.duree || item.version) { %>
        [CRLF]
        [TAB][TAB]
        <cstyle:DETAIL><%= ba("", " ", item.realisateurs) %><cstyle:>
        <% if (item.duree || item.version) { %>
          <cstyle:VOST>(<%= item.duree %>'<%= ba(", ", "", item.version) %>)<cstyle:>
        <% } %>
      <% } %>
      [SPACE]<cstyle:FOLIO>[p.<0x2009><%= seance.page ? seance.page : "xx" %>]<cstyle:>[CRLF]
    <% }) %>
    <% if (seance.mention) { %>
      [TAB][TAB]<cstyle:INFOS><%= seance.mention %><cstyle:>
      [CRLF]
    <% } %>
  <% }) %>
  [CRLF]
<% }) %>
`
      .replace(/\n\s*/g, "")
      .replace(/\[SPACE\]/g, " ")
      .replace(/\[TAB\]/g, "\t")
      .replace(/\[CRLF\]/g, "\r\n")
  );

  let output = temp({
    data,
    salle,
    format,
    moment,
    ba,
  });

  output = format.nbsp(output);
  output = output.replace(/&nbsp;/g, "<0x00A0>"); // Espace insécable
  output = output.replace(/'/g, "<0x2019>");
  output = replaceAnsiByEntities(output);
  // console.log(output);

  return output;
}

/**
 * salle
 * Mappe le code de salle en code utilisé dans la maquette du programme.
 * @param {string} s
 */
function salle(s) {
  let i = _.indexOf(["HL", "GF", "JE"], s);
  return i > -1 ? ["A", "B", "C"][i] : "";
}

module.exports = { rawText, taggedTextInDesign };
