const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");

moment.locale("fr", require("../config.js").momentLocale.fr);

// 2019-07-17 template temporaire pour récupérer les pays
// const tempPays = _.template(`
// # <%= data.header.titreCycle %>¤¤
// <% _.forEach(data.data, sousCycle => { %>
//   ## <%= sousCycle.titreSousCycle %>¤¤
//   <% if (sousCycle.tri === 1) { %>
//     <% _.forEach(sousCycle.items, film => { %>
//         **<%= format.artTitre(film.art, film.titre) %>**  ¤
//         <%= film.pays %>¤¤
//     <% }) %>
//   <% } %>

//   <% if (sousCycle.tri === 2 || sousCycle.tri === 3 || sousCycle.tri === 4) { %>
//     <% _.forEach(sousCycle.items, evenement => { %>
//       <% _.forEach(evenement.films, (film, i) => { %>
//         **<%= format.artTitre(film.art, film.titre) %>**  ¤
//         <%= film.pays %>¤¤
//       <% }) %>
//     <% }) %>
//   <% } %>
// <% }) %>
// `.replace(/\n\s*/g, ""));




// Les données étant préalablement préparées et triées par render.js, le template est identique pour les modes de tri 2, 3 et 4.
const temp = _.template(`
# <%= data.header.titreCycle %>¤¤
<% _.forEach(data.data, sousCycle => { %>
  ## <%= sousCycle.titreSousCycle %>¤¤
  <% _.forEach(sousCycle.textes, texte => { %>
    **<%= texte.texte %>**¤¤
  <%}) %>
  <% if (sousCycle.tri === 1) { %>
    <% _.forEach(sousCycle.items, film => { %>
        [<%=  film.idFilm %>]¤
        **<%= format.artTitre(film.art, film.titre) %>**¤
        <%= ba("**(", ")**¤", format.artTitre(film.artVo, film.titreVo)) %>
        <%= ba("", "¤", format.de(film.realisateurs) + film.realisateurs) %>
        <%= ba("", "¤", format.join(" / ", [film.pays, film.annee, ba("", " min", film.duree), film.version, film.format])) %>
        <%= ba("", "¤", film.adaptation) %>
        <%= ba("Avec ", ".¤", format.join(", ", film.generique)) %>
        <% _.forEach(film.textes, texte => {
          let t = texte.texte;
          if (texte.typeTexte === 203) t = "[JP] " + t;
          %>
          <%= ba("", "¤", t) %>
        <% }) %>
        <%= ba("", "¤", film.precedeSuivi) %>
        ¤
        <% _.forEach(film.seance, seance => { %>
          - <% if(data.header.type === "jp" && film.ageMinimal) { %>
            <%= ba("[", " ans] ", film.ageMinimal) %>
          <% } %>
          <%= ba("", "¤", format.join(" ", [moment(seance.dateHeure).format("ddd D MMM HH[h]mm"), seance.idSalle[0]])) %>
          <%= ba("", "¤", seance.mention) %>
          <%= ba("", "¤", film.precedeSuivi) %>
        <% }) %>
        ¤¤
      <% }) %>
    <% } %>

    <% if (sousCycle.tri === 2 || sousCycle.tri === 3 || sousCycle.tri === 4) { %>
      <% _.forEach(sousCycle.items, evenement => { %>
          <%= ba("### ", "¤¤", evenement.titreEvenement) %>
          <% _.forEach(evenement.films, (film, i) => { %>
            [<%=  film.idFilm %>]¤
            **<%= format.artTitre(film.art, film.titre) %>**¤
            <%= ba("**(", ")**¤", format.artTitre(film.artVo, film.titreVo)) %>
            <%= ba("", "¤", format.de(film.realisateurs) + film.realisateurs) %>
            <%= ba("", "¤", format.join(" / ", [film.pays, film.annee, ba("", " min", film.duree), film.version, film.format])) %>
            <%= ba("", "¤", film.adaptation) %>
            <%= ba("Avec ", ".¤", format.join(", ", film.generique)) %>
            <% _.forEach(film.textes, texte => {
              let t = texte.texte;
              if (texte.typeTexte === 203) t = "[JP] " + t;
              %>
              <%= ba("", "¤", t) %>
            <% }) %>
            <% if (i < evenement.films.length - 1) { %>suivi de<% } %>
            ¤
          <% }) %>
          ¤
          <% _.forEach(evenement.seance, seance => { %>
            - <% if(data.header.type === "jp") { %>
              <%= ba("[", " ans] ", _.max(_(evenement.films).map(d => d.ageMinimal || null).value())) %>
            <% } %>
            <%= ba("", "¤", format.join(" ", [moment(seance.dateHeure).format("ddd D MMM HH[h]mm"), seance.idSalle[0]])) %>
            <%= ba("", "¤", seance.mention) %>
          <% }) %>
          ¤
      <% }) %>
    <% } %>

    <% }) %>
`
  .replace(/\n\s*/g, "")
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
  // let o = temp({
  //   data: data,
  //   format: format,
  //   moment: moment,
  //   ba: format.beforeAfterStr // Raccourci
  // });

  // Remplacement des ¤ par des sauts de ligne
  o = o.replace(/¤{2,}/g, "\n\n");
  o = o.replace(/¤/g, "  \n");
  return o;
}

module.exports = markdown;