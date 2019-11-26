const request = require("request-promise");
const pAll = require("p-all");
const _ = require("lodash/fp");
const fp = _.noConflict();
const minify = require("html-minifier").minify;
const cheerio = require("cheerio");

/**
 * scrape
 * Effectue des requêtes http à partir d'un tableau d'urls et renvoie un
 * objet avec l'url pour clé et la chaîne html pour valeur.
 * Lorsque le tableau `keys` est fourni (et qu'il a la même longueur que le tableau `urls`), on l'utilise pour le nommage des clés de l'objet de retour.
 * Utile par exemple pour associer le contenu à un id plutôt qu'à une url complète.
 * @param {Array} urls tableau d'urls à scraper
 * @param {Array} keys (facultatif) tableau de clés.
 * @return {Object} {_url_: { statusCode:, body: }, ...}
 */
async function scrape(urls, keys) {
  try {
    if (!_.isArray(urls) || urls.length < 1) throw new Error("L'argument `urls` doit être un tableau non vide.");
    if (!_.isUndefined(keys) && (!_.isArray(keys) || keys.length !== urls.length)) throw new Error("L'argument optionnel `keys` doit être un tableau de même longueur que `urls`.");

    let res = await pAll(
      fp.map(async url => async () => {
        let r = await request({
          method: "GET",
          uri: `${url}`,
          resolveWithFullResponse: true,
          json: false,
          simple: false
        });
        console.log(`Scraping ${url}: status ${r.statusCode}`);
        return r;
      })(urls), {
        concurrency: 1
      }
    );

    res = fp.map(d => {
      return {
        statusCode: d.statusCode,
        body: cleanHtml(d.body)
      };
    })(res);
    return fp.zipObject(_.isUndefined(keys) ? urls : keys, res); // Possible parce que `concurrency = 1`
  } catch (e) {
    console.log("Erreur");
    console.log(e);
  }
}

/**
 * filterOK
 * Fonction utilitaire simple pour conserver les données dont le status http est 200 (attention : nécessite l'objet renvoyé par la méthode scrape).
 * @param {Object} data Objet de données renvoyé par la méthode scrape.
 * @returns {Object} Objet de données de la forme {url: body, ...}
 */
const filterOK = fp.flow(
  fp.pickBy(d => d.statusCode === 200),
  fp.mapValues(d => d.body)
);


/**
 * statusCode
 * Fonction utilitaire simple pour ne conserver que les codes http (attention : nécessite l'objet renvoyé par la méthode scrape).
 * @param {Object} data Objet de données renvoyé par la méthode scrape.
 * @returns {Object} Objet de données de la forme {url: statusCode, ...}
 */
const statusCode = fp.mapValues(d => d.statusCode);

/**
 * cleanHtml
 * Simplifie et nettoie un document html :
 * - Retire les balises `script`, `style`, `link`.
 * - Supprime les commentaires (y compris les commentaires conditionnels IE).
 * - Le minifie.
 * @param {string} str
 */
function cleanHtml(str) {
  if (typeof str === "string") {
    let $ = cheerio.load(str);
    $("script").remove();
    $("style").remove();
    $("link").remove();
    $.root()
      .contents()
      .filter(function () {
        // https://github.com/cheeriojs/cheerio/issues/214
        return this.type === "comment";
      })
      .remove();
    $.root()
      .find("*")
      .contents()
      .filter(function () {
        // https://github.com/cheeriojs/cheerio/issues/214
        return this.type === "comment";
      })
      .remove();

    return minify($.html(), {
      collapseWhitespace: true,
      decodeEntities: true
    });
  } else {
    return null;
  }
}

module.exports = {
  scrape: scrape,
  statusCode: statusCode,
  filterOK: filterOK
};