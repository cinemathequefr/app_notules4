const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");
const helpers = require("../helpers.js");
const database = require("../database");

const replaceAnsiByEntities = require("../replace_ansi_by_entities.js");
// const replaceAnsiByEntities = require("../../lib/replace_ansi_by_entities.js");
const ba = format.beforeAfterStr;

const config = {
  access: require("../../config/access.js"),
};

moment.locale("fr", require("../../config/main.js").momentLocale.fr);

/**
 * taggedTextInDesign
 * @description
 * Transforme les données calendar d'un cycle en document tagged text InDesign (.txt)
 * @param {Array} calendarData Données calendar
 * @param {integer} idProg Identifiant du programme correspondant au calendrier (ATTENTION : doit être cohérent.)
 * @returns {String} Rendu
 */
async function taggedTextInDesign(calendarData, idProg) {
  let temp = _.template(
    `
<ANSI-WIN>[CRLF]
<vsn:8><fset:InDesign-Roman><dcs:CYCLEBLEU=<Nextstyle:CYCLEBLEU>><dcs:CYCLEROUGE=<Nextstyle:CYCLEROUGE>><dcs:SALLE=<Nextstyle:SALLE>><dcs:HEURE=<Nextstyle:HEURE>><dcs:EVENEMENT=<Nextstyle:EVENEMENT>><dps:DATE=<Nextstyle:DATE>><dcs:FILM=<Nextstyle:FILM>><dcs:DETAIL=<Nextstyle:DETAIL>><dcs:FOLIO=<Nextstyle:FOLIO>><dcs:INFOS=<Nextstyle:INFOS>><dcs:VOST=<Nextstyle:VOST>>[CRLF]
<% _.forOwn(data, (dayProg, day) => { %>
  <pstyle:DATE><%= moment(day).format("dd D MMM") %>
  [CRLF]
  <% _.forEach(dayProg, seance => { %>
    <pstyle:><cstyle:SALLE><%= salle(seance.salle) %><cstyle:>[TAB]<cstyle:HEURE><%= seance.dateHeure.substring(11, 16).replace(":", "h") %><cstyle:>[TAB]
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

  // Transformation des données avant application du template.
  let data = calendarData;

  // Supprime la durée des événements d'action culturelle
  data = _(data)
    .mapValues((day) =>
      _(day)
        .map((seance) =>
          _({})
            .assign(seance, {
              items: _(seance.items)
                .map((d) => {
                  if (d.idConf) {
                    return _(d).omit("duree").value();
                  } else {
                    return d;
                  }
                })
                .value(),
            })
            .value()
        )
        .value()
    )
    .value();

  // Filtrage des titres de cycles (à ajuster selon les besoins)
  data = _(data)
    .mapValues((day) =>
      _(day)
        .map((seance) =>
          _({})
            .assign(seance, {
              cycle: _(seance.cycle)
                .map((d) => {
                  if (d[0] === "Ciné-club de Frédéric Bonnaud") return [d[0]];
                  if (d[0] === "Séances Jeune public")
                    return ["Séance Jeune public", ""];
                  if (d[0] === "Séances spéciales")
                    return ["Séance spéciale", ""];
                  if (d[0] === "Cinéma bis" || d[0] === "Aujourd'hui le cinéma")
                    return d;
                  return null; // Autres cas => on met cycle à null pour filtrer à l'étape suivante.
                })
                .filter((d) => d !== null)
                .value(),
            })
            .value()
        )
        .value()
    )
    .value();

  // Ajout des n°s de page.
  let evenementsPages;
  let progConfig = await helpers.fetchProgConfig(
    idProg,
    config.access.pathDataConfig
  );
  let catsInProg = _(progConfig) // Tableau des IDs des catégories du programme.
    .thru((d) => {
      return _(d.cycles)
        .map((e) =>
          _(e.sousCycles)
            .map((f) => f.cats)
            .value()
        )
        .value();
    })
    .flattenDeep()
    .uniq()
    .sort()
    .value();

  try {
    const db = await database.attach(config.access.db);
    console.log("Connecté à la base de données.");
    evenementsPages = await pages(db, catsInProg);
    console.log("Les informations de foliotage ont été obtenues.");
    // On rattache à chaque séance son n° de page.
    data = _(data)
      .mapValues((seance) =>
        _(seance)
          .map((d) =>
            _({})
              .assign(d, {
                page: _(evenementsPages)
                  .thru((g) => {
                    let h = _(g).find(
                      (g) => g.idevenement === seance.idEvenement
                    );
                    return h ? h.numeroPage : null;
                  })
                  .value(),
              })
              .value()
          )
          .value()
      )
      .value();
  } catch (e) {
    console.log(
      "La connexion à la base de données a échoué : on continue sans les données de foliotage."
    );
  }

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

module.exports = { taggedTextInDesign };
