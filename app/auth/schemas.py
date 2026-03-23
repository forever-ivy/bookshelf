from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    role: Literal["admin", "reader"]


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class AuthAccountOut(BaseModel):
    id: int
    username: str
    role: str
    role_codes: list[str] | None = None
    permission_codes: list[str] | None = None


class AuthProfileOut(BaseModel):
    id: int
    display_name: str
    affiliation_type: str | None = None
    college: str | None = None
    major: str | None = None
    grade_year: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    account: AuthAccountOut
    profile: AuthProfileOut | None = None


class IdentityResponse(BaseModel):
    account_id: int
    role: str
    profile_id: int | None = None
    account: AuthAccountOut
    profile: AuthProfileOut | None = None
