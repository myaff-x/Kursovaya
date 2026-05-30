/**
 * storage.js
 */

// Получить настройки пользователя (userSettings)
const getSettings = () => {
    const raw = localStorage.getItem('userSettings');
    return raw ? JSON.parse(raw) : { defaultFrom: 'USD', defaultTo: 'RUB' };
};

// Сохранить настройки пользователя (userSettings)
const saveSettings = (fromCode, toCode) => {
    const userSettings = { defaultFrom: fromCode, defaultTo: toCode };
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
};

// Получить историю операций (conversionHistory)
const getHistory = () => {
    const raw = localStorage.getItem('conversionHistory');
    return raw ? JSON.parse(raw) : [];
};

// Добавить операцию в историю (conversionHistory)
const addToHistory = (from, to, amount, result, date) => {
    const conversionHistory = getHistory();
    
    const entry = {
        id: Date.now().toString(), // ID нужен для удаления
        from: from,
        to: to,
        amount: amount,
        result: result,
        date: date,
        timestamp: Date.now()
    };
    
    conversionHistory.unshift(entry);
    
    if (conversionHistory.length > 10) {
        conversionHistory.pop();
    }
    
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
};

// Удалить запись из истории
const deleteFromHistory = (id) => {
    let conversionHistory = getHistory();
    conversionHistory = conversionHistory.filter(item => item.id !== id);
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
};

// Очистить всю историю
const clearHistory = () => {
    localStorage.removeItem('conversionHistory');
};

// Сохранить курсы в кэш (currencyRates)
const cacheRates = (valuteData, date) => {
    localStorage.setItem('currencyRates', JSON.stringify(valuteData));
    localStorage.setItem('currencyRatesDate', date);
    localStorage.setItem('currencyRatesTimestamp', Date.now().toString());
};

// Получить курсы из кэша (currencyRates)
const getCachedRates = () => {
    const rates = localStorage.getItem('currencyRates');
    const time = localStorage.getItem('currencyRatesTimestamp');
    const date = localStorage.getItem('currencyRatesDate');
    
    if (!rates || !time || !date) {
        return null;
    }
    
    // Проверка кэша на 1 час (3600000 миллисекунд)
    if (Date.now() - parseInt(time) > 3600000) {
        return null;
    }
    
    return {
        date: date,
        valute: JSON.parse(rates)
    };
};
