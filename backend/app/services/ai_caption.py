import os

import httpx
from dotenv import load_dotenv


load_dotenv()


class CaptionGenerationError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


async def generate_caption(topic: str, platform: str, tone: str) -> str:
    prompt = (
        f"Write one original social media caption for {platform} in a {tone.lower()} tone, "
        "followed by 5 to 8 relevant hashtags on a separate line. Keep both appropriate for "
        "the platform. Base factual claims only on the topic provided; do not invent product "
        "features, statistics, offers, or links. Return only the caption and hashtags; do not "
        "add labels, numbering, or explanations. Every hashtag must start with #.\n\n"
        f"Topic or product description: {topic}"
    )
    return await _generate_text(prompt)


async def rewrite_post(content: str, style: str) -> str:
    style_instructions = {
        "Professional": "Rewrite in a polished, professional tone.",
        "Friendly": "Rewrite in a warm, approachable, friendly tone.",
        "Promotional": "Rewrite persuasively to highlight the value and encourage interest, without inventing offers or claims.",
        "Casual": "Rewrite in a relaxed, conversational tone.",
        "Shorten": "Make the text more concise while preserving its key information and intent.",
        "Expand": "Expand the text with useful context and detail while preserving its meaning. Do not invent facts.",
        "Improve Grammar": "Correct grammar, spelling, and punctuation while preserving the original voice and meaning.",
    }
    instruction = style_instructions[style]
    prompt = (
        f"{instruction} Preserve the original meaning, factual details, names, URLs, and hashtags. "
        "Do not add explanations, quotation marks, labels, or commentary. Return only the rewritten text.\n\n"
        f"Original post content:\n{content}"
    )
    return await _generate_text(
        prompt,
        system_prompt=(
            "You carefully rewrite social media content according to the user's instructions."
        ),
        max_tokens=1200,
    )


async def _generate_text(
    prompt: str,
    system_prompt: str = (
        "You write clear, engaging social media copy with concise, relevant hashtags."
    ),
    max_tokens: int = 300,
) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise CaptionGenerationError(
            "AI writing is not configured. Set GROQ_API_KEY in backend/.env.",
            503,
        )

    model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt,
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.8,
                    "max_tokens": max_tokens,
                },
            )
    except httpx.TimeoutException as exc:
        raise CaptionGenerationError(
            "The Groq AI service timed out. Please try again.",
            504,
        ) from exc
    except httpx.HTTPError as exc:
        raise CaptionGenerationError(
            "Could not connect to the Groq AI service. Please try again.",
            502,
        ) from exc

    if response.status_code == 429:
        raise CaptionGenerationError(
            "Groq rate limit or API quota reached. Check your Groq account limits and try again.",
            503,
        )
    if response.status_code in (401, 403):
        raise CaptionGenerationError(
            "Groq rejected the API key. Check GROQ_API_KEY in backend/.env.",
            502,
        )
    if response.status_code == 404:
        raise CaptionGenerationError(
            f"Groq could not find model '{model}'. Update GROQ_MODEL in backend/.env "
            "to an active model available to your Groq account.",
            502,
        )
    if response.status_code >= 400:
        raise CaptionGenerationError(
            f"The Groq AI service returned an error (HTTP {response.status_code}).",
            502,
        )

    try:
        result = response.json()
    except ValueError as exc:
        raise CaptionGenerationError(
            "The Groq AI service returned an invalid response.",
            502,
        ) from exc

    choices = result.get("choices") if isinstance(result, dict) else None
    first_choice = choices[0] if isinstance(choices, list) and choices else None
    message = first_choice.get("message") if isinstance(first_choice, dict) else None
    caption = message.get("content") if isinstance(message, dict) else None
    if not isinstance(caption, str) or not caption.strip():
        raise CaptionGenerationError(
            "The Groq AI service did not return any text.",
            502,
        )

    caption = caption.strip()
    if len(caption) > 5000:
        raise CaptionGenerationError(
            "The Groq AI service returned text that is too long.",
            502,
        )

    return caption
