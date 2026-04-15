MODULE_NAMES = [
    "auth",
    "readers",
    "catalog",
    "inventory",
    "orders",
    "robot_sim",
    "recommendation",
    "conversation",
    "learning",
    "voice",
    "analytics",
    "admin",
]

MODULE_TAGS = [{"name": name, "description": f"{name} module"} for name in MODULE_NAMES]
