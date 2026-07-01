from app.integrations.messaging.providers.evolution import EvolutionWhatsAppProvider


def test_evolution_provider_normalizes_text_message():
    provider = EvolutionWhatsAppProvider()

    message = provider.parse_incoming_webhook(
        {
            "event": "messages.upsert",
            "instance": "safecampus-dev",
            "data": {
                "key": {
                    "id": "MSG-1",
                    "remoteJid": "51999999999@s.whatsapp.net",
                    "fromMe": False,
                },
                "pushName": "Alumno PUCP",
                "message": {"conversation": "Hay una emergencia cerca a biblioteca"},
            },
        }
    )

    assert message.provider == "evolution"
    assert message.external_message_id == "MSG-1"
    assert message.instance_name == "safecampus-dev"
    assert message.sender_phone == "51999999999"
    assert message.sender_name == "Alumno PUCP"
    assert message.text == "Hay una emergencia cerca a biblioteca"
    assert message.message_type == "text"
    assert message.is_group is False


def test_evolution_provider_captures_shared_location():
    provider = EvolutionWhatsAppProvider()

    message = provider.parse_incoming_webhook(
        {
            "event": "messages.upsert",
            "instance": "safecampus-dev",
            "data": {
                "key": {
                    "id": "MSG-LOC",
                    "remoteJid": "51999999999@s.whatsapp.net",
                    "fromMe": False,
                },
                "pushName": "Alumno PUCP",
                "message": {
                    "locationMessage": {
                        "degreesLatitude": -12.0701,
                        "degreesLongitude": -77.0802,
                    }
                },
            },
        }
    )

    assert message.message_type == "location"
    assert message.latitud == -12.0701
    assert message.longitud == -77.0802
    assert message.has_location is True
    assert message.content_for_storage == "📍 Ubicación compartida"


def test_evolution_provider_captures_live_location():
    provider = EvolutionWhatsAppProvider()

    message = provider.parse_incoming_webhook(
        {
            "event": "messages.upsert",
            "instance": "safecampus-dev",
            "data": {
                "key": {
                    "id": "MSG-LIVE",
                    "remoteJid": "51999999999@s.whatsapp.net",
                    "fromMe": False,
                },
                "message": {
                    "liveLocationMessage": {
                        "degreesLatitude": -12.05,
                        "degreesLongitude": -77.05,
                    }
                },
            },
        }
    )

    assert message.has_location is True
    assert message.latitud == -12.05
    assert message.longitud == -77.05


def test_evolution_provider_detects_group_message_and_sender_participant():
    provider = EvolutionWhatsAppProvider()

    message = provider.parse_incoming_webhook(
        {
            "event": "messages.upsert",
            "instance": "safecampus-dev",
            "data": {
                "key": {
                    "id": "MSG-GROUP-1",
                    "remoteJid": "120363000000000000@g.us",
                    "participant": "51999999999@s.whatsapp.net",
                    "fromMe": False,
                },
                "pushName": "Alumno PUCP",
                "message": {"conversation": "Mensaje en grupo"},
            },
        }
    )

    assert message.is_group is True
    assert message.chat_id == "120363000000000000@g.us"
    assert message.sender_phone == "51999999999"
