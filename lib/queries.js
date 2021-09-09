/**
 * seancesFilmsFromCats
 * Construit une requête renvoyant des données sur toutes les séances rattachées à une ou plusieurs catégories.
 * @param {Array|integer} _idCats ID de catégorie ou tableau d'IDs de catégories.
 * @returns {string} Requête sql.
 */
function seancesFilmsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1); // Pour passer à l'opérateur sql IN(), convertit un tableau de paramètre en chaîne, en retirant les crochets.
  let idProg = params[1];
  return `
    SELECT DISTINCT
      prog_affect_evenement_categorie.idcategorie AS id_categorie,
      prog_evenement.type_evenement               AS type_evenement,
      prog_affect_evenement_categorie.idevenement AS id_evenement,
      prog_assoc_film_evenement.idfilm            AS id_film,
      prog_seance.idseance                        AS id_seance,
      prog_assoc_film_evenement.ordre             AS ordre,
      prog_seance.date_debut                      AS date_heure,
      prog_seance.idespace                        AS id_salle,
      prog_seance_type.type_seance                AS type_seance,
      prog_evenement.libelle                      AS titre_evenement,
      CASE
        WHEN prog_seance.idseance = prog_assoc_seances.idseance_1 THEN prog_assoc_seances.idseance_2
        WHEN prog_seance.idseance = prog_assoc_seances.idseance_2 THEN prog_assoc_seances.idseance_1
      END                                         AS id_seance_assoc,
      prog_assoc_seances.association              AS type_assoc
    FROM              prog_assoc_film_evenement
    INNER JOIN      prog_seance
    ON              prog_seance.idevenement = prog_assoc_film_evenement.idevenement
    INNER JOIN      prog_affect_evenement_categorie
    ON              prog_affect_evenement_categorie.idevenement = prog_seance.idevenement
    INNER JOIN      prog_categorie
    ON              prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
    INNER JOIN      prog_cycle
    ON              prog_categorie.idcycle = prog_cycle.idcycle
    INNER JOIN      prog_affect_cycle_programme
    ON              prog_affect_cycle_programme.idcycle = prog_cycle.idcycle
    LEFT JOIN       prog_seance_type
    ON              prog_seance_type.idseance = prog_seance.idseance
    INNER JOIN      prog_evenement
    ON              prog_affect_evenement_categorie.idevenement = prog_evenement.idevenement
    LEFT JOIN       prog_assoc_seances
    ON              (prog_assoc_seances.idseance_1 = prog_seance.idseance OR prog_assoc_seances.idseance_2 = prog_seance.idseance)
    WHERE           prog_affect_evenement_categorie.idcategorie IN (${idCats})
    AND             prog_seance.idprogramme = ${idProg}
    AND             prog_evenement.type_evenement = 13
    AND             prog_seance.statut = 1
    ORDER BY        prog_seance.date_debut,
                    prog_assoc_film_evenement.ordre
  `;
}

/**
 * seancesCopiesFromCats
 * Construit une requête renvoyant des données sur les copies validées de toutes les séances validées rattachées à une ou plusieurs catégories.
 * @param {Array|integer} _idCats ID de catégorie ou tableau d'IDs de catégories.
 * @returns {string} Requête sql.
 */
function seancesCopiesFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT prog_assoc_film_evenement.idfilm  AS id_film,
    prog_seance.idseance                              AS id_seance,
    prog_affect_copie_evenement.idcopie               AS id_copie,
    prog_copie.duree                                  AS duree,
    prog_copie.version_film                           AS version,
    prog_copie.sous_titres                            AS sous_titres,
    prog_copie.intertitre                             AS intertitres,
    prog_copie.format                                 AS format,
    prog_affect_copie_evenement.sous_titrage_demande  AS st_demande
    FROM            prog_assoc_film_evenement
    INNER JOIN    prog_seance
    ON            prog_seance.idevenement = prog_assoc_film_evenement.idevenement
    INNER JOIN    prog_affect_evenement_categorie
    ON            prog_affect_evenement_categorie.idevenement = prog_seance.idevenement
    INNER JOIN    prog_affect_copie_evenement
    ON            prog_affect_copie_evenement.idevenement = prog_seance.idevenement
      AND         prog_assoc_film_evenement.idfilm = prog_affect_copie_evenement.idfilm
    INNER JOIN    prog_copie
    ON            prog_affect_copie_evenement.idcopie = prog_copie.idcopie
    WHERE         prog_seance.statut = 1
    AND           prog_affect_evenement_categorie.idcategorie IN (${idCats})
    AND           prog_seance.idprogramme = ${idProg}
    ORDER BY      prog_seance.date_debut,
                  prog_assoc_film_evenement.ordre
  `;
}

/**
 * seancesMentionsFromCats
 * Construit une requête renvoyant les données des mentions de toutes les séances validées rattachées à une ou plusieurs catégories.
 * @param {Array|integer} _idCats ID de catégorie ou tableau d'IDs de catégories.
 * @returns {string} Requête sql.
 */
function seancesMentionsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT        prog_affect_evenement_categorie.idcategorie AS id_categorie,
                  prog_assoc_pers_seance.idseance             AS id_seance,
                  prog_assoc_pers_seance.idpersonne           AS id_personne,
                  prog_assoc_pers_seance.ordre                AS ordre,
                  pers_gen.nom                                AS nom,
                  pers_gen.particule                          AS particule,
                  pers_gen.prenom                             AS prenom,
                  prog_assoc_pers_seance.fonction             AS mention_seance,
                  prog_assoc_pers_seance.note                 AS note
    FROM          prog_assoc_pers_seance
      INNER JOIN  pers_gen
      ON          prog_assoc_pers_seance.idpersonne = pers_gen.pk
      INNER JOIN  prog_seance
      ON          prog_assoc_pers_seance.idseance = prog_seance.idseance
      INNER JOIN  prog_affect_evenement_categorie
      ON          prog_seance.idevenement =
                  prog_affect_evenement_categorie.idevenement
    WHERE         prog_affect_evenement_categorie.idcategorie IN (${idCats})
    AND          prog_seance.idprogramme = ${idProg}
    AND          prog_seance.statut = 1
    ORDER BY      prog_assoc_pers_seance.idseance,
                  prog_assoc_pers_seance.ordre
  `;
}

/**
 * seancesConfsFromCats
 * Construit une requête renvoyant les données des séances de type conférence.
 */
function seancesConfsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT prog_affect_evenement_categorie.idcategorie AS id_categorie,
                    prog_evenement.type_evenement               AS type_evenement,
                    prog_affect_evenement_categorie.idevenement AS id_evenement,
                    prog_seance.idseance                        AS id_seance,
                    prog_seance.date_debut                      AS date_heure,
                    prog_seance.idespace                        AS id_salle,
                    prog_seance_type.type_seance                AS type_seance,
                    prog_evenement.libelle                      AS titre_evenement,
                    CASE
                                    WHEN prog_seance.idseance = prog_assoc_seances.idseance_1 THEN prog_assoc_seances.idseance_2
                                    WHEN prog_seance.idseance = prog_assoc_seances.idseance_2 THEN prog_assoc_seances.idseance_1
                    END                            AS id_seance_assoc,
                    prog_assoc_seances.association AS type_assoc
    FROM            prog_seance
    INNER JOIN      prog_affect_evenement_categorie
    ON              prog_affect_evenement_categorie.idevenement = prog_seance.idevenement
    INNER JOIN      prog_categorie
    ON              prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
    INNER JOIN      prog_cycle
    ON              prog_categorie.idcycle = prog_cycle.idcycle
    INNER JOIN      prog_affect_cycle_programme
    ON              prog_affect_cycle_programme.idcycle = prog_cycle.idcycle
    LEFT JOIN       prog_seance_type
    ON              prog_seance_type.idseance = prog_seance.idseance
    INNER JOIN      prog_evenement
    ON              prog_affect_evenement_categorie.idevenement = prog_evenement.idevenement
    LEFT JOIN       prog_assoc_seances
    ON              (
                                    prog_assoc_seances.idseance_1 = prog_seance.idseance
                    OR              prog_assoc_seances.idseance_2 = prog_seance.idseance)
    WHERE           prog_affect_evenement_categorie.idcategorie IN (${idCats})
    AND             prog_seance.idprogramme = ${idProg}
    AND             prog_seance.statut = 1
    AND             prog_evenement.type_evenement = 14
    ORDER BY        prog_seance.date_debut
  `;
}

/**
 * filmsFromCats
 */
function filmsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT        prog_assoc_film_evenement.idfilm                    AS  id_film,
                  ved_film.article_tf                                 AS  art_fr,
                  ved_film.titre_francais                             AS  titre_fr,
                  prog_film_programmation.art_titre_francais_special  AS  art_fr_mod,
                  prog_film_programmation.titre_francais_special      AS  titre_fr_mod,
                  prog_film_programmation.age_minimal                 AS  age_minimal,
                  ved_film.article_to                                 AS  art_vo,
                  ved_film.titre_original                             AS  titre_vo,
                  ved_film.realisateurs                               AS  realisateurs,
                  ved_film.annee_production                           AS  annee,
                  ved_film.fk_pays                                    AS  pays
    FROM          prog_assoc_film_evenement
      INNER JOIN  prog_affect_evenement_categorie
      ON          prog_affect_evenement_categorie.idevenement = prog_assoc_film_evenement.idevenement
      INNER JOIN  prog_categorie
      ON          prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
      INNER JOIN  ved_film
      ON          prog_assoc_film_evenement.idfilm = ved_film.pk
      INNER JOIN  prog_film_programmation
      ON          prog_film_programmation.idfilm = ved_film.pk
      INNER JOIN  prog_affect_cycle_programme
      ON          prog_affect_cycle_programme.idcycle = prog_categorie.idcycle
    WHERE         prog_categorie.idcategorie IN (${idCats})
    AND           prog_affect_cycle_programme.idprogramme = ${idProg}
  `;
}

/**
 * filmsTextesFromCats
 */
function filmsTextesFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT prog_assoc_film_texte.idfilm               AS id_film,
                    prog_categorie.idcycle                     AS id_cycle,
                    prog_textepresentation.idtextepresentation AS id_texte,
                    prog_textepresentation.type_texte          AS type_texte,
                    prog_assoc_film_texte.ordre                AS ordre,
                    prog_textepresentation.contenu             AS texte
    FROM            prog_assoc_film_texte
      INNER JOIN    prog_textepresentation
      ON            prog_assoc_film_texte.idtextepresentation = prog_textepresentation.idtextepresentation
      INNER JOIN    prog_affect_texte_evenement
      ON            prog_affect_texte_evenement.idtextepresentation = prog_textepresentation.idtextepresentation
      INNER JOIN    prog_affect_evenement_categorie
      ON            prog_affect_evenement_categorie.idevenement = prog_affect_texte_evenement.idevenement
      INNER JOIN    prog_categorie
      ON            prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
      INNER JOIN    prog_affect_cycle_programme
      ON            prog_categorie.idcycle = prog_affect_cycle_programme.idcycle
    WHERE           prog_categorie.idcategorie IN (${idCats})
    AND             prog_affect_cycle_programme.idprogramme = ${idProg}
    ORDER BY        prog_assoc_film_texte.idfilm,
                    prog_textepresentation.type_texte,
                    prog_textepresentation.idtextepresentation DESC
  `;
}

/**
 * filmsGeneriquesFromCats
 * Utilise la table de surcharge `prog_assoc_film_personne` au lieu de `generiques` précédemment).
 */
function filmsGeneriquesFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
  SELECT
    prog_assoc_film_evenement.idfilm AS id_film,
    pers_gen.nom AS nom,
    pers_gen.particule AS particule,
    pers_gen.prenom AS prenom,
    prog_assoc_film_personne.ordre AS ordre
  FROM
    prog_assoc_film_evenement
    INNER JOIN prog_affect_evenement_categorie ON prog_affect_evenement_categorie.idevenement = prog_assoc_film_evenement.idevenement
    INNER JOIN prog_categorie ON prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
    INNER JOIN ved_film ON prog_assoc_film_evenement.idfilm = ved_film.pk
    INNER JOIN prog_assoc_film_personne ON prog_assoc_film_personne.idfilm = ved_film.pk
    INNER JOIN pers_gen ON prog_assoc_film_personne.idpersonne = pers_gen.pk
    INNER JOIN prog_affect_cycle_programme ON prog_affect_cycle_programme.idcycle = prog_categorie.idcycle
  WHERE
    prog_categorie.idcategorie IN (${idCats}) AND
    prog_affect_cycle_programme.idprogramme = ${idProg}
  `;
}

/**
 * filmsAdaptationsFromCats
 */
function filmsAdaptationsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT        ved_film.pk AS id_film,
                  pers_gen.prenom AS prenom,
                  pers_gen.particule AS particule,
                  pers_gen.nom AS nom,
                  generiques.note AS mention
    FROM          ved_film
      INNER JOIN  generiques
      ON          generiques.fk_collection = ved_film.pk
      INNER JOIN  pers_gen
      ON          generiques.fk_personne = pers_gen.pk
      INNER JOIN  prog_assoc_film_evenement
      ON          prog_assoc_film_evenement.idfilm = ved_film.pk
      INNER JOIN  prog_evenement
      ON          prog_assoc_film_evenement.idevenement = prog_evenement.idevenement
      INNER JOIN  prog_affect_evenement_categorie
      ON          prog_affect_evenement_categorie.idevenement = prog_evenement.idevenement
      INNER JOIN  prog_categorie
      ON          prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
      INNER JOIN  prog_affect_cycle_programme
      ON          prog_affect_cycle_programme.idcycle = prog_categorie.idcycle
      WHERE       generiques.note LIKE '%après%"%"%'
      AND         generiques.fk_fonction = 5
      AND         prog_categorie.idcategorie IN (${idCats})
      AND         prog_affect_cycle_programme.idprogramme = ${idProg}
    ORDER BY      generiques.note
  `;
}

/**
 * confsFromCats
 */
function confsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT 
                    prog_affect_evenement_categorie.idcategorie AS id_categorie,
                    prog_affect_evenement_categorie.idevenement AS id_evenement,
                    prog_evenement.libelle                      AS titre,
                    prog_evenement.duree                        AS duree,
                    prog_evenement.sous_type_evenement          AS id_type_conference,
                    prog_dictionnaire_valeur.libelle            AS type_conference
    FROM            prog_affect_evenement_categorie
      INNER JOIN    prog_categorie
      ON            prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
      INNER JOIN    prog_cycle
      ON            prog_categorie.idcycle = prog_cycle.idcycle
      INNER JOIN    prog_affect_cycle_programme
      ON            prog_affect_cycle_programme.idcycle = prog_cycle.idcycle
      INNER JOIN    prog_evenement
      ON            prog_affect_evenement_categorie.idevenement = prog_evenement.idevenement
      INNER JOIN    prog_dictionnaire_valeur
      ON            prog_dictionnaire_valeur.iddictionnaire_valeur = prog_evenement.sous_type_evenement
    WHERE           prog_affect_evenement_categorie.idcategorie IN (${idCats})
    AND             prog_affect_cycle_programme.idprogramme = ${idProg}
    AND             prog_evenement.type_evenement = 14
  `;
}

function confsTextesFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT
                    prog_evenement.idevenement                 AS id_evenement,
                    prog_textepresentation.idtextepresentation AS id_texte,
                    prog_textepresentation.type_texte          AS type_texte,
                    prog_textepresentation.contenu             AS texte
    FROM            prog_textepresentation
      INNER JOIN    prog_affect_texte_evenement
      ON            prog_affect_texte_evenement.idtextepresentation = prog_textepresentation.idtextepresentation
      INNER JOIN    prog_affect_evenement_categorie
      ON            prog_affect_evenement_categorie.idevenement = prog_affect_texte_evenement.idevenement
      INNER JOIN    prog_categorie
      ON            prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
      INNER JOIN    prog_affect_cycle_programme
      ON            prog_categorie.idcycle = prog_affect_cycle_programme.idcycle
      INNER JOIN    prog_evenement
      ON            prog_affect_texte_evenement.idevenement = prog_evenement.idevenement
    WHERE           prog_categorie.idcategorie IN (${idCats})
    AND             prog_affect_cycle_programme.idprogramme = ${idProg}
    AND             prog_evenement.type_evenement = 14
  `;
}

/**
 * confsPersonsFromCats
 */
function confsPersonsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  let idProg = params[1];
  return `
    SELECT DISTINCT prog_evenement.idevenement            AS id_evenement,
                    prog_assoc_pers_evenement.idpersonne  AS id_personne,
                    pers_gen.nom                          AS nom,
                    pers_gen.particule                    AS particule,
                    pers_gen.prenom                       AS prenom,
                    prog_assoc_pers_evenement.fonction    AS id_fonction,
                    prog_dictionnaire_valeur.libelle      AS fonction,
                    prog_assoc_pers_evenement.ordre       AS ordre
    FROM            prog_evenement
    INNER JOIN      prog_affect_evenement_categorie
    ON              prog_affect_evenement_categorie.idevenement = prog_evenement.idevenement
    INNER JOIN      prog_categorie
    ON              prog_affect_evenement_categorie.idcategorie = prog_categorie.idcategorie
    INNER JOIN      prog_affect_cycle_programme
    ON              prog_affect_cycle_programme.idcycle = prog_categorie.idcycle
    INNER JOIN      prog_assoc_pers_evenement
    ON              prog_assoc_pers_evenement.idevenement = prog_evenement.idevenement
    INNER JOIN      pers_gen
    ON              prog_assoc_pers_evenement.idpersonne = pers_gen.pk
    INNER JOIN      prog_dictionnaire_valeur
    ON              prog_dictionnaire_valeur.iddictionnaire_valeur = prog_assoc_pers_evenement.fonction
    WHERE           prog_evenement.type_evenement = 14
    AND             prog_categorie.idcategorie IN (${idCats})
    AND             prog_affect_cycle_programme.idprogramme = ${idProg}
    ORDER BY        prog_evenement.idevenement,
                    prog_assoc_pers_evenement.ordre
  `;
}

/**
 * textsFromCats
 * Textes de catégories
 */
function textsFromCats(params) {
  let idCats = JSON.stringify(params[0]);
  idCats = idCats.substring(1, idCats.length - 1);
  return `
      SELECT prog_affect_texte_categorie.idcategorie  AS id_categorie,
      prog_textepresentation.type_texte               AS type_texte,
      prog_textepresentation.contenu                  AS texte
    FROM   prog_textepresentation
      INNER JOIN prog_affect_texte_categorie
              ON prog_affect_texte_categorie.idtextepresentation =
                prog_textepresentation.idtextepresentation
    WHERE  prog_affect_texte_categorie.idcategorie IN (${idCats})
      AND prog_affect_texte_categorie.validation = 1
    ORDER  BY prog_affect_texte_categorie.idcategorie,
        prog_textepresentation.idtextepresentation  
  `;
}

/**
 * textsFromCycle
 * En pratique, il s'agira d'un texte de type 263-remerciements.
 * Ajouter `AND prog_textepresentation.type_texte = 263` pour restreindre à ce type.
 * Attention : ici, on passe véritablement un idCycle (et pas un tableau d'idCategories).
 */
function textsFromCycle(params) {
  let idProg = params[1];
  let idCycle = params[0];
  return `
    SELECT            prog_affect_texte_cycle.idcycle   AS id_cycle,
                      prog_textepresentation.type_texte AS type_texte,
                      prog_textepresentation.contenu    AS texte
    FROM              prog_textepresentation
      INNER JOIN      prog_affect_texte_programme
      ON              prog_textepresentation.idtextepresentation = prog_affect_texte_programme.idtextepresentation
      INNER JOIN      prog_affect_texte_cycle
      ON              prog_affect_texte_programme.idtextepresentation = prog_affect_texte_cycle.idtextepresentation
      WHERE           prog_affect_texte_programme.idprogramme = ${idProg}
      AND             prog_affect_texte_cycle.idcycle = ${idCycle}
      ORDER BY        prog_affect_texte_cycle.idcycle
  `;
}

/**
 * catsFromCycle
 * Liste des catégories (idCategorie et titreCategorie)
 * Cette requête est imparfaite par rapport à ce que l'on voudrait, en raison d'une limitation de conception de la base de données.
 * Pour cette même raison, le critère de programme n'est pas exploitable.
 * Cette requête servira à vérifier la cohérence entre les catégories d'un cycle dans la base de données et celles du fichier de configuration de cycle.
 */
function catsFromCycle(params) {
  let idCycle = params[0];
  return `
    SELECT DISTINCT prog_categorie.idcategorie AS id_categorie,
                    prog_categorie.libelle     AS titre_categorie
    FROM            prog_categorie
      INNER JOIN    prog_affect_cycle_programme
      ON            prog_affect_cycle_programme.idcycle = prog_categorie.idcycle
    WHERE           prog_categorie.statut = 1
      AND           prog_categorie.idcycle = ${idCycle}
  `;
}

module.exports = {
  seancesFilmsFromCats: seancesFilmsFromCats,
  seancesConfsFromCats: seancesConfsFromCats,
  seancesCopiesFromCats: seancesCopiesFromCats,
  seancesMentionsFromCats: seancesMentionsFromCats,
  filmsFromCats: filmsFromCats,
  filmsTextesFromCats: filmsTextesFromCats,
  filmsGeneriquesFromCats: filmsGeneriquesFromCats,
  filmsAdaptationsFromCats: filmsAdaptationsFromCats,
  confsFromCats: confsFromCats,
  confsTextesFromCats: confsTextesFromCats,
  confsPersonsFromCats: confsPersonsFromCats,
  textsFromCats: textsFromCats,
  textsFromCycle: textsFromCycle,
  catsFromCycle: catsFromCycle,
};
