/* Utilitaires partagés — aucun accès au DOM au chargement. */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});
  const U = (QC.U = {});

  U.echapper = function echapper(texte) {
    return String(texte == null ? '' : texte)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  U.attributHtml = function attributHtml(texte) {
    return String(texte == null ? '' : texte)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  U.melanger = function melanger(liste) {
    const copie = Array.from(liste);
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  };

  U.echantillon = function echantillon(liste, nombre) {
    return U.melanger(liste).slice(0, nombre);
  };

  U.choisir = function choisir(liste) {
    if (!Array.isArray(liste) || liste.length === 0) return null;
    return liste[Math.floor(Math.random() * liste.length)];
  };

  U.entier = function entier(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  };

  U.limiter = function limiter(valeur, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, valeur));
  };

  U.pluriel = function pluriel(nombre, singulier, plurielMot) {
    return `${nombre} ${nombre > 1 ? plurielMot || `${singulier}s` : singulier}`;
  };

  U.formaterTemps = function formaterTemps(secondes) {
    const valeur = Math.max(0, Math.ceil(Number(secondes) || 0));
    const minutes = Math.floor(valeur / 60);
    const reste = valeur % 60;
    return `${minutes}:${String(reste).padStart(2, '0')}`;
  };

  U.formaterDuree = function formaterDuree(millisecondes) {
    const secondes = Math.max(0, Math.round((Number(millisecondes) || 0) / 1000));
    if (secondes < 60) return `${secondes} s`;
    const minutes = Math.floor(secondes / 60);
    const reste = secondes % 60;
    return reste ? `${minutes} min ${reste} s` : `${minutes} min`;
  };

  U.identifiant = function identifiant(prefixe) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefixe || 'id'}-${window.crypto.randomUUID()}`;
    }
    return `${prefixe || 'id'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  };

  U.teinte = function teinte(texte) {
    let hash = 0;
    const valeur = String(texte || '');
    for (let i = 0; i < valeur.length; i += 1) {
      hash = (hash * 31 + valeur.charCodeAt(i)) % 360;
    }
    return hash;
  };

  U.normaliser = function normaliser(texte) {
    return String(texte || '')
      .toLocaleLowerCase('fr')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  U.codePosition = function codePosition(index, colonnes) {
    const colonnesEffectives = colonnes || 6;
    const colonne = index % colonnesEffectives;
    const ligne = Math.floor(index / colonnesEffectives);
    const lettre = String.fromCharCode(65 + colonne);
    return `${lettre}${ligne + 1}`;
  };

  U.depuisCodePosition = function depuisCodePosition(code, total, colonnes) {
    const correspondance = /^([A-F])([1-8])$/i.exec(String(code || '').trim());
    if (!correspondance) return -1;
    const colonne = correspondance[1].toUpperCase().charCodeAt(0) - 65;
    const ligne = Number(correspondance[2]) - 1;
    const index = ligne * (colonnes || 6) + colonne;
    return index >= 0 && index < total ? index : -1;
  };

  U.attendre = function attendre(millisecondes) {
    return new Promise((resolve) => window.setTimeout(resolve, millisecondes));
  };

  U.estStandalone = function estStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  };

  U.estIOS = function estIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  };

  U.prefereReduction = function prefereReduction() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  U.texteFrancais = function texteFrancais(texte) {
    return String(texte || '');
  };

  U.choisirDans = function choisirDans(liste, predicat) {
    const trouve = Array.from(liste).find(predicat);
    return trouve === undefined ? null : trouve;
  };
})();
