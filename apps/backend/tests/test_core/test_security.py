import pytest

from app.core.security import get_password_hash, verify_password


def test_bcrypt_hash_roundtrip():
    password = "OperadorDemo2026!"

    password_hash = get_password_hash(password)

    assert password_hash.startswith("$2b$")
    assert verify_password(password, password_hash)
    assert not verify_password("clave-incorrecta", password_hash)


def test_bcrypt_rejects_passwords_longer_than_72_bytes():
    long_password = "x" * 73

    with pytest.raises(ValueError, match="72 bytes"):
        get_password_hash(long_password)

    valid_hash = get_password_hash("x" * 72)
    assert not verify_password(long_password, valid_hash)


def test_verify_password_handles_invalid_hash():
    assert not verify_password("secret", "not-a-bcrypt-hash")
