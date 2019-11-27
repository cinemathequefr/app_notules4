/**
 * Script d'initialisation d'un programme trimestriel
 * Nécessite l'existence d'un fichier de configuration de cycle minimal correspondant à l'id passé en paramètre.
 * Crée un répertoire de données (p. ex. "PROG61 Septembre-novembre 2019").
 */

const fs = require("fs");
const _ = require("lodash/fp");
const helpers = require("./lib/helpers.js");
const { promisify } = require("util"); // https://stackoverflow.com/questions/40593875/using-filesystem-in-node-js-with-async-await
const fp = _.noConflict();
const basePaths = require("./config/access.js").pathData;

let progConfig = {};
let progFullCode = "";

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Un argument est requis : -p <id programme>."
  );
}

(async () => {
  try {
    progConfig = await helpers.fetchProgConfig(idProg);
    progFullCode = helpers.getFullCode.prog(progConfig); // Code de la programmation, p. ex. ["PROG60", "Juin-juillet 2019"]
    progFullCode = progFullCode.join(" ");
    // Création des répertoires
    // 2019-11-26 : `forEach` se justifiait par le fait que `basePaths` avait plusieurs propriétés, pointant vers des emplacements à créer.
    // Je ne change pas le code, mais `basePaths` n'a plus que la propriété `remote`.
    fp.forEach(async p => {
      try {
        await helpers.mkdirDeep(p, progFullCode);
        console.log(
          `OK : Le répertoire "${progFullCode}" a été créé dans ${p}.`
        );
      } catch (e) {
        if (e.errno === -4075) {
          console.log(
            `Erreur : Le répertoire "${progFullCode}" existe déjà dans ${p}`
          );
        } else {
          console.log(e);
        }
      }
    })(basePaths);
  } catch (e) {
    console.log("Erreur : l'initialisation a échoué.");
    console.log(e);
  }
})();
