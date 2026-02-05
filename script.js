// Weather App Logic
const API_KEY = '23b279f0bd4aabad95016011d344b1d2'; // Provided API Key
const MAP_API_KEY = 'AIzaSyAjjUzNI_B-WTC6TO3zUq7wdwB7kHP4sFo'; // Google Maps Embed API Key

// Weather Background Images (Unsplash)
const weatherImages = {
    Clear: 'https://images.unsplash.com/photo-1601297183305-6df1428a9c19?q=80&w=2500&auto=format&fit=crop', // Sunny/Clear
    Clouds: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=2500&auto=format&fit=crop', // Cloudy
    Rain: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=2500&auto=format&fit=crop', // Rain
    Drizzle: 'https://images.unsplash.com/photo-1556485689-33e55ab56ce0?q=80&w=2500&auto=format&fit=crop', // Drizzle
    Thunderstorm: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2500&auto=format&fit=crop', // Storm
    Snow: 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?q=80&w=2500&auto=format&fit=crop', // Snow
    Mist: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=2500&auto=format&fit=crop', // Fog/Mist
    Fog: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=2500&auto=format&fit=crop', // Fog/Mist
    Haze: 'https://images.unsplash.com/photo-1522163723043-478ef79a5bb4?q=80&w=2500&auto=format&fit=crop', // Haze
    Default: 'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?q=80&w=2500&auto=format&fit=crop' // Default Landscape
};

// DOM Elements
const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('get-weather-btn'),
    weatherInfo: document.getElementById('weather-info'),
    loadingSpinner: document.getElementById('loading-spinner'),
    errorMessage: document.getElementById('error-message'),
    cityName: document.getElementById('city-name'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('description'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    weatherIcon: document.getElementById('weather-icon-img'),
    searchHistoryList: document.getElementById('search-history'),
    unitToggle: document.getElementById('unit-toggle'),
    bgImage: document.querySelector('.bg-image'),
    localTime: document.getElementById('local-time'),
    forecastContainer: document.getElementById('forecast-container'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    windDirText: document.getElementById('wind-dir-text'),
    windDirArrow: document.getElementById('wind-dir-arrow'),
    cityMap: document.getElementById('city-map')
};

// State
let searchHistory = [];
let currentTempCelsius = null; // Store base temperature
let forecastData = []; // Store forecast data for unit toggle

// Helper Functions
function showSpinner(show) {
    elements.loadingSpinner.classList.toggle('hidden', !show);
}

function showWeatherInfo(show) {
    elements.weatherInfo.classList.toggle('hidden', !show);
}

function showError(show, msg) {
    elements.errorMessage.classList.toggle('hidden', !show);
    if (msg) elements.errorMessage.textContent = msg;
}

function getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
}

function getCardinalDirection(angle) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
}

function formatTime(timestamp, timezoneOffset) {
    const now = new Date(); // To get local machine offset
    // Timestamp is UTC seconds. timezoneOffset is seconds.
    // Convert timestamp to ms
    // Logic: Unix Time (UTC) + Offset (sec) * 1000 = Local Time in Location (ms)
    // IMPORTANT: The date object constructor takes UTC ms. But toPrint.toLocaleString would use local machine timezone.
    // Better Approach: create date from UTC, then use toLocaleString with specific timeZone is hard without library.
    // Hacky but simple approach for basic JS without libraries:
    // 1. Get UTC time in ms
    const utcTime = timestamp * 1000;
    // 2. Add the destination offset (in ms)
    const targetTime = utcTime + (timezoneOffset * 1000);
    // 3. Subtract LOCAL USER offset to cheat the Date object if we were doing date math, 
    // BUT actually we just want to format a specific "wall clock" time.
    // Easiest is to use the same logic we used for the main clock:
    
    // Correction:
    // new Date(timestamp * 1000) creates a date object representing that point in time globally.
    // We want to string format it as if we were in that timezone.
    // Since native Intl support for "dynamic offset" is tricky, we reuse the offset calc:
    
    const d = new Date();
    const localOffsetMs = d.getTimezoneOffset() * 60000;
    const targetDate = new Date(utcTime + localOffsetMs + (timezoneOffset * 1000));
    
    return targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function renderSearchHistory() {
    elements.searchHistoryList.innerHTML = '';
    searchHistory.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city;
        li.onclick = () => fetchWeather(city);
        elements.searchHistoryList.appendChild(li);
    });
}

function updateSearchHistory(city) {
    if (!city || searchHistory.some(c => c.toLowerCase() === city.toLowerCase())) return;
    
    searchHistory.unshift(city);
    if (searchHistory.length > 5) searchHistory.pop();
    
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
    renderSearchHistory();
}

function renderForecast() {
    elements.forecastContainer.innerHTML = '';
    const isFahrenheit = elements.unitToggle.checked;

    forecastData.forEach(day => {
        const tempC = day.main.temp;
        const tempDisplay = isFahrenheit 
            ? `${Math.round((tempC * 9/5) + 32)}°F` 
            : `${Math.round(tempC)}°C`;
        
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <span class="forecast-day">${dayName}</span>
            <img src="${getWeatherIconUrl(day.weather[0].icon)}" alt="${day.weather[0].main}" class="forecast-icon">
            <span class="forecast-temp">${tempDisplay}</span>
            <span class="forecast-desc">${day.weather[0].main}</span>
        `;
        elements.forecastContainer.appendChild(card);
    });
}

function updateTemperatureDisplay() {
    // Update Main Temp
    if (currentTempCelsius !== null) {
        const isFahrenheit = elements.unitToggle.checked;
        if (isFahrenheit) {
            const tempF = (currentTempCelsius * 9/5) + 32;
            elements.temperature.textContent = `${Math.round(tempF)}°F`;
        } else {
            elements.temperature.textContent = `${Math.round(currentTempCelsius)}°C`;
        }
    }
    
    // Update Forecast
    if (forecastData.length > 0) {
        renderForecast();
    }
}

function updateBackgroundImage(weatherMain) {
    const imageUrl = weatherImages[weatherMain] || weatherImages.Default;
    
    // Add a transition effect
    elements.bgImage.style.opacity = '0';
    
    setTimeout(() => {
        elements.bgImage.style.background = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${imageUrl}')`;
        elements.bgImage.style.backgroundSize = 'cover';
        elements.bgImage.style.backgroundPosition = 'center';
        elements.bgImage.style.opacity = '1';
    }, 300);
}

// Fetch Forecast
async function fetchForecast(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) return; // Silent fail for forecast if main weather works
        
        const data = await response.json();
        
        // Filter for 1 items per day (approx every 24h)
        // The API returns every 3 hours. 24/3 = 8 items per day.
        const dailyData = [];
        // Start from index 4 (approx 12:00 PM for the next day)
        // Simple approach: Pick every 8th item
        for (let i = 4; i < data.list.length; i += 8) {
            dailyData.push(data.list[i]);
            if (dailyData.length >= 5) break; 
        }
        
        forecastData = dailyData;
        renderForecast();
        
    } catch (e) {
        console.error("Forecast Error:", e);
    }
}

// Main Fetch Function
async function fetchWeather(city) {
    if (!city) return;

    // Reset UI state
    showError(false);
    showWeatherInfo(false);
    showSpinner(true);
    elements.weatherIcon.classList.add('hidden');
    elements.forecastContainer.innerHTML = ''; // Clear old forecast
    forecastData = [];
    elements.cityMap.src = ''; // Clear map

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error('City not found. Please try again.');
        }

        const data = await response.json();

        // Store base temp
        currentTempCelsius = data.main.temp;

        // Calculate Local Time & Dates
        const timezoneOffset = data.timezone;
        const now = new Date();
        const localTimeMs = now.getTime() + (now.getTimezoneOffset() * 60000) + (timezoneOffset * 1000);
        const localDate = new Date(localTimeMs);
        
        const timeOptions = { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true };
        elements.localTime.textContent = localDate.toLocaleString('en-US', timeOptions);

        // Update Sun & Wind
        elements.sunrise.textContent = formatTime(data.sys.sunrise, timezoneOffset);
        elements.sunset.textContent = formatTime(data.sys.sunset, timezoneOffset);
        
        const windDeg = data.wind.deg || 0;
        elements.windDirText.textContent = getCardinalDirection(windDeg);
        if (elements.windDirArrow) {
            // Need to minus 90 if the arrow icon points right by default, but our arrow character ➤ points right.
            // Wait, ➤ points RIGHT. North is UP (0deg). 
            // So if angle is 0 (North), arrow should point UP. Rotate -90deg.
            // If angle is 90 (East), arrow should point RIGHT. Rotate 0deg.
            // Standard CSS rotation 0 is usually whatever the element is. 
            // Let's assume North (0) means Up.
            // To make right-pointing arrow point Up, we rotate -90. 
            // So rotation = deg - 90.
            elements.windDirArrow.style.transform = `rotate(${windDeg - 90}deg)`;
        }

        // Update Map
        // Using OpenStreetMap/Google Maps embed hack
        // Use coordinates for precision
        elements.cityMap.src = `https://www.google.com/maps/embed/v1/view?key=${MAP_API_KEY}&center=${data.coord.lat},${data.coord.lon}&zoom=13`;

        // Update UI Text
        elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
        updateTemperatureDisplay(); // Use function to display correct unit
        elements.description.textContent = data.weather[0].description;
        elements.windSpeed.textContent = `${data.wind.speed} m/s`;
        elements.humidity.textContent = `${data.main.humidity}%`;
        elements.pressure.textContent = `${data.main.pressure} hPa`;
        
        // Icon
        elements.weatherIcon.src = getWeatherIconUrl(data.weather[0].icon);
        elements.weatherIcon.alt = data.weather[0].description;
        elements.weatherIcon.classList.remove('hidden');

        // Background
        updateBackgroundImage(data.weather[0].main);

        showWeatherInfo(true);
        updateSearchHistory(data.name);
        
        // Fetch Forecast after main weather is successful
        fetchForecast(city);

    } catch (error) {
        showError(true, error.message);
    } finally {
        showSpinner(false);
    }
}

// Quick City Search Function
function searchCity(cityName) {
    elements.cityInput.value = cityName.trim();
    fetchWeather(cityName.trim());
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load History
    const storedHistory = localStorage.getItem('weatherSearchHistory');
    if (storedHistory) {
        searchHistory = JSON.parse(storedHistory);
        renderSearchHistory();
    }

    // Search Button Click
    elements.searchBtn.addEventListener('click', () => {
        const city = elements.cityInput.value.trim();
        fetchWeather(city);
    });

    // Enter Key Press
    elements.cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const city = elements.cityInput.value.trim();
            fetchWeather(city);
        }
    });

    // Unit Toggle
    elements.unitToggle.addEventListener('change', updateTemperatureDisplay);
});