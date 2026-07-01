from app.core.auth_policy import (
    NO_ROLE_MESSAGE,
    AuthChannel,
    evaluate_channel_access,
    is_anomalous_combination,
)


def test_comunidad_entra_por_web():
    result = evaluate_channel_access(["comunidad"], AuthChannel.WEB)
    assert result.allowed
    assert result.effective_roles == ["comunidad"]
    assert not result.is_anomalous


def test_operador_rechazado_en_web():
    result = evaluate_channel_access(["operador"], AuthChannel.WEB)
    assert not result.allowed
    assert result.denied_message == "Esta cuenta es de operador; ingrese por la app móvil."


def test_operador_entra_por_movil():
    result = evaluate_channel_access(["operador"], AuthChannel.MOBILE)
    assert result.allowed
    assert result.effective_roles == ["operador"]


def test_rol_web_rechazado_en_movil():
    result = evaluate_channel_access(["supervisor"], AuthChannel.MOBILE)
    assert not result.allowed
    assert result.denied_message == "Esta cuenta no es de operador; ingrese por la web."


def test_sin_rol_es_denegado_en_ambos_canales():
    for channel in (AuthChannel.WEB, AuthChannel.MOBILE):
        result = evaluate_channel_access([], channel)
        assert not result.allowed
        assert result.denied_message == NO_ROLE_MESSAGE


def test_combinacion_anomala_permite_por_su_canal_y_se_marca():
    roles = ["operador", "supervisor"]
    assert is_anomalous_combination(roles)

    web = evaluate_channel_access(roles, AuthChannel.WEB)
    assert web.allowed
    assert web.effective_roles == ["supervisor"]
    assert web.is_anomalous

    movil = evaluate_channel_access(roles, AuthChannel.MOBILE)
    assert movil.allowed
    assert movil.effective_roles == ["operador"]
    assert movil.is_anomalous


def test_roles_del_otro_canal_no_aplican():
    # Un usuario web con varios roles solo opera con los válidos del canal web.
    result = evaluate_channel_access(["operador", "comunidad", "administrador"], AuthChannel.WEB)
    assert result.allowed
    assert result.effective_roles == ["comunidad", "administrador"]
