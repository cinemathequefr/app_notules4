const _ = require("lodash");

/**
 * cleanTitreEvenement
 * Nettoie titres d'événements (`titreEvenement`) pour un cycle, en éliminant les titres non voulus (correspondant aux titres des items de la séance).
 * Voir journal 30/01/2019.
 * @param {Object} cycle Données d'un cycle à l'étape _MERGE (de la forme : {data,info})
 * @returns {Object} Données du cycle après nettoyage des titres d'événement
 */
function cleanTitreEvenement(cycle) {


  // Construction de la liste des titres à conserver pour chaque `idEvenement`, p. ex. [{ 18618: "Programme de courts métrages" }]
  // NOTE : 2019-10-03 : modification test pour la rétrospective Godard
  let titres = _(cycle.data)
    .map(i => i.items)
    .flatten()
    .filter(d => d.ordre === 1)
    .map(d => [d.idEvenement, d.titre, d.titreEvenement])
    .uniqBy(d => d[0])
    .map(d => {
      numero = _.trim(d[2]).match(/\d+$/); // Cherche à matcher le numéro de programme à la fin de la chaîne `titreEvenement`.
      numero = numero ? `Programme ${numero[0]}` : "?";
      return [d[0], numero];
    })
    .filter(d => !!d[1])
    .keyBy(d => d[0])
    .mapValues(d => d[1])
    .value();

  // Construction de la liste des titres à conserver pour chaque `idEvenement`, p. ex. [{ 18618: "Programme de courts métrages" }]
  // let titres = _(cycle.data)
  //   .map(i => i.items)
  //   .flatten()
  //   .filter(d => d.ordre === 1)
  //   .map(d => [d.idEvenement, d.titre, d.titreEvenement])
  //   .uniqBy(d => d[0])
  //   .map(d => {
  //     let k1 = _.kebabCase(d[1]);
  //     let k2 = _.kebabCase(d[2]);
  //     return [d[0], k2.substring(0, k1.length) === k1 ? null : d[2]]
  //   })
  //   .filter(d => !!d[1])
  //   .keyBy(d => d[0])
  //   .mapValues(d => d[1])
  //   .value();

  // console.log(titres);

  // On affecte le titre ou on retire la propriété `idEvenement`.
  cycle.data = _(cycle.data).map(d => _(d).assign({
    items: _(d.items)
      .map(e =>
        _.isUndefined(titres[e.idEvenement]) ?
        _(e).omit("titreEvenement").value() :
        _(e).assign({
          titreEvenement: titres[e.idEvenement]
        }).value()
      ).value()
  }).value()).value();

  return cycle;
}

module.exports = cleanTitreEvenement;