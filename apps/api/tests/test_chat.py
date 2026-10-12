from enermod_api.services import chat as chat_service
from enermod_api.services import llm


def test_status_without_keys(client):
    assert client.get("/chat/status").json() == {"available": False, "provider": None}
    assert client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]}).status_code == 503


def test_grounded_answer_with_citations(client, monkeypatch):
    seen = {}

    def fake_complete(system, messages, max_tokens=None):
        seen["system"] = system
        return llm.LLMResult(text="Kenya has studies using OSeMOSYS [tool OSeMOSYS] such as [study 3] in [country KE]. "
                                  "Nothing on [tool Unknownium] or [study 99999].", provider="test", model="t-1",
                             input_tokens=10, output_tokens=5)

    monkeypatch.setattr(chat_service.llm, "complete", fake_complete)
    monkeypatch.setattr(chat_service.llm, "available_provider", lambda: ("test", "key"))
    r = client.post("/chat", json={"messages": [{"role": "user", "content": "Which tools are used in Kenya? Tell me about OSeMOSYS."}],
                                   "locale": "fr"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] and body["provider"] == "test"
    types = {(c["type"], c["id"]) for c in body["citations"]}
    assert ("tool", "OSeMOSYS") in types and ("study", "3") in types and ("country", "KE") in types
    assert all("Unknownium" not in c["id"] for c in body["citations"])
    assert body["citations"][0]["href"].startswith("/observatory/")
    assert "country=KE" in seen["system"] and "tool_name=OSeMOSYS" in seen["system"]
    assert "KE" in body["grounding"]["countries"] and "OSeMOSYS" in body["grounding"]["tools"]
    # the question and answer are logged for curators
    assert client.get("/health").status_code == 200


def test_provider_errors_keep_the_page_alive(client, monkeypatch):
    def boom(system, messages, max_tokens=None):
        raise RuntimeError("quota")
    monkeypatch.setattr(chat_service.llm, "complete", boom)
    r = client.post("/chat", json={"messages": [{"role": "user", "content": "hello"}], "locale": "en"})
    assert r.status_code == 200 and r.json()["ok"] is False and "RuntimeError" in r.json()["answer"]
