require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function syncOrders() {
    try {
        console.log(`\n[${new Date().toLocaleTimeString()}] 🔍 Подключаюсь к CRM...`);

        // 1. Спрашиваем у CRM: "Сколько всего у нас страниц с заказами?"
        const firstRequest = await axios.get(`${process.env.RETAILCRM_URL}/api/v5/orders`, {
            params: { apiKey: process.env.RETAILCRM_KEY, limit: 100 }
        });

        const totalPages = firstRequest.data.pagination.totalPageCount;

        // 2. Идем сразу на ПОСЛЕДНЮЮ страницу, где лежат новые заказы
        const lastRequest = await axios.get(`${process.env.RETAILCRM_URL}/api/v5/orders`, {
            params: { apiKey: process.env.RETAILCRM_KEY, limit: 100, page: totalPages }
        });

        const orders = lastRequest.data.orders;
        if (!orders || orders.length === 0) return;

        // Выводим в терминал 3 самых последних заказа, чтобы ты их видел
        const last3 = orders.slice(-3);
        console.log(`📑 Я на странице ${totalPages}. Вижу последние заказы:`);
        last3.forEach(o => {
             console.log(`   👉 Заказ #${o.number} | Сумма: ${o.totalSum || o.total || 0}`);
        });

        // 3. Проверяем суммы и шлем в Telegram
        for (const order of orders) {
            const sum = order.totalSum || order.total || order.summ || 0;

            if (Number(sum) > 50000) {
                const { data: existing } = await supabase
                    .from('orders')
                    .select('crm_id')
                    .eq('crm_id', order.id)
                    .maybeSingle();

                if (!existing) {
                    console.log(`🚨 НАШЕЛ НОВЫЙ КРУПНЫЙ ЗАКАЗ #${order.number}! Шлю в Телеграм...`);

                    const msg = `🚀 *НОВЫЙ ЗАКАЗ!*\n💰 Сумма: *${sum} ₸*\n🔢 Номер: ${order.number}`;
                    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                        chat_id: process.env.TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown'
                    });
                }
            }
        }

        // 4. Сохраняем в Supabase
        const ordersToInsert = orders.map(o => ({
            crm_id: o.id,
            number: o.number,
            status: o.status,
            total_sum: o.totalSum || o.total || 0,
            customer_name: o.firstName || 'Не указано',
            crm_created_at: o.createdAt
        }));

        await supabase.from('orders').upsert(ordersToInsert, { onConflict: 'crm_id' });
        console.log('✅ База обновлена.');

    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

console.log('🚀 Робот запущен! Жду новые заказы...');
syncOrders();
setInterval(syncOrders, 20000); // Проверка каждые 20 секунд