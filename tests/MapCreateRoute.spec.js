import {expect, test } from '@playwright/test';

test('Complete Map Process', async ( { page } )=>{
    await page.goto('https://descarte.vercel.app/');

    await test.step ('Create an Route', async () => {
        await page.locator('[class=\'menu-faketrigger\']').click();
        await page.locator('a:has-text("Ir ao mapa")').click();
        await page.locator('#centralizar').click();
    });

    await test.step ('Cheking Tutorial Map Instructions', async () => {
        await page.locator('#inicia-tutorial').click();
        await page.locator('#prox-1').click();
        await page.locator('#prox-2').click();
        await page.locator('#prox-3').click();
        await page.locator('#fecha-tutorial').click();
    });

});