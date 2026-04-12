require('dotenv').config();
const axios = require('axios');

async function testTelegram() {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log('Используемый Токен:', token ? 'Заполнен' : 'ПУСТОЙ!');
    console.log('Используемый Chat ID:', chatId);

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await axios.post(url, {
            chat_id: chatId,
            text: '👋 Привет! Это тестовое сообщение из скрипта.',
        });

        if (response.data.ok) {
            console.log('✅ УСПЕХ! Сообщение отправлено в Telegram.');
        }
    } catch (error) {
        console.error('❌ ОШИБКА отправки!');
        if (error.response) {
            console.error('Код ошибки:', error.response.status);
            console.error('Детали от Telegram:', error.response.data);
        } else {
            console.error('Ошибка сети:', error.message);
        }
    }
}

testTelegram();