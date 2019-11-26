const _ = require("lodash");
const config = require("./config.js")


/**
 * artTitre
 * @description
 * @param {string|null} art 
 * @param {string} titre 
 */
function artTitre(art, titre) {
  return !art ? titre : art === "L'" ? art + titre : art + " " + titre;
}


/**
 * beforeAfterStr
 * @description
 * Ajoute des chaînes avant et après une chaîne si celle-ci existe.
 * Fonction utilitaire pour formater un contenu variable, et ne pas formater en l'absence de contenu.
 * @param {string|function} before Chaîne à ajouter avant (ou fonction)
 * @param {string|function} after Chaîne à ajouter après (ou fonction)
 * @param {string} str  Chaîne à traîter
 * @return {string}
 */
function beforeAfterStr(before, after, str) {
  if (!str) return;
  let _before = before;
  let _after = after;
  if (typeof before !== "function") before = () => (_before || "");
  if (typeof after !== "function") after = () => (_after || "");
  return before(str) + str + after(str);
}


/**
 * formatName
 * @description
 * Formate un  nom à partir des paramètres passés en les séparant par une espace, puis retire les espaces après apostrophe.
 * Cette version ne présuppose pas un nombre d'arguments défini.
 * On peut également passer les éléments du nom sous forme d'un array.
 * Cas d'utilisation :
 * - Formater un nom propre à partir de prénom, particule, nom
 * - Format un titre de film à partir d'article, reste du titre
 * @example
 * formatName("Albert", ["de", "Monaco"]) => "Albert de Monaco"
 * @requires lodash
 * @param {arguments} - Eléments séparés compasant le nom (strings ou tableaux (de tableaux) de strings)
 * @return {string}
 */
function formatName() {
  return _(Array.from(arguments)).flattenDeep().value()
    .join(" ")
    .replace(/\'\s/gi, "'")
    .replace(/\s+/gi, " ")
    .trim();
}


/**
 * joinLast
 * @description
 * Fonction équivalent à la méthode `Array.join` mais permettant de spécifier un séparateur particulier pour la dernière position.
 * A la différence de `.join` natif, gère correctement le cas où `arr` est `undefined`.
 * Cas évident : la conjonction "et" en fin de liste.
 * @param {string} separator Séparateur d'items
 * @param {string} lastSeparator Séparateur d'items pour la dernière position (entre l'avant-dernier et le dernier item)
 * @param {array} arr Tableau des items de liste à joindre
 * @returns {string}
 */
function joinLast(separator, lastSeparator, arr) {
  separator = separator || "";
  lastSeparator = lastSeparator || separator;

  arr = _(arr).filter(i => !!i).value(); // Elimine les items falsy

  function j(a) {
    a = a || [];
    if (a.length < 2) return a.join("");
    var last = a.pop();
    return a.join(separator) + lastSeparator + last;
  }
  return j(arr);
}

/**
 * join
 * Helper lorsqu'on n'utilise qu'un seul séparateur
 * L'utiliser de préférence à `.join` natif.
 * @param {string} separator Séparateur d'items
 * @param {array} arr Tableau des items de liste à joindre
 * @returns {string}
 */
function join(separator, arr) {
  return joinLast(separator, separator, arr);
}


/**
 * normalizeTitle
 * @description
 * Normalise des valeurs de champs composant un titre de film.
 * Si le titre Vo est identique au title Fr, il n'est pas renvoyé.
 * Traitement supplémentaire : on retire les crochets droits, qui identifient dans Cinédoc les titres forgés.
 * @param {string|null} titleVo Titre original (sans article).
 * @param {string|null} artVo Article du titre original.
 * @param {string|null} titleFr Titre français (sans article).
 * @param {string|null} artFr Article du titre français.
 * @param {string|null} titleFrMod Titre français modifié (sans article), devant surcharger le titre français.
 * @param {string|null} artFrMod Article du titre français modifié, devant surcharger l'article du titre français.
 * @returns {Object} Objet de la forme { title: "", art: "", titleVo: "", artVo: "" }. Les champs null ne sont pas renvoyés.
 */
function normalizeTitle(
  titleVo,
  artVo,
  titleFr,
  artFr,
  titleFrMod,
  artFrMod
) {
  let titleFieldName = "titre";
  let artFieldName = "art";
  let titleVoFieldName = "titreVo";
  let artVoFieldName = "artVo";
  let output = {};
  let art = "";
  let title = "";

  if (!!titleFrMod) {
    title = titleFrMod;
    art = artFrMod;
  } else if (!!titleFr) {
    title = titleFr;
    art = artFr;
  } else {
    title = titleVo;
    art = artVo;
  }

  // Cas où les titres sont strictement différents mais équivalents : le titreVo est le titre de référence
  if (_.kebabCase(title) === _.kebabCase(titleVo) && _.kebabCase(art) === _.kebabCase(artVo)) {
    title = titleVo;
    art = artVo;
    titleVo = artVo = "";
  }

  output[titleFieldName] = title;
  if (!!art) output[artFieldName] = art;

  if (title !== titleVo) { // Si le titreVo est différent de titre, on l'inclut
    output[titleVoFieldName] = titleVo;
    if (!!artVo) output[artVoFieldName] = artVo;
  }

  output = _(output)
    .mapValues(v => v.replace(/[\[\]]/g, "")) // Retire les crochets des titres (indiquant les titres forgés)
    .value();

  return output;
}

/**
 * de
 * @description
 * Renvoie "de " ou "d'" selon la chaîne passée en paramètre
 * @param {string} str
 * @returns {string}
 */
function de(str) {
  if (!str) return "";
  // if (!str) return;
  return (_.indexOf("AEIOU", _.upperCase(_.deburr(str)).charAt(0)) > -1 ? "d'" : "de ");
}


/**
 * expandCountries(codes)
 * Transforme une chaîne avec une liste de codes pays (ex. "ESP;FRA;ITA") par une chaîne avec les noms complets ("Espagne, France, Italie")
 * La liste des pays se trouve dans le tableau `config.countries`
 * @param codes {string}
 * @output {array}
 */
function expandCountries(codes) {
  return _(codes.split(";"))
    .map(code => _.find(config.countries, f => f[0] === code)[1] || code)
    .value()
}

/** 
 * precedeSuivi
 * @description
 * Formate des titres de la forme :
 * "Film précéde de...", "Film suivi de...", "Film précédé de... et suivi de..."
 * @param {Array} avant Tableau d'objets { idFilm, titre, art, realisateurs }
 * @param {Array} apres Tableau d'objets { idFilm, titre, art, realisateurs }
 * @returns {String} Chaîne formatée
 */
function precedeSuivi(avant, apres) {
  avant = joinLast(
    ", ",
    ", ",
    _(avant).map(function (d) {
      return "_" + artTitre(d.art, d.titre) + "_" + beforeAfterStr(" " + de(d.realisateurs), "", d.realisateurs);
      // return "_" + artTitre(d.art, d.titre) + "_" + beforeAfterStr(" (", ")", d.realisateurs);
    })
  );
  apres = joinLast(
    ", ",
    ", ",
    _(apres).map(function (d) {
      return "_" + artTitre(d.art, d.titre) + "_" + beforeAfterStr(" " + de(d.realisateurs), "", d.realisateurs);
      // return "_" + artTitre(d.art, d.titre) + "_" + beforeAfterStr(" (", ")", d.realisateurs);
    })
  );
  if (avant !== "" && apres != "") {
    return `Film précédé ${de(avant) + avant} et suivi de ${de(apres) +
      apres}`;
  } else if (avant !== "") {
    return `Film précédé ${de(avant) + avant}`;
  } else if (apres !== "") {
    return `Film suivi ${de(apres) + apres}`;
  } else {
    return "";
  }
}

/**
 * stripInvalidFilenameChars
 * Retire d'une chaîne les caractères non valides dans un nom de fichier (Windows).
 * @param {string} str
 * @returns {string}
 */
function stripInvalidFilenameChars(str) {
  try {
    return str.replace(/[\\/:*?"<>|]/gi, "");
  } catch (e) {
    console.error(e);
    return;
  }
}

/**
 * stripNewLines
 * Retire les sauts de ligne d'un texte (brut ou Markdown) en les remplaçant par un espace.
 * @param {string} str
 * @returns {string}
 */
function stripNewLines(str) {
  try {
    return str.replace(/\s*\n+/g, " ");
  } catch (e) {
    console.error(e);
    return;
  }
}

/**
 * nbsp
 * Remplace les espaces en position d'insécable (cas usuels) par un insécable
 * NB : temporairement (?) traité à part de cudm.
 * @param {string} str
 * @param {string} rep Chaîne à utiliser pour exprimer l'espace insécable (par défaut "&nbsp;")
 * @return {string}
 */
function nbsp(str, rep) {
  if (!str) return;
  if (!rep) rep = "&nbsp;"
  let o = str;
  o = o.replace(/(\x20)([\?:!;\xBB])/gi, `${rep}$2`); // Remplace un espace par un espace insécable dans les cas usuels
  o = o.replace(/(\xAB)(\x20)/gi, `$1${rep}`); // Remplace un espace par un espace insécable après un guillemet français ouvrant
  o = o.replace(/(\s–)/gi, `${rep}–`); // Demi-cadratins
  o = o.replace(/(–\s)/gi, `–${rep}`); // Demi-cadratins
  return o;
}


module.exports = {
  artTitre: artTitre,
  beforeAfterStr: beforeAfterStr,
  cudm: require("./cudm.js"),
  expandCountries: expandCountries,
  formatName: formatName,
  join: join,
  joinLast: joinLast,
  de: de,
  nbsp: nbsp,
  normalizeTitle: normalizeTitle,
  stripNewLines: stripNewLines,
  stripInvalidFilenameChars: stripInvalidFilenameChars,
  precedeSuivi: precedeSuivi
};