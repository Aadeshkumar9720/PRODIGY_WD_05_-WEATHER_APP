const searchForm = document.getElementById("searchForm");
const locationInput = document.getElementById("locationInput");
const locationBtn = document.getElementById("locationBtn");
const searchBtn = document.getElementById("searchBtn");
const message = document.getElementById("message");

const weatherResult = document.getElementById("weatherResult");
const forecast = document.getElementById("forecast");
const forecastGrid = document.getElementById("forecastGrid");

const cityName = document.getElementById("cityName");
const localTime = document.getElementById("localTime");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const cloud = document.getElementById("cloud");

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Light showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Heavy thunderstorm with hail", "⛈️"]
};

function setMessage(text = "") {
  message.textContent = text;
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "Loading..." : "Search";
}

function getWeatherInfo(code) {
  return weatherCodes[code] || ["Unknown", "🌡️"];
}

async function getCoordinates(city) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to find the location.");

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found. Try another city.");
  }

  return data.results[0];
}

async function getWeather(latitude, longitude, timezone = "auto") {
  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "cloud_cover",
      "surface_pressure",
      "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min"
    ].join(","),
    forecast_days: "5"
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );

  if (!response.ok) throw new Error("Unable to fetch weather data.");

  return response.json();
}

function displayWeather(location, data) {
  const current = data.current;
  const info = getWeatherInfo(current.weather_code);

  cityName.textContent =
    `${location.name}${location.country ? ", " + location.country : ""}`;

  const date = new Date(current.time);
  localTime.textContent =
    `Local time: ${date.toLocaleString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })}`;

  weatherIcon.textContent = info[1];
  temperature.textContent = Math.round(current.temperature_2m);
  condition.textContent = info[0];
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
  cloud.textContent = `${current.cloud_cover}%`;

  forecastGrid.innerHTML = "";

  data.daily.time.forEach((dateString, index) => {
    const [description, icon] = getWeatherInfo(data.daily.weather_code[index]);
    const date = new Date(`${dateString}T12:00:00`);

    const card = document.createElement("article");
    card.className = "forecast-day";
    card.innerHTML = `
      <div class="day">${date.toLocaleDateString([], { weekday: "short" })}</div>
      <div class="icon">${icon}</div>
      <div class="temps">
        ${Math.round(data.daily.temperature_2m_max[index])}° /
        <span>${Math.round(data.daily.temperature_2m_min[index])}°</span>
      </div>
      <div class="day">${description}</div>
    `;

    forecastGrid.appendChild(card);
  });

  weatherResult.classList.remove("hidden");
  forecast.classList.remove("hidden");
}

async function searchCity(city) {
  const cleanCity = city.trim();

  if (!cleanCity) {
    setMessage("Please enter a city name.");
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    const location = await getCoordinates(cleanCity);
    const data = await getWeather(location.latitude, location.longitude, "auto");
    displayWeather(location, data);
  } catch (error) {
    weatherResult.classList.add("hidden");
    forecast.classList.add("hidden");
    setMessage(error.message);
  } finally {
    setLoading(false);
  }
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    setMessage("Geolocation is not supported by this browser.");
    return;
  }

  setMessage("Getting your location...");
  locationBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const { latitude, longitude } = position.coords;

        const data = await getWeather(latitude, longitude, "auto");

        // Reverse geocoding through Open-Meteo to show a city name.
        const reverseUrl =
          `https://geocoding-api.open-meteo.com/v1/search?` +
          `latitude=${latitude}&longitude=${longitude}`;

        let location = {
          name: "Your Location",
          country: ""
        };

        // If reverse endpoint isn't available, weather still displays.
        try {
          const reverseResponse = await fetch(reverseUrl);
          if (reverseResponse.ok) {
            const reverseData = await reverseResponse.json();
            if (reverseData.results?.[0]) {
              location = reverseData.results[0];
            }
          }
        } catch (_) {}

        displayWeather(location, data);
        setMessage("");
      } catch (error) {
        setMessage("Could not load weather for your location.");
      } finally {
        locationBtn.disabled = false;
      }
    },
    error => {
      locationBtn.disabled = false;
      if (error.code === error.PERMISSION_DENIED) {
        setMessage("Location permission was denied. Search for a city instead.");
      } else {
        setMessage("Unable to get your current location.");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchCity(locationInput.value);
});

locationBtn.addEventListener("click", useCurrentLocation);

// Load an example city on first visit.
searchCity("New Delhi");
