const _ = require("lodash");
const format = require("../format.js");

/**
 * render
 * Transforme des données de cycle (_MERGE) en données _RENDER.
 * @param {Array} cycle Données JSON de cycle.
 * @returns {Array} Données JSON de cycle formatées pour rendu.
 */
function render(cycle) {
  cycle = _(cycle).map(d => _(d).pick(["titreSousCycle", "tri", "textes"]).assign({
    // cycle = _(cycle).map(d => _(d).pick(["titreSousCycle", "tri"]).assign({
    items: _(d.items).thru(items => {
      let tri = d.tri;

      // Mode de tri 1 : films (triés alphabétiquement par titre), avec éventuelles indications "précédé de / suivi de".
      if (tri === 1) {
        return _(items)
          .groupBy("idFilm")
          .map(d =>
            _(d[0])
            .pick([
              "idCycle",
              "idFilm",
              "titre",
              "art",
              "titreVo",
              "artVo",
              "realisateurs",
              "annee",
              "pays",
              "textes",
              "adaptation",
              "generique",
              "duree",
              "format",
              "version",
              "ageMinimal"
            ])
            .assign({
              seance: _(d)
                .map(e =>
                  _(e)
                  .pick([
                    "idSeance",
                    "ordre",
                    "idEvenement",
                    "titreEvenement",
                    "dateHeure",
                    "idSalle",
                    "mention"
                  ])
                  .thru(e => {
                    let precedeSuivi = format.precedeSuivi(
                      _(items)
                      .filter(
                        f => f.idSeance === e.idSeance && f.ordre < e.ordre
                      )
                      .thru(g =>
                        g.length > 0 ?
                        _(g)
                        .map(g =>
                          _(g)
                          .pick(["idFilm", "titre", "art", "realisateurs"])
                          .value()
                        )
                        .value() :
                        null
                      )
                      .value(),
                      _(items)
                      .filter(
                        f => f.idSeance === e.idSeance && f.ordre > e.ordre
                      )
                      .thru(g =>
                        g.length > 0 ?
                        _(g)
                        .map(g =>
                          _(g)
                          .pick(["idFilm", "titre", "art", "realisateurs"])
                          .value()
                        )
                        .value() :
                        null
                      )
                      .value()
                    );
                    return precedeSuivi === "" ? e : _(e).assign({
                      precedeSuivi: precedeSuivi
                    }).value();
                  })
                  .value()
                )
                .value()
            })
            // Factorise les mentions precedeSuivi lorsque c'est possible
            .thru(d => {
              if (_(d.seance).every(e => e.precedeSuivi === d.seance[0].precedeSuivi) && !_.isUndefined(d.seance[0].precedeSuivi)) {
                return _({}).assign(d, {
                  precedeSuivi: d.seance[0].precedeSuivi,
                  seance: _(d.seance).map(e => _(e).omit(["precedeSuivi"]).value()).value()
                }).value();
              } else {
                return d;
              }
            })
            .value()
          )
          .orderBy(t => [_.kebabCase(t.titre), t.annee])
          .value();
      }

      // Mode de tri 2 : événements (triés alphabétiquement par titre du premier film), avec pour chacun films triés par rang puis séances triées par date
      // Mode de tri 3 : événements (triés alphabétiquement par titre d'événement), avec pour chacun films triés par rang puis séances triées par date
      // Mode de tri 4 : événements (triés par date de première séance), avec pour chacun films triés par rang puis séances triées par date
      if (tri === 2 || tri === 3 || tri === 4) {
        return _(items)
          .groupBy("idEvenement")
          .map(d =>
            _(d[0])
            .pick(["idCycle", "idCategorie", "idEvenement", "titreEvenement"])
            .assign({
              films: _(d)
                .groupBy(d => d.idFilm)
                .map(e =>
                  _(e[0])
                  .pick([
                    "idFilm",
                    "titre",
                    "art",
                    "titreVo",
                    "artVo",
                    "realisateurs",
                    "annee",
                    "pays",
                    "textes",
                    "adaptation",
                    "generique",
                    "duree",
                    "format",
                    "version",
                    "ageMinimal",
                    "ordre"
                  ])
                  .value()
                )
                .orderBy("ordre")
                .value(),
              seance: _(d)
                .groupBy(d => d.idSeance)
                .map(e =>
                  _(e[0])
                  .pick(["dateHeure", "idSalle", "mention"])
                  .value()
                )
                .orderBy("dateHeure")
                .value()
            })
            .value()
          )
          .thru(d => {
            if (tri === 2) {
              return _(d)
                .orderBy([e => _.kebabCase(e.films[0].titre), e => parseInt(/(\d+)/.exec(e.titreEvenement))])
                .value();
            }
            if (tri === 3) {
              return _(d)
                .orderBy([e => parseInt(/(\d+)/.exec(e.titreEvenement)), e => _.kebabCase(e.films[0].titre)])
                .value();
            }
            if (tri === 4) {
              return _(d)
                .orderBy(e => e.seance[0].dateHeure)
                .value();
            }
          })
          .value();
      }

    }).value()
  }).value()).value();

  return cycle;
}

module.exports = render;