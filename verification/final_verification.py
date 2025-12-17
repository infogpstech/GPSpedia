
import asyncio
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright, expect, TimeoutError as PlaywrightTimeoutError

PORT = 8000
SCREENSHOT_PATH = "verification/final_verification.png"

# --- Main Verification Logic ---
def run_verification():
    console_logs = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            # 1. Go to the page
            page.goto(f"http://localhost:{PORT}/users.html", wait_until="domcontentloaded")

            # 2. Inject session state
            session_data = {
                "user": {
                    "nombre": "Test Developer",
                    "nombreUsuario": "test_dev",
                    "privilegios": "Desarrollador"
                },
                "token": "fake_token_for_testing"
            }
            page.evaluate(f"""
                localStorage.setItem('gpsepedia_session', JSON.stringify({session_data}));
            """)

            # 3. Reload to apply session
            page.reload()

            try:
                # 4. Wait for the user table to be populated and assert it's visible
                user_table = page.locator(".user-table tbody")
                expect(user_table).to_be_visible(timeout=10000)
                print("Verification successful: User table is visible.")

            except (PlaywrightTimeoutError, Exception) as e:
                print(f"An error occurred during interaction: {e}")

            finally:
                # 5. Take screenshot and close
                page.screenshot(path=SCREENSHOT_PATH)
                print(f"Screenshot saved to {SCREENSHOT_PATH}")
                browser.close()

    finally:
        pass

if __name__ == "__main__":
    run_verification()
