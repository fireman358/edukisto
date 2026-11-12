"use strict";
/* ===== Météo — Open-Meteo (gratuit, sans clé, sans compte) ===== */

const METEO_CACHE_CLE = "ecalfam-meteo-cache";
const METEO_VILLE_CLE = "ecalfam-meteo-ville";
const METEO_DEFAUT = { nom: "Seneffe", lat: 50.4861, lon: 4.0736 };

const METEO_ICONS = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    56: "🌧️", 57: "🌧️",
    61: "🌦️", 63: "🌧️", 65: "🌧️",
    66: "🌧️", 67: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️", 77: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    85: "🌨️", 86: "🌨️",
    95: "⛈️", 96: "⛈️", 99: "⛈️"
};
const METEO_LIBELLES = {
    0: "Ciel dégagé", 1: "Peu nuageux", 2: "Partiellement nuageux", 3: "Couvert",
    45: "Brouillard", 48: "Brouillard givrant",
    51: "Bruille légère", 53: "Bruille", 55: "Bruille dense",
    56: "Bruille verglaçante", 57: "Bruille verglaçante dense",
    61: "Pluie légère", 63: "Pluie", 65: "Pluie forte",
    66: "Pluie verglaçante", 67: "Pluie verglaçante forte",
    71: "Neige légère", 73: "Neige", 75: "Neige forte", 77: "Grains de neige",
    80: "Averses légères", 81: "Averses", 82: "Averses violentes",
    85: "Averses de neige", 86: "Averses de neige fortes",
    95: "Orage", 96: "Orage avec grêle", 99: "Orage violent avec grêle"
};

function meteoIcon(code) { return METEO_ICONS[code] || "🌡️"; }
function meteoLibelle(code) { return METEO_LIBELLES[code] || "—"; }
function meteoVent(beaufort) {
    return ["Calme", "Très légère brise", "Légère brise", "Petite brise", "Jolie brise", "Bonne brise",
        "Vent frais", "Grand frais", "Coup de vent", "Fort coup de vent", "Tempête"][Math.min(10, beaufort)] || "Vent";
}
const VENTS_FLECHE = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];

function meteoChargerVille() {
    try {
        return JSON.parse(localStorage.getItem(METEO_VILLE_CLE)) || METEO_DEFAUT;
    } catch (e) { return METEO_DEFAUT; }
}

function meteoSauverVille(v) {
    localStorage.setItem(METEO_VILLE_CLE, JSON.stringify(v));
}

/* Géocodage : nom de ville → coordonnées (Open-Meteo Geocoding API) */
async function meteoGeocoder(nom) {
    const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(nom) + "&count=1&language=fr&format=json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!j.results || !j.results.length) throw new Error("Ville introuvable : " + nom);
    const g = j.results[0];
    return { nom: g.name, lat: g.latitude, lon: g.longitude };
}

/* Récupère la météo complète (cache 30 min) */
async function meteoObtenir(force) {
    const cache = (() => {
        try { return JSON.parse(localStorage.getItem(METEO_CACHE_CLE) || "null"); } catch (e) { return null; }
    })();
    const age = cache ? Date.now() - cache.t : Infinity;
    if (!force && cache && age < 30 * 60 * 1000) return cache.data;

    const ville = meteoChargerVille();
    const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=" + ville.lat + "&longitude=" + ville.lon
        + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation"
        + "&forecast_hourly=48&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m"
        + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max"
        + "&timezone=auto&forecast_days=14";
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    const enveloppe = { ville, data, recupere: Date.now() };
    try { localStorage.setItem(METEO_CACHE_CLE, JSON.stringify({ t: Date.now(), data: enveloppe })); } catch (e) { }
    return enveloppe;
}
