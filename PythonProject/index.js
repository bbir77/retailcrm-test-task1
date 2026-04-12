require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Функция для отправки сообщения в Telegram
async function sendTelegramMessage(order) {
    const message = `
🚀 *Крупный заказ!*
💰 Сумма: *${order.totalSum} ₸*
🔢 Номер: ${order.number}
👤 Клиент: ${order.firstName || 'Не указано'}
📅 Дата: ${new Date(order.createdAt).toLocaleString()}
    `;

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;

    try {
        await axios.post(url, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log(`📢 Уведомление отправлено для заказа #${order.number}`);
    } catch (err) {
        console.error('❌ Ошибка Telegram:', err.message);
    }
}

async function syncOrders() {
    try {
        console.log('🚀 Начинаю проверку заказов...');

        const response = await axios.get(`${process.env.RETAILCRM_URL}/api/v5/orders`, {
            params: { apiKey: process.env.RETAILCRM_KEY, limit: 20 }
        });

        const orders = response.data.orders;
        if (!orders.length) return;

        // Проверяем каждый заказ
        for (const order of orders) {
            // Если сумма больше 50 000 ₸
            if (order.totalSum > 50000) {
                // ПРОВЕРКА: Если мы еще не отправляли уведомление (проверяем есть ли он в БД)
                const { data: existing } = await supabase
                    .from('orders')
                    .select('crm_id')
                    .eq('crm_id', order.id)
                    .single();

                if (!existing) {
                    await sendTelegramMessage(order);
                }
            }
        }

        // Подготовка для Supabase (как раньше)
        const ordersToInsert = orders.map(order => ({
            crm_id: order.id,
            number: order.number,
            status: order.status,
            total_sum: order.totalSum,
            customer_name: order.firstName || 'Не указано',
            crm_created_at: order.createdAt
        }));

        const { error } = await supabase
            .from('orders')
            .upsert(ordersToInsert, { onConflict: 'crm_id' });

        if (error) throw error;
        console.log('✅ Синхронизация завершена!');

    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

syncOrders();