import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  cents,
  clientDisplayName,
  computeLineTotals,
  computeTotalsFromTtc,
  csvCell,
  csvDocument,
  isDate,
  lineTotal,
  money,
  parseLines,
  today,
} from "../lib/core.js";

test("les totaux de lignes sont calculés en centimes", () => {
  const totals = computeLineTotals(
    [
      { description: "Cours", qty: 2, prix_ht: 50 },
      { description: "Déplacement", qty: 1, prix_ht: 0.1 },
    ],
    21
  );
  assert.equal(totals.ht, 100.1);
  assert.equal(totals.tva, 21.02);
  assert.equal(totals.ttc, 121.12);
});

test("100,00 € TTC à 21 % reste 100,00 € TTC", () => {
  const totals = computeTotalsFromTtc(100, 21);
  assert.equal(totals.ht, 82.64);
  assert.equal(totals.tva, 17.36);
  assert.equal(totals.ttc, 100);
});

test("la TVA à 0 % ne produit pas de centime fantôme", () => {
  const totals = computeLineTotals([{ description: "Forfait", qty: 1, prix_ht: 1450 }], 0);
  assert.equal(totals.ht, 1450);
  assert.equal(totals.tva, 0);
  assert.equal(totals.ttc, 1450);
});

test("parseLines ignore les lignes vides et borne les valeurs", () => {
  const lines = parseLines([
    { description: "  Site web  ", qty: "1", prix_ht: "1450.005" },
    { description: "", qty: 0, prix_ht: 0 },
    { description: "Négatif", qty: -2, prix_ht: -10 },
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].description, "Site web");
  assert.equal(lines[0].prix_ht, 1450.01);
  assert.equal(lines[1].qty, 0);
  assert.equal(lines[1].prix_ht, 0);
});

test("lineTotal gère une quantité nulle", () => {
  assert.equal(lineTotal({ qty: 0, prix_ht: 100 }), 0);
  assert.equal(lineTotal({ qty: 1.5, prix_ht: 100 }), 150);
});

test("les dates restent en Europe/Bruxelles", () => {
  assert.match(today(new Date("2026-11-16T23:30:00Z")), /^2026-11-17$/);
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2026-02-28"), true);
});

test("les montants passent par des centimes entiers", () => {
  assert.equal(cents("82.64"), 8264);
  assert.equal(money(-5), 0);
});

test("le nom client ne répète pas la société", () => {
  assert.equal(clientDisplayName("Brasserie du Canal", "Brasserie du Canal SRL"), "Brasserie du Canal SRL");
  assert.equal(clientDisplayName("Julie Lambert", ""), "Julie Lambert");
  assert.equal(clientDisplayName("Julie", "Lambert SRL"), "Julie — Lambert SRL");
});

test("le CSV est sûr (point-virgule, guillemets, formules)", () => {
  assert.equal(csvCell("Rue; 1"), '"Rue; 1"');
  assert.equal(csvCell('Guil"lemets'), '"Guil""lemets"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+32 470"), "'+32 470");
  const csv = csvDocument(["nom", "adresse"], [["Dupont", "Rue; 1\n7180 Seneffe"]]);
  assert.ok(csv.startsWith("\uFEFFnom;adresse"));
  assert.ok(csv.includes('"Rue; 1\n7180 Seneffe"'));
});
