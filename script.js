
const API_KEY = '28e8bbca19ff487d8ac64408260604';
const BASE_URL = 'https://api.weatherapi.com/v1';

const navItems = [
  { icon: '🌦️', label: 'Weather', active: true },
  { icon: '☰', label: 'Cities', active: false },
  { icon: '🗺️', label: 'Map', active: false },
  { icon: '⚙️', label: 'Settings', active: false },
];



function getWeatherEmoji(code) {
  // Sunny / Clear
  if (code === 1000) return '☀️';
  // Partly cloudy
  if (code === 1003) return '⛅';
  // Cloudy / Overcast
  if ([1006, 1009].includes(code)) return '☁️';
  // Mist / Fog / Freezing fog
  if ([1030, 1135, 1147].includes(code)) return '🌫️';
  // Patchy rain / Light drizzle
  if ([1063, 1150, 1153, 1180, 1183].includes(code)) return '🌦️';
  // Moderate / Heavy rain
  if ([1186, 1189, 1192, 1195, 1243, 1246].includes(code)) return '🌧️';
  // Thunderstorm
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';
  // Snow / Sleet / Blizzard
  if ([1066, 1069, 1072, 1114, 1117, 1168, 1171,
    1198, 1201, 1204, 1207, 1210, 1213, 1216,
    1219, 1222, 1225, 1237, 1249, 1252, 1255,
    1258, 1261, 1264].includes(code)) return '❄️';
  return '🌡️';
}

function getDayLabel(index, dateStr) {
  if (index === 0) return 'Today';

  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}


async function fetchWeather(city) {
  const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&aqi=yes`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `City not found: ${city}`);
  }
  return res.json();
}


function buildHourly(data) {

  const hours = data.forecast.forecastday[0].hour;
  const now = new Date().getHours();

  const start = Math.max(now, 6);
  const picked = [];

  for (let h = start; picked.length < 6 && h < 24; h += Math.ceil((24 - start) / 6)) {
    picked.push(hours[Math.min(h, 23)]);
  }

  while (picked.length < 6) picked.push(hours[23]);

  return picked.map(h => {
    const date = new Date(h.time);
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return {
      time,
      icon: getWeatherEmoji(h.condition.code),
      temp: Math.round(h.temp_c),
    };
  });
}

function buildWeekly(data) {
  return data.forecast.forecastday.map((day, i) => ({
    day: getDayLabel(i, day.date),
    icon: getWeatherEmoji(day.day.condition.code),
    condition: day.day.condition.text.split(' ')[0], // first word keeps it short
    hi: Math.round(day.day.maxtemp_c),
    lo: Math.round(day.day.mintemp_c),
  }));
}

function buildAirConditions(data) {
  const c = data.current;
  const day = data.forecast.forecastday[0].day;
  return [
    { icon: '🌡️', label: 'Real Feel', value: `${Math.round(c.feelslike_c)}°` },
    { icon: '💨', label: 'Wind', value: `${c.wind_kph.toFixed(1)} km/h` },
    { icon: '💧', label: 'Chance of rain', value: `${day.daily_chance_of_rain}%` },
    { icon: '🌞', label: 'UV Index', value: `${Math.round(c.uv)}` },
  ];
}


function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = navItems.map(({ icon, label, active }) => `
    <button class="nb ${active ? 'on' : ''}" data-label="${label}">
      <span class="ic">${icon}</span>${label}
    </button>
  `).join('');

  nav.querySelectorAll('.nb').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
    });
  });
}

function renderHero(data) {
  const hero = document.getElementById('hero');
  const c = data.current;
  const day = data.forecast.forecastday[0].day;

  hero.innerHTML = `
    <div>
      <div class="city">${data.location.name}</div>
      <div class="sub">Chance of rain: ${day.daily_chance_of_rain}%</div>
      <div class="temp">${Math.round(c.temp_c)}°</div>
    </div>
    <div class="sun-wrap">
      <div class="sun">${getWeatherEmoji(c.condition.code)}</div>
    </div>
  `;
}

function renderForecastCard(hourly) {
  const card = document.getElementById('forecast-card');
  const cols = hourly.map(({ time, icon, temp }) => `
    <div class="hcol">
      <span class="ht">${time}</span>
      <span class="hi">${icon}</span>
      <span class="hv">${temp}°</span>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="ch"><div class="ct">Today's Forecast</div></div>
    <div class="hourly">${cols}</div>
  `;
}

function renderAirCard(airConditions) {
  const card = document.getElementById('air-card');
  const items = airConditions.map(({ icon, label, value }) => `
    <div class="ar">
      <div class="al"><span>${icon}</span> ${label}</div>
      <div class="av">${value}</div>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="ch">
      <div class="ct">Air Conditions</div>
      <button class="btn-more" id="see-more-btn">See more</button>
    </div>
    <div class="ag">${items}</div>
  `;
}

function renderWeekly(weekly) {
  const container = document.getElementById('weekly');
  container.innerHTML = weekly.map(({ day, icon, condition, hi, lo }) => `
    <div class="dr">
      <span class="dn">${day}</span>
      <span class="di">${icon}</span>
      <span class="dc">${condition}</span>
      <span class="dts">${hi}/<span class="lo">${lo}</span></span>
    </div>
  `).join('');
}

function renderError(message) {
  document.getElementById('hero').innerHTML = `
    <div style="color:var(--muted);font-size:14px;padding:12px 0;">${message}</div>
  `;
}

function renderLoading() {
  document.getElementById('hero').innerHTML = `
    <div class="city" style="opacity:.4">Loading…</div>
  `;
}


async function loadWeather(city) {
  if (!API_KEY) {
    renderError('⚠️ Paste your WeatherAPI key into API_KEY at the top of script.js');
    return;
  }

  renderLoading();

  try {
    const data = await fetchWeather(city);  // single call returns everything

    renderHero(data);
    renderForecastCard(buildHourly(data));
    renderAirCard(buildAirConditions(data));
    renderWeekly(buildWeekly(data));

  } catch (err) {
    renderError(`❌ ${err.message}`);
    console.error(err);
  }
}


function initSearch() {
  const input = document.getElementById('city-search');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const city = input.value.trim();
      if (city) { loadWeather(city); input.value = ''; }
    }
  });
}


function init() {
  renderNav();
  initSearch();
  loadWeather('Amritsar'); 
}

document.addEventListener('DOMContentLoaded', init);
