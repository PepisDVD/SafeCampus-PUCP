def test_listar_incidentes(client):
    response = client.get("/api/v1/incidentes?limit=2")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert payload["items"][0]["codigo"].startswith("INC-")
