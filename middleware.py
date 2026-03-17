"""
middleware.py
Flask after_request 中间件：统一 JSON 响应格式包装。
"""

from flask import jsonify
from extensions import success_envelope, error_envelope, is_envelope_payload


def _extract_error_details(payload):
    if not isinstance(payload, dict):
        return None

    details = {}
    code = payload.get("code")
    raw_error = payload.get("error")
    if isinstance(raw_error, dict):
        details.update(raw_error)
        code = code or raw_error.get("code")

    extra = {
        key: value
        for key, value in payload.items()
        if key not in {"ok", "data", "msg", "message", "error", "code"}
    }
    if extra:
        details["details"] = extra
    if payload.get("data") not in (None, {}):
        details.setdefault("details", payload.get("data"))
    if code:
        details["code"] = code
    return details or None


def _normalize_json_payload(payload, status_code):
    if is_envelope_payload(payload):
        return payload

    declared_ok = payload.get("ok") if isinstance(payload, dict) and isinstance(payload.get("ok"), bool) else None
    effective_ok = declared_ok if declared_ok is not None else status_code < 400

    if effective_ok:
        message = None
        data = payload
        if isinstance(payload, dict):
            message = payload.get("message") or payload.get("msg")
            if "data" in payload and set(payload.keys()).issubset({"ok", "data", "message", "msg"}):
                data = payload.get("data")
            else:
                data = {
                    key: value
                    for key, value in payload.items()
                    if key not in {"ok", "message", "msg"}
                }
                if not data:
                    data = None
        envelope = success_envelope(data=data, message=message)
        return envelope

    message = f"Request failed with status {status_code}"
    if isinstance(payload, dict):
        message = (
            payload.get("message")
            or payload.get("msg")
            or (payload.get("error") if isinstance(payload.get("error"), str) else None)
            or message
        )
    elif isinstance(payload, str) and payload:
        message = payload

    details = _extract_error_details(payload)
    code = details.pop("code", None) if details else None
    return error_envelope(message, code=code, details=details.get("details") if details else None)


def register_middleware(app):
    """注册 after_request 中间件到 Flask app。"""

    @app.after_request
    def _wrap_json_response(response):
        if response.is_streamed or response.mimetype != "application/json":
            return response

        payload = response.get_json(silent=True)
        raw_body = response.get_data(as_text=True).strip()
        if payload is None and raw_body != "null":
            return response

        normalized = success_envelope(data=None) if payload is None else _normalize_json_payload(payload, response.status_code)
        if normalized == payload:
            return response

        wrapped = jsonify(normalized)
        wrapped.status_code = response.status_code
        for key, value in response.headers.items():
            if key.lower() not in {"content-length", "content-type"}:
                wrapped.headers[key] = value
        return wrapped
