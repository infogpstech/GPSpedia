
import asyncio
from playwright.sync_api import sync_playwright, expect, Page

SCREENSHOT_PATH = "verification/supervisor_view.png"

def verify_supervisor_permissions(page: Page):
    """
    Verifies the UI and permissions for a Supervisor user.
    """
    print("Iniciando verificación para el rol de Supervisor...")

    # 1. Inyectar sesión de Supervisor
    supervisor_session = {
        "user": { "nombre": "Test Supervisor", "nombreUsuario": "test_sup", "privilegios": "Supervisor" },
        "token": "fake_supervisor_token"
    }
    page.evaluate(f"localStorage.setItem('gpsepedia_session', JSON.stringify({supervisor_session}));")

    # 2. Recargar la página para aplicar la sesión
    page.reload()
    print("Sesión de Supervisor inyectada y página recargada.")

    # 3. Verificar que la tabla de usuarios es visible
    user_table_body = page.locator(".user-table tbody")
    expect(user_table_body).to_be_visible(timeout=10000)
    print("Tabla de usuarios visible.")

    # 4. Verificar que solo se muestran usuarios 'Tecnico'
    rows = user_table_body.locator("tr").all()
    print(f"Encontradas {len(rows)} filas en la tabla.")
    expect(len(rows)).to_be_greater_than(0) # Asumimos que hay al menos un técnico

    for row in rows:
        role_cell = row.locator("td[data-label='Rango']")
        role_text = role_cell.inner_text()
        expect(role_text).to_equal("Técnico")
        print(f"Fila verificada: El rol es '{role_text}'. Correcto.")

        # 5. Verificar que los botones de acción están presentes
        edit_button = row.locator(".action-btn.edit")
        delete_button = row.locator(".action-btn.delete")
        expect(edit_button).to_be_visible()
        expect(delete_button).to_be_visible()
        print("Botones de Editar y Eliminar están visibles.")

    # 6. Verificar el dropdown de creación de usuarios
    create_button = page.locator(".create-user-btn")
    expect(create_button).to_be_visible()
    create_button.click()
    print("Botón 'Crear Nuevo Usuario' clickeado.")

    modal = page.locator("#user-form-modal")
    expect(modal).to_be_visible()
    print("Modal de creación abierto.")

    privileges_dropdown = modal.locator("#privilegios")
    options = privileges_dropdown.locator("option").all()

    expect(len(options)).to_equal(1)
    expect(options[0]).to_have_text("Técnico")
    print("Dropdown de privilegios verificado: solo contiene 'Técnico'.")

    # Tomar captura de pantalla final
    page.screenshot(path=SCREENSHOT_PATH)
    print(f"Captura de pantalla guardada en {SCREENSHOT_PATH}")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(base_url="http://localhost:8000")
        page = context.new_page()

        try:
            page.goto("/users.html")
            verify_supervisor_permissions(page)
            print("\n✅ Verificación para Supervisor completada exitosamente.")
        except Exception as e:
            print(f"\n❌ Error durante la verificación: {e}")
            page.screenshot(path="verification/supervisor_error.png")
        finally:
            browser.close()
