/**
 * Convertit un fichier texte Markdown en fichier Tagged Text encodé en win-1252.
 */

const fs = require("fs");
const iconv = require("iconv-lite");
const helpers = require("./lib/helpers.js");
const config = require("./lib/config.js");
// const markdownText = require("./lib/transforms/markdown_text.js");
const format = require("./lib/format.js");


try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
  var idCycle = helpers.toNumOrNull(args.c[0]);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>."
  );
}

(async () => {
  let progConfig = await helpers.fetchProgConfig(idProg);
  let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  let cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  try {
    let md = await helpers.readFile(`${config.pathData.remote}${progDirectoryName}/${cycleFullCode[0]} ${cycleFullCode[1]}/${cycleFullCode[0]}_TEXTE ${cycleFullCode[1]}.md`);
    let tt = format.cudm(md);
    tt = format.nbsp(tt); // Placement automatique des &nbsp;

    tt = tt.replace(/\\/g, ""); // Retire tous les backslash
    tt = tt.replace(/_([^_]*)_/g, "<ct:Italic>$1<ct:>") // Italiques
    tt = tt.replace(/<sup>(.*?)<\/sup>/g, "<cp:Superscript>$1<cp:>"); // Balises <sup>
    tt = tt.replace(/\[\^(\d+)\](?!:)/g, "<cp:Superscript>$1<cp:>"); // Appels de note
    tt = tt.replace(/&nbsp;/g, "<0x00A0>"); // Espace insécable
    tt = tt.replace(/–|&ndash;/g, "<0x2013>"); // Demi-cadratin
    tt = tt.replace(/—|&mdash;/g, "<0x2014>"); // Cadratin
    tt = tt.replace(/'/g, "<0x2019>"); // Apostrophe droite => apostrophe "typographique"
    tt = tt.replace(/Œ/g, "<0x0152>");
    tt = tt.replace(/œ/g, "<0x0153>");

    // tt = tt.replace(/(«[^»]*»)/g, "<ct:Italic>$1<ct:>"); // (NON) Citation entre guillemets, en italique
    tt = tt.replace(/^\s*(\n)?#\s(.+)/gm, "<pstyle:BLEU\:<0x2022><0x2022>GTITRE VIOLET TXT COURANT>$2"); // H1
    tt = tt.replace(/^\s*(\n)?##\s(.+)/gm, "<pstyle:BLEU\:<0x2022><0x2022>INTER VIOLETS>$2"); // H2
    tt = tt.replace(/^\s*(\n)?(.+)/gm, "<pstyle:BLEU\:<0x2022><0x2022> TXT COURANT>$2"); // Paragraphe normal
    tt = `<ANSI-WIN>
<vsn:8>
${tt}`;

    tt = tt.replace(/(?=[^\r])(\n)/g, "\r\n"); // Normalisation finale des sauts de ligne en \r\n

    await helpers.writeFileInFolder(
      `${config.pathData.remote}${progDirectoryName}/${cycleFullCode[0]} ${cycleFullCode[1]}`,
      ``,
      `${cycleFullCode[0]}_TEXTE ${cycleFullCode[1]}.txt`, iconv.encode(tt, "win1252")
    );
    console.log("Fichier txt écrit.");
  } catch (e) {
    console.log("Erreur");
    console.log(e);
  }

})();