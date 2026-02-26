import requests, json

url = 'http://127.0.0.1:8000/api/v1/nodes'
payload = {
    "hardware_id": "TESTNODE123",
    "device_label": "Test Node",
    "device_type": "sensor",
    "analytics_type": "EvaraTank",
    "lat": 12.34,
    "lng": 56.78,
    "thingspeak_mappings": [
        {
            "channel_id": "12345",
            "read_api_key": "test_read_key",
            "write_api_key": "test_write_key",
            "field_mapping": {"level": "field1"}
        }
    ]
}

response = requests.post(url, json=payload)
print('Status code:', response.status_code)
print('Response:', response.text)
