"""One call for every assistant provider: Claude (Anthropic), Gemini (Google), DeepSeek.

The provider SDKs are imported lazily so the API runs without them; the assistant simply
reports itself unavailable when no key is configured. Defaults follow the provider
documentation current at the time of writing; override with AI_MODEL.
"""
from __future__ import annotations

from dataclasses import dataclass

from enermod_api.config import get_settings

DEFAULT_MODELS = {"claude": "claude-opus-5-5", "gemini": "gemini-2.5-flash", "deepseek": "deepseek-chat"}
PROVIDER_ORDER = ("claude", "gemini", "deepseek")


class LLMUnavailable(RuntimeError):
    pass


@dataclass
class LLMResult:
    text: str
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    refused: bool = False


def available_provider() -> tuple[str, str] | None:
    """(provider, api key) for the configured or first available provider, else None."""
    s = get_settings()
    if s.ai_provider == "none":
        return None
    if s.ai_provider in DEFAULT_MODELS:
        key = s.ai_keys.get(s.ai_provider, "")
        return (s.ai_provider, key) if key else None
    for p in PROVIDER_ORDER:
        if s.ai_keys.get(p):
            return p, s.ai_keys[p]
    return None


def _claude(system: str, messages: list[dict], key: str, model: str, max_tokens: int) -> LLMResult:
    import anthropic
    client = anthropic.Anthropic(api_key=key)
    kwargs = dict(
        model=model, max_tokens=max_tokens,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        output_config={"effort": get_settings().ai_effort},
    )
    try:
        # Server-side fallback: if the model declines a request on policy grounds the API re-runs
        # it on a substitute model inside the same call (see the Anthropic refusal docs).
        resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
    except TypeError:           # older SDK without the fallbacks parameter
        resp = client.messages.create(**kwargs)
    text = "".join(getattr(b, "text", "") for b in resp.content if getattr(b, "type", "") == "text")
    u = getattr(resp, "usage", None)
    inp = int(getattr(u, "input_tokens", 0) or 0) + int(getattr(u, "cache_read_input_tokens", 0) or 0) \
        + int(getattr(u, "cache_creation_input_tokens", 0) or 0)
    return LLMResult(text=text, provider="claude", model=getattr(resp, "model", model), input_tokens=inp,
                     output_tokens=int(getattr(u, "output_tokens", 0) or 0),
                     refused=getattr(resp, "stop_reason", "") == "refusal")


def _gemini(system: str, messages: list[dict], key: str, model: str, max_tokens: int) -> LLMResult:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=key)
    contents = [types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["content"])])
                for m in messages]
    resp = client.models.generate_content(
        model=model, contents=contents,
        config=types.GenerateContentConfig(system_instruction=system, temperature=0.2, max_output_tokens=max_tokens))
    um = getattr(resp, "usage_metadata", None)
    return LLMResult(text=resp.text or "", provider="gemini", model=model,
                     input_tokens=int(getattr(um, "prompt_token_count", 0) or 0),
                     output_tokens=int(getattr(um, "candidates_token_count", 0) or 0))


def _deepseek(system: str, messages: list[dict], key: str, model: str, max_tokens: int) -> LLMResult:
    from openai import OpenAI
    client = OpenAI(api_key=key, base_url="https://api.deepseek.com")
    resp = client.chat.completions.create(model=model, temperature=0.2, max_tokens=max_tokens,
                                          messages=[{"role": "system", "content": system}] + messages)
    u = getattr(resp, "usage", None)
    return LLMResult(text=resp.choices[0].message.content or "", provider="deepseek", model=model,
                     input_tokens=int(getattr(u, "prompt_tokens", 0) or 0),
                     output_tokens=int(getattr(u, "completion_tokens", 0) or 0))


_CALLERS = {"claude": _claude, "gemini": _gemini, "deepseek": _deepseek}


def complete(system: str, messages: list[dict], max_tokens: int | None = None) -> LLMResult:
    """Answer with the configured provider. Raises LLMUnavailable when none is configured."""
    picked = available_provider()
    if not picked:
        raise LLMUnavailable("No assistant provider is configured on this deployment")
    provider, key = picked
    s = get_settings()
    model = s.ai_model or DEFAULT_MODELS[provider]
    return _CALLERS[provider](system, messages, key, model, max_tokens or s.chat_max_output_tokens)
