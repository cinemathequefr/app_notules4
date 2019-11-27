// const fs = require("fs");
const _ = require("lodash");
const cheerio = require("cheerio");
const helpers = require("./lib/helpers.js");
const format = require("./lib/format.js");
const config = {
  main: require("./config/main.js"),
  access: require("./config/access.js")
};
const markdownFilms = require("./lib/transforms/markdown_films.js");
const scraper = require("./lib/scraper.js");
const turndownService = new require("turndown")(config.main.turndown);
const basePath = config.access.pathData.remote;

try {
  let args = helpers.extractArgsValue(process.argv.slice(2).join(" "));
  var idProg = helpers.toNumOrNull(args.p[0]);
  var idCycle = helpers.toNumOrNull(args.c[0]);
  // var isDef = !_.isUndefined(args.d);
} catch (e) {
  console.error(
    "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle>."
    // "Erreur d'arguments. Les arguments attendus sont de la forme : -p <id programme> -c <id cycle> -d (optionnel)."
  );
}

(async function() {
  let progConfig = await helpers.fetchProgConfig(idProg);
  let cycleConfig = helpers.cycleConfig(progConfig, idCycle);
  let progDirectoryName = helpers.getFullCode.prog(progConfig).join(" "); // Nom du répertoire du programme
  let cycleFullCode = helpers.getFullCode.cycle(progConfig, idCycle);

  let films;
  let isDef;

  // TODO: gestion des exceptions (cas où le fichier _FILMS.json est absent)

  try {
    films = await helpers.readFileAsJson(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}/editable`,
      `${cycleFullCode[0]}_FILMS_EDIT ${cycleFullCode[1]}.json`
    );
    isDef = true;
    console.log("Un fichier _FILMS_EDIT.json a été trouvé.");
  } catch (e) {
    try {
      films = await helpers.readFileAsJson(
        `${basePath}/${progDirectoryName}`,
        `${cycleFullCode[0]} ${cycleFullCode[1]}/generated`,
        `${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.json`
      );
      isDef = false;
      console.log("Un fichier _FILMS.json a été trouvé.");
    } catch (e) {
      console.log(
        "Échec : fichier _FILMS.json ou _FILMS_EDIT.json non trouvé. Exécuter d'abord le script `fetch -f` pour obtenir ces données."
      );
      process.exit(0);
    }
  }

  films = _(films)
    .sortBy(d => _.kebabCase(d.titre))
    .value(); // Important quand isDef === true car l'ordre des films peut être devenu incorrect avec la correction d'un titre

  if (isDef === false) {
    let filmsSite = await filmsFromSite(films); // Récupère les synopsis des films sur le site
    films = _(
      _.merge(
        _(films)
          .groupBy("idFilm")
          .mapValues(e => e[0])
          .value(),
        filmsSite
      )
    )
      .map()
      .orderBy(d => _.kebabCase(d.titre))
      .value();
  }

  let md = markdownFilms({
    header: cycleConfig,
    data: films
  });

  await helpers.writeFileInFolder(
    `${basePath}/${progDirectoryName}`,
    `${cycleFullCode[0]} ${cycleFullCode[1]}`,
    `${cycleFullCode[0]}_FILMS${isDef ? "_DEF" : ""} ${cycleFullCode[1]}.md`,
    md,
    "utf8"
  );

  if (isDef) {
    let success = await helpers.deleteFile(
      `${basePath}/${progDirectoryName}`,
      `${cycleFullCode[0]} ${cycleFullCode[1]}`,
      `${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.md`
    );
    if (success) {
      console.log(
        `Fichier inutile supprimé : ${cycleFullCode[0]}_FILMS ${cycleFullCode[1]}.md`
      );
    }
  }
})();

// Scrape les pages film du site.
async function filmsFromSite(films) {
  let args = _(films)
    .map(f => [`http://www.cinematheque.fr/film/${f.idFilm}.html`, f.idFilm])
    .unzip()
    .value();
  let o = scraper.filterOK(await scraper.scrape(...args));

  o = _(o)
    .mapValues(v => {
      if (!!v) {
        let $ = cheerio.load(v);
        let text = $(".synopsys").html();
        return typeof text === "string"
          ? format.cudm(
              turndownService.turndown(text).replace(/(\r\n|\n|\r)/gi, " ")
            )
          : "";
      } else {
        return null;
      }
    })
    .value();

  // Place le texte dans une propriété texteSite.
  o = _(o)
    .mapValues(v => {
      return {
        texteSite: v
      };
    })
    .value();

  return o;
}
