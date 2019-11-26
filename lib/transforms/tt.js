const _ = require("lodash");
const moment = require("moment");
const format = require("../format.js");

moment.updateLocale("fr", require("../config.js").momentLocale.fr);
moment.updateLocale("fr", {
  monthsShort: [
    "jan",
    "fév",
    "mar",
    "avr",
    "mai",
    "juin",
    "juil",
    "aoû",
    "sep",
    "oct",
    "nov",
    "déc"
  ],
  weekdaysShort: ["di", "lu", "ma", "me", "je", "ve", "sa"]
});

// Template InDesign Tagged Text
const temp = _.template(`<ANSI-WIN>¤
<vsn:8><fset:InDesign-Roman><dcs:INFOSBLEUES=<Nextstyle:INFOSBLEUES>><dcs:INFOSROUGES=<Nextstyle:INFOSROUGES>><dcs:SALLESBLEUES=<Nextstyle:SALLESBLEUES>><dcs:SALLESROUGES=<Nextstyle:SALLESROUGES>><dps:TITRE=<Nextstyle:TITRE>><dps:TECHNIQUE=<Nextstyle:TECHNIQUE>><dps:SYNOPSIS=<Nextstyle:SYNOPSIS>><dps:EVENEMENT=<Nextstyle:EVENEMENT>><dps:PRATIQUE=<Nextstyle:PRATIQUE>><dps:CONFERENCE NOTE=<Nextstyle:CONFERENCE NOTE>><dps:CONFERENCE TXT=<Nextstyle:CONFERENCE TXT>><dps:CONFERENCE TITRE=<Nextstyle:CONFERENCE TITRE>>¤
<% var synopsisTextType = 9; %>
<% if (!_.isUndefined(data.header.type)) { if (data.header.type === "jp") { synopsisTextType = 203; %><% } } %>
<% _.forEach(data.data, sousCycle => { %>
  <pstyle:CATEGORIE><%= format.nbsp(sousCycle.titreSousCycle, "<0x00A0>") %>¤¤
  <% if (sousCycle.tri === 1) { %>
    <% _.forEach(sousCycle.items, film => { %>
      <pstyle:TITRE><%= format.nbsp(format.artTitre(film.art, film.titre), "<0x00A0>") %>¤
      <%= ba("<pstyle:TITRE_ANG>(", ")¤", format.nbsp(format.artTitre(film.artVo, film.titreVo), "<0x00A0>")) %>
      <%= ba("<pstyle:TECHNIQUE>", "¤", format.de(film.realisateurs) + film.realisateurs) %>
      <%= ba("<pstyle:TECHNIQUE>", "¤", format.join("/", [film.pays, film.annee, ba("", "<0x2019>", film.duree), film.version, film.format])) %>
      <%= ba("<pstyle:TECHNIQUE>", "¤", ttItalToSkew(mdToTT(format.nbsp(film.adaptation, "<0x00A0>")))) %>
      <%= ba("<pstyle:TECHNIQUE>Avec ", ".¤", format.join(", ", film.generique)) %>
      <% if (!_.isUndefined(film.textes)) { %>
        <% if(film.textes.length > 0) { %>
          <% _.forEach(film.textes, texte => { %>
            <% if (texte.typeTexte === synopsisTextType) { %><pstyle:SYNOPSIS>
              <%= mdToTT(format.nbsp(texte.texte, "<0x00A0>")) %>
            <% } else if (texte.typeTexte === 99) { %><pstyle:INFOS_UTILES>
              <%= ttItalToSkew(mdToTT(format.nbsp(texte.texte, "<0x00A0>"))) %>
            <% } %>
            ¤
          <% }) %>
        <% } %>
      <% } %>
      <pstyle:>
      <% _.forEach(film.seance, seance => { %>
        <cstyle:INFOSBLEUES>
        <% if(data.header.type === "jp" && film.ageMinimal) { %>
          <%= ba("[", " ans] ", film.ageMinimal) %>
        <% } %>
        <%= ba("", "¤", moment(seance.dateHeure).format("ddd DD MMM[XXX]HH[h]mm[XXX]")) %>
        <%= ba("<cstyle:SALLESBLEUES>", "¤", salle(seance.idSalle[0])) %>
        <%= ba("<pstyle:EVENEMENT>", "¤", ttItalToSkew(mdToTT(seance.mention))) %>
        <%= ba("<pstyle:EVENEMENT>", "¤", ttItalToSkew(mdToTT(film.precedeSuivi))) %>
      <% }) %>
      ¤
    <% }); %>
  <% } %>
  <% if (sousCycle.tri === 2 || sousCycle.tri === 3 || sousCycle.tri === 4) { %>
    <% _.forEach(sousCycle.items, evenement => { %>
      <%= ba("¤<pstyle:CATEGORIE>", "¤", format.nbsp(evenement.titreEvenement, "<0x00A0>")) %>
      <% _.forEach(evenement.films, (film, i) => { %>
        <pstyle:TITRE><%= format.nbsp(format.artTitre(film.art, film.titre), "<0x00A0>") %>¤
        <%= ba("<pstyle:TITRE_ANG>(", ")¤", format.nbsp(format.artTitre(film.artVo, film.titreVo), "<0x00A0>")) %>
        <%= ba("<pstyle:TECHNIQUE>", "¤", format.de(film.realisateurs) + film.realisateurs) %>
        <%= ba("<pstyle:TECHNIQUE>", "¤", format.join("/", [film.pays, film.annee, ba("", "<0x2019>", film.duree), film.version, film.format])) %>
        <%= ba("<pstyle:TECHNIQUE>", "¤", ttItalToSkew(mdToTT(format.nbsp(film.adaptation, "<0x00A0>")))) %>
        <%= ba("<pstyle:TECHNIQUE>Avec ", ".¤", format.join(", ", film.generique)) %>
        <% if (!_.isUndefined(film.textes)) { %>
          <% if(film.textes.length > 0) { %>
            <% _.forEach(film.textes, texte => { %>
              <% if (texte.typeTexte === synopsisTextType || texte.typeTexte === 8 || texte.typeTexte === 156) { %><pstyle:SYNOPSIS>
                <%= mdToTT(format.nbsp(texte.texte, "<0x00A0>")) %>
              <% } else if (texte.typeTexte === 99) { %><pstyle:INFOS_UTILES>
                <%= ttItalToSkew(mdToTT(format.nbsp(texte.texte, "<0x00A0>"))) %>
              <% } %>
              ¤
            <% }) %>
          <% } %>
        <% } %>
        <% if (i < evenement.films.length - 1) { %><pstyle:SUIVI_DE>Suivi de¤<% } %>
      <% }) %>
      <pstyle:>
      <% _.forEach(evenement.seance, seance => { %>

        <cstyle:INFOSBLEUES>
        <% if(data.header.type === "jp") { %>
          <%= ba("[", " ans] ", _.max(_(evenement.films).map(d => d.ageMinimal || null).value())) %>
        <% } %>
        <%= ba("", "¤", moment(seance.dateHeure).format("ddd DD MMM[XXX]HH[h]mm[XXX]")) %>
        <%= ba("<cstyle:SALLESBLEUES>", "¤", salle(seance.idSalle[0])) %>
        <%= ba("<pstyle:EVENEMENT>", "", ttItalToSkew(mdToTT(seance.mention))) %>
      <% }) %>
      ¤
    <% }) %>
  <% } %>
<% }); %>
`.replace(/\n\s*/g, ""));

/**
 * mdToTT
 * Convertit une chaîne Markdown au format Tagged Text.
 * @param {string} str 
 */
function mdToTT(str) {
  let o = str;
  try {
    o = o.replace(/\\/g, ""); // Retire les backslash (échappement Markdown)
    o = o.replace(/_([^_]+)_/gi, "<ct:Italic>$1<ct:>");
    o = o.replace(/'/g, "<0x2019>");
    o = o.replace(/&nbsp;/g, "<0x00A0>"); // Espace insécable
    o = o.replace(/<sup>(.*?)<\/sup>/gi, "<cPosition:Superscript>$1<cPosition:>");
    return o;
  } catch (e) {
    return "";
  }
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

/**
 * ttItalToSkew
 * Remplace dans une chaîne Tagged Text le balisage italique par un balisage d'inclinaison (faux italique).
 * Utilisé pour les champs dont la typo n'a pas de variante italique.
 * @param {string} str
 */
function ttItalToSkew(str) {
  return str.replace(/<ct:Italic>(.*?)<ct:>/gi, "<cSkew:9>$1<cSkew:>");
}

/**
 * ttQuote
 * Traitement spécial InDesign
 * Les sous-chaînes entre guillemets (citations) sont taggées en italique
 * et les marques de l'italique à l'intérieur (`_` à ce stade) sont repassées en romain.
 * NB : cette fonction est incorrecte (ne matche que la première occurence).
 * Par ailleurs, on n'a finalement pas besoin de l'utiliser (les citations restent en romain pour InDesign).
 * @deprecated
 */
function ttQuote(str) {
  let m = (new RegExp("(.*?)(«[^»]*»)(.*)", "gi")).exec(str);
  return m ?
    m[1] + "<ct:Italic>" + m[2].replace(/_([^_]+)_/gi, "<ct:>$1<ct:Italic>") + "<ct:>" + m[3] :
    str;
}

/**
 * Convertit un objet à l'étape _RENDER en chaîne au format Tagged Text.
 * @param {json} data JSON _RENDER
 * @return {string} Chaîne tagged text
 */
function tt(data) {
  let o = temp({
    data: data,
    format: format,
    moment: moment,
    ba: format.beforeAfterStr,
    mdToTT: mdToTT,
    salle: salle,
    ttItalToSkew: ttItalToSkew,
    // ttQuote: ttQuote
  });

  // Remplacement des ¤ par des sauts de ligne (attention : séquence \r\n)
  o = o.replace(/¤{2,}/g, "\r\n\r\n");
  o = o.replace(/¤/g, "\r\n");

  // Remplacement par le code correspondant en représentation UTF-16 (hex)
  o = o.replace(/Œ/g, "<0x0152>");
  o = o.replace(/œ/g, "<0x0153>");
  o = o.replace(/–/g, "<0x2013>"); // Demi-cadratin (&ndash;)
  o = o.replace(/—/g, "<0x2014>"); // Cadratin (&mdash;)

  // TEMP: on supprime l'espace avant "mm"
  o = o.replace(/(16|35|70) mm/gi, "$1mm");


  return o;
}

module.exports = tt;