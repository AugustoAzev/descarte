import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ecovia.es@gmail.com',
        pass: 'vyda arey cwub ikuz'
    }
});

export const enviarEmailBoasVindas = async (email, username) => {
    const mailOptions = {
        from: '"EcoVia 🌱" <ecovia@projetosufam.com.br>',
        to: email,
        subject: 'Bem-vindo ao EcoVia! 🚀',
        html: `
            <h2>Olá, ${username}!</h2>
            <p>Bem-vindo ao <strong>EcoVia</strong>! Estamos felizes em tê-lo conosco.</p>
            <p>Busque, encontre e descarte!</p>
            <br>
            <p>Atenciosamente,</p>
            <p><strong>Equipe EcoVia 🌱</strong></p>
        `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ E-mail enviado com sucesso para ${email}: ${info.response}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar e-mail para ${email}:`, error);
    }
};