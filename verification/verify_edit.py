
import asyncio
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

PORT = 8000
SCREENSHOT_PATH = "verification/edit_error_with_log.png"

# --- Server Setup ---
class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Silences the server logs for cleaner output

def run_server():
    with socketserver.TCPServer(("", PORT), QuietHTTPRequestHandler) as httpd:
        httpd.serve_forever()

# --- Main Verification Logic ---
def run_verification():
    console_logs = []
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            # Listen for all console events and store them
            page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

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
                # 4. Wait for the user table to be populated
                page.wait_for_selector(".user-table tbody tr", timeout=10000)

                # 5. Click the first edit button
                first_edit_button = page.query_selector(".action-btn.edit")
                if not first_edit_button:
                    raise Exception("Could not find the edit button.")
                first_edit_button.click()

                # 6. Wait for the modal to appear
                page.wait_for_selector("#user-form-modal", state="visible")

                # 7. Change the phone number
                phone_input = page.locator("#telefono")
                phone_input.fill("987654321")

                # 8. Click save
                page.click(".form-submit-btn")

                # 9. Wait a bit for the fetch to likely complete
                page.wait_for_timeout(2000)

            except (PlaywrightTimeoutError, Exception) as e:
                print(f"An error occurred during interaction: {e}")

            finally:
                # 10. Take screenshot and close
                page.screenshot(path=SCREENSHOT_PATH)
                print(f"Screenshot saved to {SCREENSHOT_PATH}")
                browser.close()

    finally:
        # The server is a daemon thread, so it will stop automatically.
        # Print all captured console logs at the end.
        print("\n--- CAPTURED CONSOLE LOGS ---")
        if console_logs:
            for log in console_logs:
                print(log)
        else:
            print("No console logs were captured.")
        print("-----------------------------\n")

if __name__ == "__main__":
    run_verification()
