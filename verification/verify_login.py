
import asyncio
from playwright.sync_api import sync_playwright, expect, Page

SCREENSHOT_PATH = "verification/login_success.png"

def verify_login_flow(page: Page):
    """
    Verifies that a user can log in via the form.
    """
    print("Iniciando verificación del flujo de login...")

    # 1. Esperar a que el modal de login sea visible
    login_modal = page.locator("#login-modal")
    expect(login_modal).to_be_visible(timeout=15000)
    print("Modal de login es visible.")

    # 2. Rellenar credenciales (usar credenciales de prueba válidas)
    page.locator("#username").fill("w_ventura")
    page.locator("#password").fill("w_ventura")
    print("Credenciales introducidas.")

    # 3. Hacer clic en el botón de acceder
    page.locator("#login-form button[type='submit']").click()
    print("Botón de 'Acceder' clickeado.")

    # 4. Verificar que el modal de login desaparece
    expect(login_modal).to_be_hidden(timeout=10000)
    print("Modal de login se ha ocultado.")

    # 5. Verificar que el mensaje de bienvenida es visible
    welcome_message = page.locator("#welcome-message")
    expect(welcome_message).to_be_visible()
    expect(welcome_message).to_contain_text("Bienvenido")
    print("Mensaje de bienvenida es visible.")

    # Tomar captura de pantalla final
    page.screenshot(path=SCREENSHOT_PATH)
    print(f"Captura de pantalla de éxito guardada en {SCREENSHOT_PATH}")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(base_url="http://localhost:8000")
        page = context.new_page()

        try:
            # Usar add_init_script para garantizar que localStorage esté limpio ANTES de que se ejecute el JS de la página
            page.add_init_script("localStorage.clear();")

            page.goto("/index.html")
            verify_login_flow(page)
            print("\n✅ Verificación de login completada exitosamente.")
        except Exception as e:
            print(f"\n❌ Error durante la verificación de login: {e}")
            page.screenshot(path="verification/login_error.png")
        finally:
            browser.close()
