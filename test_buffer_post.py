import requests

from app.core.config import settings


channel_id = "6aa7983bea19ca0bde3c7173"

query = """
mutation TestBufferPost {
  createPost(input: {
    text: "Testing SocialPilot Buffer integration 🚀"
    channelId: "%s"
    schedulingType: automatic
    mode: addToQueue
  }) {
    ... on PostActionSuccess {
      post {
        id
        text
        dueAt
      }
    }
    ... on MutationError {
      message
    }
  }
}
""" % channel_id


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