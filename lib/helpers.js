const _ = require("lodash");
const fs = require("fs");
const moment = require("moment");

const { promisify } = require("util");
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const pathDataConfig = require("../config/access.js").pathDataConfig;

const stripInvalidFilenameChars = require("./format.js")
  .stripInvalidFilenameChars;

/**
 * readFile
 * Fonction asynchrone pour lire un fichier et retourner son contenu.
 * @param {string} path Chemin d'accès du fichier
 * @param {string} encoding Encodage
 * @return {string} Contenu (chaîne de caractères) du fichier
 */
async function readFile(path, encoding) {
  encoding = encoding || "utf8";
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * readFileAsJson
 * Fonction asynchrone pour lire un fichier et retourner son contenu JSON.
 * (Version modifiée pour avoir la même signature que la fonction `writeFileInFolder`.)
 * @param {string} root
 * @param {string} folder
 * @param {string} filename
 * @param {string} encoding
 * @return {object} Objet
 */
async function readFileAsJson(
  root = ".",
  folder = "",
  filename = "",
  encoding = "utf8"
) {
  let data = await readFile(
    `${root}${root ? "/" : ""}${folder}${folder ? "/" : ""}${filename}`,
    encoding
  );
  return JSON.parse(data);
}

/**
 * getIdCats
 * Extrait d'un objet de configuration de cycle la liste de toutes les catégories.
 * @example
 * { idProg, idCycleProg, titreCyle, sousCycles: [{titre, cats: [1810], tri }, {titre, cats: [1850], tri }]} => [1810, 1850]
 * @requires lodash
 * @param {Object} cycleConfig Objet de configuration de cycle.
 * @returns {Array}
 */
function getIdCats(cycleConfig) {
  return _(cycleConfig.sousCycles)
    .map(d => d.cats)
    .flatten()
    .value();
}

/**
 * getIdCatsFromProg
 * Extrait d'un objet de configuration de programme la liste de toutes les catégories (de tous les cycles).
 * @requires lodash
 * @param {Object} progConfig Objet de configuration de programme.
 * @return {Array}
 */
function getIdCatsFromProg(progConfig) {
  return _(progConfig)
    .thru(a =>
      _(a.cycles)
        .map(b =>
          _(b.sousCycles)
            .map(c => c.cats)
            .value()
        )
        .flattenDeep()
        .uniq()
        .sort()
        .value()
    )
    .value();
}

/**
 * keysToCamel
 * @description
 * Normalise les clés d'un objet en camelCase.
 * (Utile lors de la récupération de données d'une base dont les champs sont en snakeCase.)
 * @example
 * { art_fr: "Le", titre_fr: "Doulos" }
 * => { artFr: "Le", titreFr: "Doulos" }
 * @requires lodash
 * @param { Object } obj Objet à traiter.
 * @returns { Object } Objet avec les clés en camelCase.
 */
function keysToCamel(obj) {
  return _(obj)
    .mapKeys((v, k) => _(k).camelCase())
    .value();
}

/**
 * extractArgsValue
 * Extrait les arguments passés pour lancer un processus Node.js dans la console.
 * "<val0> -<arg1> <val1> <val2> <val3> -<arg2> <val4> -<arg1> <val5> -<arg3> -<arg4>"
 * Chaque nom d'argument (clé) commence par `-` et les valeurs sont séparées par des espaces.
 * Les arguments éventuellement présents avant la première clé sont placés dans une clé `_nokey`
 * Les clés sont fusionnées et les valeurs de forme numérique converties en nombre.
 * Une clé sans valeur est conservée et renvoie un tableau vide.
 * Elle peut ainsi être évaluée comme booléen avec `!_.isUndefined`.
 * @example "12 -p 60 -c 400 401 -d" => { _nokey: [12], p: [60], c: [400, 401], d: [] }
 * @param {string} args : Chaîne des arguments (obtenue par process.argv.slice(2).join(" "))
 * @returns {Object} Objet de la forme : { _nokey: [val0], arg1: [val1, val2, val3, val5], arg2: [val4], arg3: [], arg4: [] }
 */
function extractArgsValue(args) {
  let o = [];
  let m = null;

  let startArg = /^([^-]+)/gi.exec(args);

  if (!!startArg) {
    startArg = startArg[0];
    let pos = startArg.length - 1;
    startArg = _.trim(startArg);
    o.push([[["_nokey"], startArg.split(" ")]]);
    args = args.slice(pos, args.length);
  }

  let reg = new RegExp("-([a-z0-9]+)\\s+([^-]*)", "gi");

  do {
    m = reg.exec(args + " -");
    // m = reg.exec(args);
    if (!!m) o.push([[m[1], m[2].split(" ")]]);
  } while (m);
  let res = _(o)
    .map(e =>
      _(e)
        .fromPairs()
        .value()
    )
    .reduce(
      (o, v) =>
        _(o)
          .mergeWith(v, (v1, v2) => _.concat(v1 || [], v2))
          .value(),
      {}
    );
  res = _(res)
    .mapValues(d =>
      _(d)
        .without("")
        .value()
    )
    .value();
  return res;
}

/**
 * toNumOrNull
 * Tente une coercion en valeur numérique (typiquement à partir d'une chaîne) et renvoie null en cas d'échec
 * @param {str} val
 * @param {*|null}
 */
function toNumOrNull(val) {
  return _.isNumber(val * 1) && !_.isNaN(val * 1) ? val * 1 : null;
}

/**
 * toNumOrSelf
 * Tente une coercion en valeur numérique (typiquement à partir d'une chaîne) et renvoie la valeur d'entrée en cas d'échec
 * @param {*} val
 * @param {*}
 */
function toNumOrSelf(val) {
  let o = toNumOrNull(val) || val;
  return o !== null ? o : val;
}

/**
 * objToNumOrSelf
 * Pour chaque valeur d'un objet (ou d'un tableau), tente une coercion en valeur numérique (à partir d'une chaîne) et renvoie la valeur d'entrée en cas d'échec
 * @param {Object|Array} obj
 * @return {Object|Array}
 */
function objToNumOrSelf(obj) {
  try {
    if (!_.isObject(obj)) throw "The argument must be an array or an object.";
    let o = _(obj)
      .mapValues(i => toNumOrSelf(i))
      .value();
    return _.isArray(obj) ? _.map(o) : o;
  } catch (e) {
    console.error(e);
    return;
  }
}

/**
 * timestamp
 * @returns {string} Timestamp de l'heure courante au format YYYYMMDDHHmm
 */
function timestamp() {
  return moment().format("YYYYMMDDHHmm");
}

/**
 * cycleConfig
 * Extrait d'un objet `cyclesConfig` les données de configuration d'un cycle.
 * L'objet extrait est complété de l'identifiant de programme.
 *  Les catégories listées dans l'objet de configuration du cycle doivent être sans doublons (pour parer à une erreur fréquente liée à la création manuelle du fichier de confguration de programme) :
 * - Pas de doublon de catégories à l'intérieur du cycle.
 * - Pas de doublon de catégories du cycles avec des catégories des autres cycles du programme.
 * @param {Object} cyclesConfig Objet de configuration des cycles d'un programme.
 * @param {number} idCycle Id du cycle à extraire.
 * @returns {Object} Objet de configuration.
 */
function cycleConfig(cyclesConfig, idCycle) {
  try {
    let c = _(
      _(cyclesConfig)
        .mapValues(d => _(d).find(e => e.idCycleProg === idCycle))
        .value().cycles
    )
      .tap(d => {
        if (_.isUndefined(d))
          throw "Les données de configuration du cycle n'ont pas été trouvées.";
      })
      .assign({
        idProg: cyclesConfig.idProg
      })
      .value();

    let cats = _(c.sousCycles)
      .map(d => d.cats)
      .flattenDeep()
      .value();
    if (_.uniq(cats).length !== cats.length) {
      throw "Les données de configuration du cycle ont des catégories en doublon.";
    }

    let extCats = _(cyclesConfig.cycles)
      .filter(e => e.idCycleProg !== idCycle)
      .map(e =>
        _(e.sousCycles)
          .map(f => f.cats)
          .value()
      )
      .flattenDeep()
      .intersection(cats)
      .value();

    if (extCats.length > 0) {
      console.log(
        `Attention : les données du configuration du cycle listent des catégories présentes dans d'autres cycles du programme : ${extCats.join(
          ", "
        )}.`
      );
    }

    return c;
  } catch (e) {
    console.error(e);
  }
}

/**
 * fetchProgConfig
 * @param {integer} idProg Id du programme
 * @param {string} pathDataConfig Chemin d'accès aux fichiers de configuration de cycles
 * @returns {object} Objet de configuration du programme
 */
async function fetchProgConfig(idProg, pathDataConfig) {
  try {
    return await readFileAsJson(pathDataConfig, "", `PROG${idProg}.json`);
  } catch (e) {
    console.log(
      `Erreur : le fichier de configuration pour le programme ${idProg} n'a pas pu être lu.`
    );
    return;
  }
}

const getFullCode = {
  /**
   * prog
   * Renvoie le fullCode d'un programme. Il est en deux parties (préfixe/suffixe) pour pouvoir compléter le préfixe dans la construction des noms de fichier.
   * @param {Object} progConfig
   * @return {Array} Tableau de 2 chaînes : préfixe (p. ex. "PROG67") et suffixe ("Mars-mai 2020").
   */
  prog: function(progConfig) {
    try {
      return [
        `PROG${progConfig.idProg}`,
        stripInvalidFilenameChars(progConfig.titre)
      ]; // Code de la programmation, eg. "PROG60 Juin-juillet 2019"
    } catch (e) {
      console.log(
        "Erreur : impossible de lire les informations sur le programme."
      );
      console.log(e);
      return;
    }
  },
  /**
   * cycle
   * Renvoie le fullCode d'un cycle. Il est en deux parties (préfixe/suffixe) pour pouvoir compléter le préfixe dans la construction des noms de fichier.
   * @param {Object} progConfig
   * @param {integer} idCycle
   * @return {Array} Tableau de 2 chaînes : préfixe (p. ex. "PROG61_CYCL439") et suffixe ("Kira Mouratova").
   */
  cycle: function(progConfig, idCycle) {
    try {
      let titreCycle = _(progConfig.cycles).find(d => d.idCycleProg === idCycle)
        .titreCycle;
      return [
        stripInvalidFilenameChars(`PROG${progConfig.idProg}_CYCL${idCycle}`),
        stripInvalidFilenameChars(titreCycle)
      ];
    } catch (e) {
      console.log(
        `Erreur : impossible de lire les informations sur le cycle ${idCycle} dans l'objet de configuration du programme ${progConfig.idProg}.`
      );
      console.log(e);
      return;
    }
  }
};

/**
 * writeFileInFolder
 * Ecrit un fichier dans une structure de répertoires qui est créée si elle n'existe pas encore.
 * On distingue une partie du chemin `root`, qui doit être existante, de `folder`, qui la suit, et est créée si nécessaire.
 * @param {string} root
 * @param {string} folder
 * @param {string} filename
 * @param {string} content Données à écrire. Pour un objet JSON, passer les données à `JSON.stringify`.
 * @param {string} encoding
 * @return undefined
 */
async function writeFileInFolder(
  root,
  folder,
  filename,
  content,
  encoding = "utf8"
) {
  let path = `${root}/${folder}`;
  try {
    await mkdirDeep(root, folder);
  } catch (e) {}
  await writeFile(`${path}/${filename}`, content, encoding);
  console.log(`Fichier écrit : ${filename}.`);
}

/**
 * deleteFile
 * @param {string} root
 * @param {string} folder
 * @param {string} filename
 * @return {boolean}
 */
async function deleteFile(root = ".", folder = "", filename = "") {
  try {
    await unlink(
      `${root}${root ? "/" : ""}${folder}${folder ? "/" : ""}${filename}`
    );
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * mkdirDeep
 * Création profonde de répertoires au chemin
 * Distingue entre :
 * - `root` : partie initiale du chemin, que le script ne cherchera pas à créer.
 * - `path` : partie du chemin représentant l'arborescence à créer si nécessaire.
 * @param {string} root Chemin intial, par défaut "."
 * @param {string} path
 * @return {undefined}
 */
async function mkdirDeep(root = ".", path) {
  let acc = "";
  for (const level of path.split("/")) {
    acc = `${acc}/${level}`;
    try {
      await mkdir(`${root}${acc}`);
    } catch (e) {}
  }
}

module.exports = {
  readFile: readFile,
  readFileAsJson: readFileAsJson,
  getIdCats: getIdCats,
  getIdCatsFromProg: getIdCatsFromProg,
  keysToCamel: keysToCamel,
  extractArgsValue: extractArgsValue,
  toNumOrNull: toNumOrNull,
  toNumOrSelf: toNumOrSelf,
  objToNumOrSelf: objToNumOrSelf,
  timestamp: timestamp,
  cycleConfig: cycleConfig,
  getFullCode: getFullCode,
  fetchProgConfig: fetchProgConfig,
  writeFileInFolder: writeFileInFolder,
  deleteFile: deleteFile,
  mkdirDeep: mkdirDeep
};
