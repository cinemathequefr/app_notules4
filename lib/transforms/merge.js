const _ = require("lodash");

/**
 * mergeFilmsSeances
 * @description
 * Fusionne les données de films et de séances d'un cycle (aka _MERGE).
 * @param {Object} cycleConfig Objet de configuration du cycle : { idProg, idCycleProg, titreCycle, sousCycles: [{ titre, cats: [], tri }]}.
 * @param {Array} films Données : films du cycle (aka _FILMS)
 * @param {Array} seances Données : séances du cycle (aka _SEANCES)
 * @param {Array} confs Données : séances du cycle (aka _CONFS)
 * @param {Object} textes Données : textes associés au cycle et aux catégories du cycle (aka _TEXTS)
 * @returns {Object} Objet {data, info} : les données de cycle fusionnées, et (TODO) des informations sur le déroulement de la fusion (en particulier s'il faut patcher les films).
 */
function mergeFilmsSeances(cycleConfig, films, seances, confs, texts) {
  let filmsInSeances = _(seances)
    .filter(d => d.typeEvenement === 13)
    .map(d =>
      _(d.items)
        .map(e => e.idFilm)
        .value()
    )
    .flatten()
    .uniq()
    .sort()
    .value();

  let filmsInFilms = _(films)
    .map(d => d.idFilm)
    .sort()
    .value();

  let cycle = []; // Données du cycle = fusion des séances dans les films.
  let info = {}; // Informations renvoyées par l'opération (cohérence, id de films à compléter).

  // Vérification de la cohérence des deux fichiers avant fusion
  // Note: Cette vérification est nécessaire car le fichier films.json sera généralement généré (pour corrections) bien avant le fichier seances.json.
  // Il faudra pouvoir mettre à jour film.json en ajoutant (ou retirant) des films pour retrouver la cohérence avec les séances.
  console.log(`Les données films contiennent ${filmsInFilms.length} films.`);
  console.log(
    `Les données séances référencent ${filmsInSeances.length} films.`
  );

  let diffFilmsSeances = _.difference(filmsInFilms, filmsInSeances);
  let diffSeancesFilms = _.difference(filmsInSeances, filmsInFilms);

  // console.log(`filmsInFilms:${JSON.stringify(filmsInFilms)}`);
  // console.log(`filmsInSeances:${JSON.stringify(filmsInSeances)}`);
  // console.log(`diffSeancesFilms:${JSON.stringify(diffSeancesFilms)}`);
  // console.log(`diffFilmsSeances:${JSON.stringify(diffFilmsSeances)}`);

  if (diffFilmsSeances.length === 0 && diffSeancesFilms.length === 0) {
    console.log("Les données sont cohérentes.");
  } else {
    console.log("Les données ne sont pas cohérentes.");
    if (diffFilmsSeances.length > 0) {
      // Cas bénin, il suffit d'ignorer les films concernés
      console.log(
        `Info : aucune séance n'a été trouvée pour les films suivants : ${diffFilmsSeances.join(
          ", "
        )}`
      );
    }
    if (diffSeancesFilms.length > 0) {
      // Il faudra pouvoir patcher films.json avec les données manquantes
      console.log(
        `Attention : les films suivants ont des séances mais pas de données les concernant : ${diffSeancesFilms.join(
          ", "
        )}`
      );
    }
  }

  // Séances : on crée une entrée par item de séance combinant en-tête + données d'item.
  let seancesFilms = _(seances)
    .filter(d => d.typeEvenement === 13)
    .map(d => {
      let header = _(d)
        .omit("items")
        .value();
      return _(d.items)
        .map(e =>
          _({})
            .assign(e, header)
            .value()
        )
        .value();
    })
    .flatten()
    .value();

  films = _(films)
    .groupBy("idFilm")
    .mapValues(e => e[0])
    .value();

  // TODO : raccrocher à l'expression lodash supra
  seancesFilms = _(seancesFilms)
    .groupBy("idFilm")
    .mapValues(e => {
      return {
        seance: e
      };
    })
    .value();

  let cycleFilms = _.merge(films, seancesFilms);

  let seancesConfs = _(seances)
    .filter(d => d.typeEvenement === 14)
    .map(d => {
      let header = _(d)
        .omit("items")
        .value();
      return _(d.items)
        .map(e =>
          _({})
            .assign(e, header)
            .value()
        )
        .value();
    })
    .flatten()
    .groupBy("idEvenement")
    .mapValues(e => {
      return {
        seance: e
      };
    })
    .value();

  confs = _(confs)
    .groupBy("idEvenement")
    .mapValues(e => e[0])
    .value();

  let cycleConfs = _.merge(confs, seancesConfs);

  cycle = _.concat(_.map(cycleFilms), _.map(cycleConfs));

  // Tri des textes films à l'intérieur des items
  cycle = _(cycle)
    .map(d =>
      _({})
        .assign(d, {
          textes: _(d.textes)
            .orderBy(e => _.indexOf([9, 99, 8, 156, 114], e.typeTexte))
            .value()
        })
        .value()
    )
    .value();

  cycle = _(cycle)
    .map(d =>
      _({})
        .assign(
          {
            idCategorie: _(d)
              .thru(e => {
                try {
                  return e.seance[0].idCategorie;
                } catch (err) {
                  return null;
                }
              })
              .value()
          },
          d
        )
        .value()
    )
    .value();

  // Répartition par sous-cycle (en suivant l'ordre indiqué par cycleConfig)
  cycle = _(cycleConfig.sousCycles)
    .map(d => {
      return {
        titreSousCycle: d.titre,
        tri: d.tri,
        items: _(d.cats)
          .map(
            e =>
              _(cycle)
                .groupBy("idCategorie")
                .value()[e]
          )
          .filter(e => !_.isUndefined(e))
          .flatten()
          .orderBy("titre")
          .value()
      };
    })
    .value();

  // Crée une entrée par item de séance (mise à plat)
  cycle = _(cycle)
    .map(d =>
      _({})
        .assign(d, {
          items: _(d.items)
            .map(e =>
              _(e.seance)
                .map(f =>
                  _({})
                    .assign(f, e)
                    .value()
                )
                .value()
            )
            .sortBy("titre", "dateHeure")
            .flatten()
            .value()
        })
        .value()
    )
    .value();

  // Réorganisation des propriétés
  cycle = _(cycle)
    .map(d =>
      _({})
        .assign(d, {
          items: _(d.items)
            .map(e =>
              _(e)
                .pick(
                  "idSeance",
                  "ordre",
                  "dateHeure",
                  "idSalle",
                  "mention",
                  "typeAssoc",
                  "idSeanceAssoc",
                  "idCategorie",
                  "idEvenement",
                  "typeEvenement",
                  "titreEvenement",
                  "idTypeConference",
                  "typeConference",
                  "idFilm",
                  "art",
                  "titre",
                  "sousTitre", // Pour action culturelle
                  "artVo",
                  "titreVo",
                  "realisateurs",
                  "annee",
                  "pays",
                  // "idCopie",
                  "duree",
                  "version",
                  "format",
                  "ageMinimal",
                  "generique",
                  "adaptation",
                  "textes",
                  "intervenants",
                  "mentionAnimation"
                  // "valide"
                )
                .value()
            )
            .value()
        })
        .value()
    )
    .value();

  // Ajout des textes de sous-cycles
  // Place au niveau de chaque sous-cycle une propriété `texts` contenant un tableau
  // les textes (`texts.cats`) associés aux catégories du sous-cycle.
  // Voir journal 2019-10-18
  cycle = _(cycle)
    .map(d => {
      return _(d)
        .assign({
          textes: _(d.items)
            .map(e => e.idCategorie)
            .uniq()
            .flatten()
            .map(e => texts.cats[e])
            .filter()
            .flatten()
            .value()
        })
        .value();
    })
    .value();

  return {
    data: cycle,
    info: info
    // , texts: [] // TODO: textes associés au cycle
  };
}

module.exports = mergeFilmsSeances;
