from pydantic import BaseModel


class UserSyncResponse(BaseModel):
    user_id: str
    email: str
    roles: list[str]
    is_new_user: bool


class CurrentUserRolesResponse(BaseModel):
    user_id: str
    email: str
    roles: list[str]
