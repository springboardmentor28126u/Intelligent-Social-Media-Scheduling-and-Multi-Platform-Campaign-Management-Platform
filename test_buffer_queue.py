import requests

from app.core.config import settings


CHANNEL_ID = "6aa7983bea19ca0bde3c7173"


query = """
mutation CreateTestPost {
    createPost(
        input: {
            text: "SocialPilot deletion test - PLEASE DELETE"
            channelId: "6aa7983bea19ca0bde3c7173"
            schedulingType: automatic
            mode: addToQueue
        }
    ) {
        ... on PostActionSuccess {
            post {
                id
                text
                status
                dueAt
                allowedActions
            }
        }

        ... on MutationError {
            message
        }
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
    },
    timeout=30,
)


print("Status:", response.status_code)
print("Response:")
print(response.text)