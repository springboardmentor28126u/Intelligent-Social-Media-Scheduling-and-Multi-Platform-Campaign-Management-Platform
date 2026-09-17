import requests

from app.core.config import settings


organization_id = "6aa7967fd95ca9528594db8b"

query = """
query GetChannels {
  channels(input: {
    organizationId: "%s"
  }) {
    id
    name
    displayName
    service
    isQueuePaused
  }
}
""" % organization_id


response = requests.post(
    "https://api.buffer.com",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.buffer_api_key}",
    },
    json={
        "query": query,
    },
)


print("Status:", response.status_code)
print("Response:")
print(response.text)