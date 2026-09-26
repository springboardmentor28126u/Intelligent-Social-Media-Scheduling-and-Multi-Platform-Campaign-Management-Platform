import requests

from app.core.config import settings


POST_ID = "6aa7b4cd60c11f90a1c7cd3f"

query = """
query GetPost($input: PostInput!) {
    post(input: $input) {
        id
        text
        status
        dueAt
        channelId
        channelService
        allowedActions
    }
}
"""

response = requests.post(
    "https://api.buffer.com",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.buffer_api_key}",
    },
    json={
        "query": query,
        "variables": {
            "input": {
                "id": POST_ID
            }
        },
    },
    timeout=30,
)

print("Status:", response.status_code)
print("Response:")
print(response.text)