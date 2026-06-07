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

// ТАБЛИЦА КУРСОВ СПРАВА
const renderRatesTable = () => {
    if (!currencyRates) return;
    const baseCode = baseCurrencyTable.value;
    const baseVal = currencyRates[baseCode].Value / currencyRates[baseCode].Nominal;

    let html = '';
    
    POPULAR_CURRENCIES.filter(code => code !== baseCode).forEach(code => {
        const curr = currencyRates[code];
        if (!curr) return;

        const val = curr.Value / curr.Nominal;
        const rate = baseVal / val;

        // Склеиваем строки таблицы
        html += `
            <tr>
                <td>${curr.Name}</td>
                <td><strong>${code}</strong></td>
                <td class="text-right"><strong>${rate.toFixed(4)}</strong></td>
            </tr>
        `;
    });
    
    // Заменяем внутреннее содержимое таблицы на сгенерированный HTML
    ratesTableBody.innerHTML = html;
};

// ЗАПОЛНЕНИЕ ВЫПАДАЮЩИХ СПИСКОВ
const populateCurrencyDropdowns = (valuteData) => {
    const currencies = getSortedCurrencies(valuteData);
    const prevFrom = fromCurrency.value;
    const prevTo = toCurrency.value;

    fromCurrency.innerHTML = '';
    toCurrency.innerHTML = '';

    currencies.forEach(curr => {
        const oFrom = new Option(`${curr.code} - ${curr.name}`, curr.code);
        const oTo = new Option(`${curr.code} - ${curr.name}`, curr.code);
        fromCurrency.add(oFrom);
        toCurrency.add(oTo);
    });

    userSettings = getSettings();
    fromCurrency.value = (prevFrom && valuteData[prevFrom]) ? prevFrom : userSettings.defaultFrom;
    toCurrency.value = (prevTo && valuteData[prevTo]) ? prevTo : userSettings.defaultTo;
    
    updateInputAddon();
};

const updateInputAddon = () => {
    amountAddon.textContent = fromCurrency.value;
};

// ОТРИСОВКА ИСТОРИИ
const renderHistory = () => {
    conversionHistory = getHistory();
    historyList.innerHTML = '';

    if (conversionHistory.length === 0) {
        emptyHistoryText.style.display = 'flex';
        clearHistoryBtn.disabled = true;
        return;
    }

    emptyHistoryText.style.display = 'none';
    clearHistoryBtn.disabled = false;

    let html = '';

    conversionHistory.forEach(item => {
        const dt = new Date(item.timestamp);
        
        let hours = dt.getHours();
        if (hours < 10) hours = '0' + hours;
        
        let minutes = dt.getMinutes();
        if (minutes < 10) minutes = '0' + minutes;
        
        let day = dt.getDate();
        if (day < 10) day = '0' + day;
        
        let month = dt.getMonth() + 1;
        if (month < 10) month = '0' + month;
        
        const timeStr = hours + ':' + minutes + ' ' + day + '.' + month;
        
        // Вставляем обработчики onload / onclick прямо в HTML
        html += `
            <li class="history-item" onclick="handleLoadHistoryItem('${item.id}')">
                <div class="history-item-details">
                    <div class="history-item-conversion">
                        ${item.amount} ${item.from} → <span class="trend-up">${item.result} ${item.to}</span>
                    </div>
                    <div class="history-item-time">
                        ${timeStr} ${item.date ? ` курс на ${item.date}` : ''}
                    </div>
                </div>
                <div class="history-actions">
                    <button type="button" class="history-action-btn delete" onclick="event.stopPropagation(); handleDeleteHistoryItem('${item.id}')" title="Удалить">🗑️</button>
                </div>
            </li>
        `;
    });
    
    // Вставляем список истории целиком
    historyList.innerHTML = html;
};

// ЗАГРУЗКА КУРСОВ И КОНВЕРТАЦИЯ
const loadRatesForDate = (dateStr) => {
    convertBtn.disabled = true;
    convertBtn.textContent = 'Загрузка...';
    updateStatusBadge('loading', 'Загрузка...');

    const onSuccess = (res) => {
        currencyRates = res.valute;
        ratesDate = res.date;
        isOffline = res.offline;

        const [y, m, d] = res.date.split('-');
        lastUpdateBadge.textContent = `Курсы от: ${d}.${m}.${y}`;

        populateCurrencyDropdowns(currencyRates);
        renderRatesTable();

        updateStatusBadge(isOffline ? 'offline' : 'online', isOffline ? 'Оффлайн режим' : 'Курсы обновлены');
        if (isOffline) {
            showToast('Курсы взяты из кэша (нет сети).', 'warning');
        } else {
            if (!res.fromCache && !dateStr) {
                showToast(`Курсы обновлены за сегодня`, 'success');
            }
        }

        convertBtn.disabled = false;
        convertBtn.textContent = 'Конвертировать';

        if (amountInput.value !== '') handleConvert(false);
    };

    const onError = (e) => {
        updateStatusBadge('error', 'Ошибка');
        showToast(e.message || 'Ошибка сети', 'error');
        convertBtn.disabled = false;
        convertBtn.textContent = 'Повторить';
    };

    if (dateStr) {
        fetchHistoricalRates(dateStr, onSuccess, onError);
    } else {
        fetchLatestRates(onSuccess, onError);
    }
};

// Расчет конвертации
const handleConvert = (shouldSave = true) => {
    const rawVal = amountInput.value;
    const check = validateAmount(rawVal);
    const group = amountInputGroup;

    if (!check.isValid) {
        group.classList.add('invalid');
        amountValidationError.textContent = check.message;
        resultContainer.classList.add('hidden');
        return;
    }
    group.classList.remove('invalid');

    try {
        const amount = parseFloat(rawVal);
        const from = fromCurrency.value;
        const to = toCurrency.value;

        const { result, rateDirect, rateReverse } = convertCurrency(amount, from, to, currencyRates);

        resultFromText.textContent = `${amount} ${from} =`;
        resultToText.textContent = `${result} ${to}`;

        rateInfoDirect.textContent = `1 ${from} = ${rateDirect.toFixed(4)} ${to}`;
        rateInfoReverse.textContent = `1 ${to} = ${rateReverse.toFixed(4)} ${from}`;

        resultContainer.classList.remove('hidden');

        if (shouldSave) {
            addToHistory(from, to, amount, result, ratesDate);
            renderHistory();
        }
        saveSettings(from, to);
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// ГЛОБАЛЬНЫЕ ФУНКЦИИ СОБЫТИЙ

// Валидация суммы при наборе текста
const handleAmountInput = () => {
    if (validateAmount(amountInput.value).isValid || amountInput.value === '') {
        amountInputGroup.classList.remove('invalid');
    }
};

// Смена валюты в калькуляторе
const handleCurrencyChange = () => {
    updateInputAddon();
    if (amountInput.value !== '') handleConvert(false);
};

// Клик по кнопке реверса валют (Swap)
const handleSwap = () => {
    const f = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = f;
    updateInputAddon();
    if (amountInput.value !== '') handleConvert(false);
};

// Клик по кнопке "Сегодня"
const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    if (rateDate.value !== today) {
        rateDate.value = today;
        selectedDate = today;
        loadRatesForDate('');
    }
};

// Изменение даты в календаре
const handleDateChange = (val) => {
    selectedDate = val;
    loadRatesForDate(selectedDate);
};

// Изменение базы в таблице популярных курсов
const handleBaseCurrencyChange = () => {
    renderRatesTable();
};

// Инициализация при загрузке
const today = new Date().toISOString().split('T')[0];
rateDate.setAttribute('max', today);
rateDate.value = today;
selectedDate = today;

renderHistory();
loadRatesForDate('');
