/**
 * api.js
 */

const API_URL_LATEST = 'https://www.cbr-xml-daily.ru/daily_json.js';
const API_URL_ARCHIVE = 'https://www.cbr-xml-daily.ru/archive/{year}/{month}/{day}/daily_json.js';

// Преобразовать объект даты Date в строку формата YYYY-MM-DD
const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Добавить рубль в список валют от ЦБ
const injectRub = (valuteData) => {
    if (valuteData && !valuteData.RUB) {
        valuteData.RUB = {
            ID: 'R00000',
            NumCode: '643',
            CharCode: 'RUB',
            Nominal: 1,
            Name: 'Российский рубль',
            Value: 1.0,
            Previous: 1.0
        };
    }
    return valuteData;
};

// Загрузить свежие курсы валют на сегодняшний день
const fetchLatestRates = (onSuccess, onError) => {
    // Пробуем взять свежий кэш из локальной памяти (1 час)
    const cached = getCachedRates();
    if (cached) {
        onSuccess({
            date: cached.date,
            valute: injectRub(cached.valute),
            fromCache: true,
            offline: false
        });
        return;
    }

    // Если кэша нет, отправляем запрос к API
    fetch(API_URL_LATEST)
        .then(response => {
            if (!response.ok) {
                throw new Error('Код ошибки ответа: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const apiDate = data.Date ? data.Date.split('T')[0] : formatDateToISO(new Date());
            // Сохраняем полученные данные в кэш
            cacheRates(data.Valute, apiDate);
            onSuccess({
                date: apiDate,
                valute: injectRub(data.Valute),
                fromCache: false,
                offline: false
            });
        })
        .catch(error => {
            console.warn('Сбой сети. Пытаемся взять любой старый кэш из памяти.', error);
            
            // Если интернета нет, ищем старый кэш в localStorage
            const rawCaches = localStorage.getItem('currencyRates');
            const cachedDate = localStorage.getItem('currencyRatesDate');
            if (rawCaches && cachedDate) {
                onSuccess({
                    date: cachedDate,
                    valute: injectRub(JSON.parse(rawCaches)),
                    fromCache: true,
                    offline: true
                });
            } else {
                onError(new Error('Сетевая ошибка. Курсы валют недоступны.'));
            }
        });
};

// Загрузить архивные курсы валют на выбранную дату
const fetchHistoricalRates = (dateString, onSuccess, onError) => {
    const todayStr = formatDateToISO(new Date());
    // Если дата сегодняшняя или из будущего — грузим свежие курсы
    if (dateString >= todayStr) {
        fetchLatestRates(onSuccess, onError);
        return;
    }
    // Преобразуем дату "YYYY-MM-DD" в "YYYY/MM/DD" для URL архива
    const urlDate = dateString.replace(/-/g, '/');
    const archiveUrl = API_URL_ARCHIVE
        .replace('{year}', urlDate.split('/')[0])
        .replace('{month}', urlDate.split('/')[1])
        .replace('{day}', urlDate.split('/')[2]);

    fetch(archiveUrl)
        .then(response => {
            if (response.status === 404) {
                throw new Error('Курсы на этот день отсутствуют (выходной день). Выберите будний день.');
            }
            if (!response.ok) {
                throw new Error('Ошибка сервера архива: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const apiDate = data.Date ? data.Date.split('T')[0] : dateString;
            
            onSuccess({
                date: apiDate,
                valute: injectRub(data.Valute),
                isFallback: false,
                offline: false
            });
        })
        .catch(error => {
            onError(error);
        });
};
