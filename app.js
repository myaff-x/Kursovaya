/**
 * app.js
 */

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
let currencyRates = null;       // Актуальные курсы валют (объект)
let conversionHistory = [];     // История конвертаций (массив)
let userSettings = {};          // Настройки пользователя (объект)

let ratesDate = '';             // Реальная дата курсов от ЦБ
let selectedDate = '';          // Дата, выбранная в календаре
let isOffline = false;          // Флаг отсутствия интернета

const POPULAR_CURRENCIES = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'BYN', 'KZT', 'AED', 'TRY', 'JPY'];

// СЕЛЕКТОРЫ HTML ЭЛЕМЕНТОВ
const apiStatusIndicator = document.getElementById('api-status-indicator');
const apiStatusText = document.getElementById('api-status-text');
const lastUpdateBadge = document.getElementById('last-update-badge');
const amountInput = document.getElementById('amount-input');
const amountAddon = document.getElementById('amount-addon');
const amountInputGroup = document.getElementById('amount-input-group');
const amountValidationError = document.getElementById('amount-validation-error');
const fromCurrency = document.getElementById('from-currency');
const toCurrency = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-btn');
const rateDate = document.getElementById('rate-date');
const todayBtn = document.getElementById('today-btn');
const convertBtn = document.getElementById('convert-btn');
const resultContainer = document.getElementById('result-container');
const resultFromText = document.getElementById('result-from-text');
const resultToText = document.getElementById('result-to-text');
const rateInfoDirect = document.getElementById('rate-info-direct');
const rateInfoReverse = document.getElementById('rate-info-reverse');
const baseCurrencyTable = document.getElementById('base-currency-table');
const ratesTableBody = document.getElementById('rates-table-body');
const historyList = document.getElementById('history-list');
const emptyHistoryText = document.getElementById('empty-history-text');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const toastContainer = document.getElementById('toast-container');

// ВСПЛЫВАЮЩИЕ УВЕДОМЛЕНИЯ
const showToast = (message, type = 'info') => {
    // Вставляем плашку уведомления внутрь контейнера
    toastContainer.innerHTML = `<div class="toast ${type}">${message}</div>`;
    // Удаляем текст через 3 секунды
    setTimeout(() => {
        toastContainer.innerHTML = '';
    }, 3000);
};

// ИНДИКАТОР СТАТУСА СЕТИ
const updateStatusBadge = (status, text) => {
    // Меняем цвет индикатора (зеленый/оранжевый/красный)
    apiStatusIndicator.className = 'status-indicator ' + (
        status === 'online' ? 'dot-green' : 
        status === 'offline' ? 'dot-orange' : 
        'dot-red'
    );
    apiStatusText.textContent = text;
};

// ВАЛИДАЦИЯ ВВОДА
const validateAmount = (amount) => {
    if (!amount) {
        return { isValid: false, message: 'Сумма не может быть пустой.' };
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
        return { isValid: false, message: 'Введите число больше 0.' };
    }
    return { isValid: true, message: '' };
};

// РАСЧЕТ КОНВЕРТАЦИИ
const convertCurrency = (amount, fromCode, toCode, valuteData) => {
    const fromVal = valuteData[fromCode].Value / valuteData[fromCode].Nominal;
    const toVal = valuteData[toCode].Value / valuteData[toCode].Nominal;
    
    const result = amount * (fromVal / toVal);
    const rateDirect = fromVal / toVal;
    const rateReverse = toVal / fromVal;

    return {
        result: parseFloat(result.toFixed(4)),
        rateDirect: parseFloat(rateDirect.toFixed(6)),
        rateReverse: parseFloat(rateReverse.toFixed(6))
    };
};

// СОРТИРОВКА ВАЛЮТ
const getSortedCurrencies = (valuteData) => {
    const list = Object.keys(valuteData).map(code => ({
        code: code,
        name: valuteData[code].Name
    }));
    return list.sort((a, b) => {
        const aIdx = POPULAR_CURRENCIES.indexOf(a.code);
        const bIdx = POPULAR_CURRENCIES.indexOf(b.code);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
};
