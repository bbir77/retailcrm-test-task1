require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function sendTelegramMessage(order, sum) {
    const message = `
🚀 *Крупный заказ!*
💰 Сумма: *${sum} ₸*
🔢 Номер: ${order.number}
👤 Клиент: ${order.firstName || 'Не указано'}
    `;
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log(`✅ Уведомление в Telegram отправлено! (#${order.number})`);
    } catch (err) {
        console.error('❌ Ошибка Telegram:', err.message);
    }
}

async function syncOrders() {
    try {
        console.log('--- Запуск синхронизации ---');

        const response = await axios.get(`${process.env.RETAILCRM_URL}/api/v5/orders`, {
            params: { apiKey: process.env.RETAILCRM_KEY, limit: 20 }
        });

        const orders = response.data.orders;
        console.log(`📦 Получено заказов: ${orders.length}`);

        for (const order of orders) {
            // УМНЫЙ ПОИСК СУММЫ: пробуем разные варианты ключей из API
            const sum = order.totalSum || order.total || order.summ || 0;

            console.log(`🔎 Заказ #${order.number}: Сумма = ${sum}`);

            // Ставим порог 10 для теста (потом вернешь 50000)
            if (Number(sum) > 50000) {

                const { data: existing } = await supabase
                    .from('orders')
                    .select('crm_id')
                    .eq('crm_id', order.id)
                    .maybeSingle();

                if (!existing) {
                    console.log(`   ✨ Новый заказ! Шлю в TG...`);
                    await sendTelegramMessage(order, sum);
                } else {
                    console.log(`   ⏭ Уже есть в базе.`);
                }
            }
        }

        // Сохранение в базу
        const ordersToInsert = orders.map(o => ({
            crm_id: o.id,
            number: o.number,
            status: o.status,
            total_sum: o.totalSum || o.total || 0, // Сохраняем найденную сумму
            customer_name: o.firstName || 'Не указано',
            crm_created_at: o.createdAt
        }));

        await supabase.from('orders').upsert(ordersToInsert, { onConflict: 'crm_id' });
        console.log('✅ База данных обновлена.');

    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

syncOrders();