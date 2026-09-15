import requests

from app.core.config import settings


buffer_post_id = "6aa79d8fd36607a6921fa6fa"

query = """
mutation DeleteBufferPost {
  deletePost(input: {
    id: "%s"
  }) {
    ... on DeletePostSuccess {
      id
    }
    ... on MutationError {
      message
    }
  }
}
""" % buffer_post_id


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