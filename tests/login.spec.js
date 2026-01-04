import {expect, test } from '@playwright/test';

test('Complete Login Process', async ( { page } )=>{
    await page.goto('https://descarte.vercel.app/');

    await test.step ('Cheking Login With Valid Credentials', async () => {
        await page.locator('[class=\'menu-faketrigger\']').click();
        await page.locator('a:has-text("Entrar")').click();
        await page.getByLabel('Informe seu nome de usuário:').fill('auto test');
        await page.getByLabel('Informe sua senha de acesso:').click();
        await page.getByLabel('Informe sua senha de acesso:').fill('123456');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByText('Redirecionando...')).toBeVisible();
    });

    await test.step ('Cheking Login Turn Off', async () => {
        await page.locator('[class=\'menu-faketrigger\']').click();
        await page.locator('a:has-text("Sair")').click();
    });

    await test.step ('Cheking Login With Invalid Password', async () => {
        await page.locator('[class=\'menu-faketrigger\']').click();
        await page.locator('a:has-text("Entrar")').click();
        await page.getByLabel('Informe seu nome de usuário:').fill('auto test');
        await page.getByLabel('Informe sua senha de acesso:').click();
        await page.getByLabel('Informe sua senha de acesso:').fill('1234');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByText('Sua senha está incorreta.')).toBeVisible();
    });

    await test.step ('Cheking Login With Invalid UserName', async () => {
        await page.getByLabel('Informe seu nome de usuário:').fill('auto');
        await page.getByLabel('Informe sua senha de acesso:').click();
        await page.getByLabel('Informe sua senha de acesso:').fill('123456');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByText('Nome de usuário não encontrado.')).toBeVisible();
    });
});