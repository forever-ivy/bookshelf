import asyncio
import json

import websockets


WS_URL = "ws://127.0.0.1:8000/api/voice/ws/device/device-001"


async def main():
    while True:
        try:
            async with websockets.connect(WS_URL) as ws:
                print(f"Connected: {WS_URL}")
                while True:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    print("Recv:", data)

                    if data.get("type") == "command":
                        command_id = data.get("command_id")
                        for status in ("accepted", "running", "done"):
                            await ws.send(
                                json.dumps(
                                    {
                                        "type": "status",
                                        "command_id": command_id,
                                        "status": status,
                                        "detail": "mock device",
                                    }
                                )
                            )
                            await asyncio.sleep(1)
        except Exception as exc:
            print("Disconnected:", exc)
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
