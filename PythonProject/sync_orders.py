import requests
from supabase import create_client, Client

# --- RetailCRM ---
CRM_URL = "https://bbeissenbayev.retailcrm.ru/api/v5/orders"
API_KEY = "pMz8tBGttLMdWT4YL2L7KgbrloYScHPe"

# --- Supabase ---
SUPABASE_URL = "https://qmibtjwgqadzpiosblpc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaWJ0andncWFkenBpb3NibHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Mjc3MTgsImV4cCI6MjA5MTUwMzcxOH0.0KHw5BBhVGtf7TVW-ZmeuHrnhwrH9vn-JMTMq88x7Rk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_orders():
    response = requests.get(CRM_URL, params={
        "apiKey": API_KEY,
        "limit": 50
    })
    data = response.json()
    return data.get("orders", [])


def transform(order):
    total = sum(
        item["initialPrice"] * item["quantity"]
        for item in order.get("items", [])
    )

    return {
        "external_id": order.get("externalId"),
        "first_name": order.get("firstName"),
        "last_name": order.get("lastName"),
        "phone": order.get("phone"),
        "email": order.get("email"),
        "status": order.get("status"),
        "city": order.get("delivery", {}).get("address", {}).get("city"),
        "total": total
    }


def insert_to_supabase(rows):
    result = supabase.table("orders").insert(rows).execute()
    print(result)


if __name__ == "__main__":
    orders = get_orders()

    print(f"Получено заказов: {len(orders)}")

    rows = [transform(o) for o in orders]

    insert_to_supabase(rows)