import importlib

import app.main as main


def test_configured_frontend_origin_only(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://portfolio.onrender.com/")
    try:
        app = importlib.reload(main).app
        cors = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")
        assert cors.kwargs["allow_origins"] == ["https://portfolio.onrender.com"]
        assert cors.kwargs["allow_methods"] == ["GET", "POST"]
        assert cors.kwargs["allow_headers"] == ["Content-Type"]
    finally:
        monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
        importlib.reload(main)
