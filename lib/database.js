const Firebird = require("node-firebird");

/**
 * attach
 * Ouvre une connexion à une base de données et renvoie une instance.
 * @param {Object} options Objet de connexion.
 * @returns {Object} Instance de base de données.
 */
function attach(options) {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (db) {
        resolve(db);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * detach
 * Ferme la connexion à une base de données.
 * @param {Object} db Instance de base de données.
 */
function detach(db) {
  try {
    db.detach(err => {
      if (err) throw err;
    });
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  attach: attach,
  detach: detach
}