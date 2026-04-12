import json
import requests

API_URL = "https://bbeissenbayev.retailcrm.ru/api/v5/orders/upload"
API_KEY = "pMz8tBGttLMdWT4YL2L7KgbrloYScHPe"

# читаем файл
with open("mock_orders.json", "r", encoding="utf-8") as f:
    raw_orders = json.load(f)

def transform(order, index):
    return {
        "externalId": f"test-order-{index}",
        "firstName": order.get("firstName"),
        "lastName": order.get("lastName"),
        "phone": order.get("phone"),
        "email": order.get("email"),
        #"orderType": order.get("orderType"),
        "orderMethod": order.get("orderMethod"),
        "status": order.get("status"),
        "items": [
            {
                "initialPrice": item["initialPrice"],
                "quantity": item["quantity"],
                "offer": {
                    "externalId": item["productName"]
                }
            }
            for item in order.get("items", [])
        ],
        "delivery": {
            "address": {
                "countryIso": "KZ",
                "city": order["delivery"]["address"].get("city"),
                "text": order["delivery"]["address"].get("text")
            }
        },
        "customFields": order.get("customFields", {})
    }

orders = [transform(o, i) for i, o in enumerate(raw_orders, 1)]

# ВАЖНО: RetailCRM требует string
response = requests.post(API_URL, data={
    "apiKey": API_KEY,
    "orders": json.dumps(orders)
})

print(response.json())