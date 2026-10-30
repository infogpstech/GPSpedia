import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8085/add_cortes.html")
        await page.wait_for_timeout(1000)

        # Check if vinInput exists in document DOM structure
        has_vin = await page.evaluate("() => document.getElementById('vinInput') !== null")
        print("vinInput element exists in DOM:", has_vin)

        await page.screenshot(path="add_corte_vin.png")
        await browser.close()

asyncio.run(main())
