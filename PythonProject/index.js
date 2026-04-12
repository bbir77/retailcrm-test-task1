require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Инициализация Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function syncOrders() {
    try {
        console.log('🚀 Начинаю загрузку заказов из RetailCRM...');

        // 1. Получаем заказы из RetailCRM
        // Мы берем последние 50 заказов для примера
        const response = await axios.get(`${process.env.RETAILCRM_URL}/api/v5/orders`, {
            params: {
                apiKey: process.env.RETAILCRM_KEY,
                limit: 50,
                // Здесь можно добавить фильтры, например по дате
            }
        });

        const orders = response.data.orders;
        console.log(`📦 Найдено заказов в CRM: ${orders.length}`);

        if (!orders.length) return;

        // 2. Подготовка данных для Supabase (Mapping)
        const ordersToInsert = orders.map(order => ({
            crm_id: order.id,
            number: order.number,
            status: order.status,
            total_sum: order.totalSum,
            customer_name: order.firstName || 'Не указано',
            crm_created_at: order.createdAt
        }));

        // 3. Сохранение в Supabase
        // Используем upsert, чтобы обновлять существующие и добавлять новые
        // onConflict: 'crm_id' говорит базе ориентироваться на этот столбец
        const { data, error } = await supabase
            .from('orders')
            .upsert(ordersToInsert, { onConflict: 'crm_id' });

        if (error) throw error;

        console.log('✅ Данные успешно синхронизированы с Supabase!');

    } catch (err) {
        console.error('❌ Ошибка при выполнении:', err.message);
    }
}

syncOrders();