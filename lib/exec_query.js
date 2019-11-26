const _ = require("lodash");
const PQueue = require("p-queue"); // https://github.com/sindresorhus/p-queue
const queue = new PQueue({
  concurrency: 1
});
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();

/**
 * execQueryQueue
 * @description
 * Exécute une série de requêtes dans une queue.
 * Gère les champs de type BLOB, qui sont eux-même asynchrones.
 * @example
 * execQueryQueue(db, queries.films, [[315], [319], [330]]).
 * @param {object} db Objet base de données.
 * @param {function} query Fonction appelée avec les paramètres params et renvoyant une requête sql.
 * @param {array} params Paramètres pour la fonction `query`. Attention, double tableau. Le premier niveau correspond aux différentes requêtes, et le second niveaux aux différents paramètres de chaque requête.
 * @return {promise}
 */
function execQueryQueue(db, query, params) {
  var q = _(params)
    .map(queryParams => {
      return () =>
        new Promise((resolve, reject) => {
          db.query(query(queryParams), async (err, result) => {
            var blob = [];

            if (result) {
              var blobFields = _(result[0])
                .pickBy((v, k) => {
                  return typeof v === "function";
                })
                .keys()
                .value();

              _(result).forEach(row => {
                _(blobFields).forEach(field => {
                  blob.push(
                    new Promise((resolve, reject) => {
                      row[field]((err, name, e) => {
                        let dataLength = 0;
                        let data = [];
                        e.on("data", chunk => {
                          dataLength = dataLength + chunk.length;
                          data.push(chunk);
                        });
                        e.on("end", () => {
                          resolve(
                            row[field] = entities.decode(
                              Buffer.concat(data, dataLength).toString("utf8")
                            )
                          );
                        });
                      });
                    })
                  );
                });
              });
              // _(result).forEach(row => {
              //   _(blobFields).forEach(field => {
              //     blob.push(
              //       new Promise((resolve, reject) => {
              //         row[field]((err, name, e) => {
              //           e.on("data", chunk => {
              //             // TODO: probablement incorrect, il n'y a pas qu'un seul chunk
              //             resolve(
              //               (row[field] = entities.decode(
              //                 chunk.toString("utf8")
              //               ))
              //             );
              //           });
              //         });
              //       })
              //     );
              //   });
              // });

              await Promise.all(blob); // Attend que les promises de blobs soient résolues
              resolve(result);
            } else {
              reject(err);
            }
          });
        });
    })
    .value();

  return queue.addAll(q);
}

/**
 * execQuerySingle
 * @description
 * Exécute une requête.
 * Gère les champs de type BLOB, qui sont eux-même asynchrones.
 * Helper utilisant execQueryQueue pour une seule requête.
 * @example
 * execQuerySingle(db, queries.films, [315])
 * @param {object} db Objet base de données.
 * @param {function} query Fonction appelée avec les paramètres params et renvoyant une requête sql.
 * @param {array} params Paramètres pour la fonction `query`. Tableau (simple) des paramètres de la requête.
 * @return {promise}
 */
async function execQuerySingle(db, query, params) {
  try {
    let res = await execQueryQueue(db, query, [params]);
    return res[0];
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  queue: execQueryQueue,
  single: execQuerySingle
}