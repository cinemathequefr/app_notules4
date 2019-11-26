const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");

moment.locale("fr", require("../config.js").momentLocale.fr);

const temp = _.template(
  `
# <%= data.header.titreCycle %>¤¤
<% _.forEach(data.data, film => { %>
  [<%=  film.idFilm %>]<%= _.isUndefined(film.texteSite) ? "" : "*" %>¤
  **<%= format.artTitre(film.art, film.titre) %>**¤
  <%= ba("**(", ")**¤", format.artTitre(film.artVo, film.titreVo)) %>
  <%= ba("", "¤", format.de(film.realisateurs) + film.realisateurs) %>
  <%= ba("", "¤", format.join(" / ", [film.pays, film.annee])) %>
  <%= ba("", "¤", format.cudm(film.adaptation)) %>
  <%= ba("Avec ", ".¤", format.cudm(format.join(", ", film.generique))) %>
  <% _.forEach(film.textes, texte => {
    let t = texte.texte;
    if (texte.typeTexte === 203) t = "[JP] " + t;
    %>
    <%= ba("", "¤¤", t) %>
  <% }) %>
  <%= ba("¤¤> (Site) ", "", film.texteSite) %>
  ¤¤
<% }) %>
`.replace(/\n\s*/g, "")
);

/**
 * markdown
 * @description
 * Transforme les données d'un cycle en document Markdown
 * @param {Array} data Données de cycle (étape _RENDER)
 * @returns {String} Rendu du cycle au format Markdown
 */
function markdown(data) {
  let o = temp({
    data: data,
    format: format,
    moment: moment,
    ba: format.beforeAfterStr // Raccourci
  });

  // Remplacement des ¤ par des sauts de ligne
  o = o.replace(/¤{2,}/g, "\n\n");
  o = o.replace(/¤/g, "  \n");
  return o;
}

module.exports = markdown;