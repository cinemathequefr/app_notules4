/**
 * replaceAnsiByEntities
 * @param txt {string}
 * @returns {string} Chaîne remplacée.
 * Remplace des caractères non-ANSI par les entités UTF-16 correspondantes.
 * Utiliser quand on doit enregister un texte au format win-1252.
 */
module.exports = (txt) => {
  let o = txt;
  // Remplacement par le code correspondant en représentation UTF-16 (hex)
  o = o.replace(/Œ/g, "<0x0152>");
  o = o.replace(/œ/g, "<0x0153>");
  o = o.replace(/–/g, "<0x2013>"); // Demi-cadratin (&ndash;)
  o = o.replace(/—/g, "<0x2014>"); // Cadratin (&mdash;)

  // Glyphes non-ANSI (tchèque, polonais)
  o = o.replace(/Ą/g, "<0x0104>");
  o = o.replace(/ą/g, "<0x0105>");
  o = o.replace(/Ć/g, "<0x0106>");
  o = o.replace(/ć/g, "<0x0107>");
  o = o.replace(/Ę/g, "<0x0118>");
  o = o.replace(/ę/g, "<0x0119>");
  o = o.replace(/Ł/g, "<0x0141>");
  o = o.replace(/ł/g, "<0x0142>");
  o = o.replace(/Ś/g, "<0x015A>");
  o = o.replace(/ś/g, "<0x015B>");
  o = o.replace(/Ż/g, "<0x017B>");
  o = o.replace(/ż/g, "<0x017C>");
  o = o.replace(/Č/g, "<0x010c>");
  o = o.replace(/Ď/g, "<0x010E>");
  o = o.replace(/Ě/g, "<0x011A>");
  o = o.replace(/Ň/g, "<0x0147>");
  o = o.replace(/Ř/g, "<0x0158>");
  o = o.replace(/Š/g, "<0x0160>");
  o = o.replace(/Ť/g, "<0x0164>");
  o = o.replace(/Ů/g, "<0x016E>");
  o = o.replace(/Ž/g, "<0x017D>");
  o = o.replace(/č/g, "<0x010D>");
  o = o.replace(/ď/g, "<0x010F>");
  o = o.replace(/ě/g, "<0x011B>");
  o = o.replace(/ň/g, "<0x0148>");
  o = o.replace(/ř/g, "<0x0159>");
  o = o.replace(/š/g, "<0x0161>");
  o = o.replace(/ť/g, "<0x0165>");
  o = o.replace(/ů/g, "<0x016F>");
  o = o.replace(/ž/g, "<0x017E>");

  return o;
};
