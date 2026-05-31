#!/usr/bin/env python3
"""Test CORS headers for local development."""

import httpx
import asyncio

BASE_URL = "http://localhost:8000"

async def test_cors_headers():
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("Testing CORS headers for /api/whisper-verify")
        print("=" * 60)
        
        # Test 1: OPTIONS preflight request
        print("\n[TEST 1] OPTIONS preflight request")
        print("-" * 60)
        try:
            response = await client.options(
                f"{BASE_URL}/api/whisper-verify",
                headers={
                    "Origin": "https://tooth-stream.vercel.app",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                }
            )
            print(f"Status: {response.status_code}")
            cors_headers = {
                k: v for k, v in response.headers.items()
                if k.lower().startswith("access-control")
            }
            if cors_headers:
                print("CORS Headers:")
                for k, v in cors_headers.items():
                    print(f"  {k}: {v}")
            else:
                print("❌ NO CORS headers found!")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Test 2: POST request (actual request)
        print("\n[TEST 2] POST request")
        print("-" * 60)
        try:
            response = await client.post(
                f"{BASE_URL}/api/whisper-verify",
                json={"text": "test", "audio_url": "test"},
                headers={
                    "Origin": "https://tooth-stream.vercel.app",
                    "Content-Type": "application/json",
                }
            )
            print(f"Status: {response.status_code}")
            cors_headers = {
                k: v for k, v in response.headers.items()
                if k.lower().startswith("access-control")
            }
            if cors_headers:
                print("CORS Headers:")
                for k, v in cors_headers.items():
                    print(f"  {k}: {v}")
            else:
                print("❌ NO CORS headers found!")
        except Exception as e:
            print(f"Error (expected if data invalid): {e}")
        
        print("\n" + "=" * 60)
        print("Test complete!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_cors_headers())
