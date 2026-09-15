import requests

from app.core.config import settings


class BufferIntegration:

    API_URL = "https://api.buffer.com"

    # Buffer X/Twitter channel
    TWITTER_CHANNEL_ID = "6aa7983bea19ca0bde3c7173"

    def __init__(self, social_account=None):
        self.social_account = social_account

    def _request(self, query: str, variables: dict | None = None):
        if not settings.buffer_api_key:
            raise Exception(
                "BUFFER_API_KEY is not configured"
            )

        response = requests.post(
            self.API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": (
                    f"Bearer {settings.buffer_api_key}"
                ),
            },
            json={
                "query": query,
                "variables": variables or {},
            },
            timeout=30,
        )

        if response.status_code != 200:
            raise Exception(
                "Buffer API request failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        # GraphQL-level errors
        if data.get("errors"):
            raise Exception(
                f"Buffer GraphQL error: {data['errors']}"
            )

        return data

    def publish_post(
        self,
        content: str,
        media=None,
    ):
        """
        Publish a text post to the connected X/Twitter
        channel through Buffer.
        """

        query = """
        mutation CreateSocialPilotPost(
            $input: CreatePostInput!
        ) {
            createPost(input: $input) {

                ... on PostActionSuccess {
                    post {
                        id
                        text
                        dueAt
                        status
                    }
                }

                ... on MutationError {
                    message
                }
            }
        }
        """

        variables = {
            "input": {
                "text": content,
                "channelId": self.TWITTER_CHANNEL_ID,
                "schedulingType": "automatic",
                "mode": "shareNow",
            }
        }

        data = self._request(
            query=query,
            variables=variables,
        )

        result = data["data"]["createPost"]

        # Buffer returned a typed mutation error
        if result.get("message"):
            raise Exception(
                "Buffer post creation failed: "
                f"{result['message']}"
            )

        post = result.get("post")

        if not post:
            raise Exception(
                "Buffer did not return a created post"
            )

        buffer_post_id = post["id"]

        return {
            "platform": "twitter",
            "status": "published",
            "buffer_post_id": buffer_post_id,
            "twitter_post_id": buffer_post_id,
            "post_id": buffer_post_id,
            "message": (
                "X/Twitter post published "
                "through Buffer successfully"
            ),
            "due_at": post.get("dueAt"),
            "buffer_status": post.get("status"),
            "response": post,
        }

    def delete_post(
        self,
        buffer_post_id: str,
    ):
        """
        Delete the Buffer post using its Buffer post ID.
        """

        query = """
        mutation DeleteSocialPilotPost(
            $input: DeletePostInput!
        ) {
            deletePost(input: $input) {

                ... on DeletePostSuccess {
                    id
                }

                ... on MutationError {
                    message
                }
            }
        }
        """

        variables = {
            "input": {
                "id": buffer_post_id,
            }
        }

        data = self._request(
            query=query,
            variables=variables,
        )

        result = data["data"]["deletePost"]

        # Buffer returned a typed mutation error
        if result.get("message"):
            raise Exception(
                "Buffer post deletion failed: "
                f"{result['message']}"
            )

        deleted_id = result.get("id")

        if not deleted_id:
            raise Exception(
                "Buffer did not confirm post deletion"
            )

        return {
            "platform": "twitter",
            "status": "deleted",
            "buffer_post_id": deleted_id,
            "twitter_post_id": deleted_id,
            "post_id": deleted_id,
            "message": (
                "X/Twitter post deleted "
                "through Buffer successfully"
            ),
            "response": result,
        }