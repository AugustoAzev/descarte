import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ecovia.es@gmail.com',
        pass: 'vyda arey cwub ikuz' 
    }
});
export const enviarEmailRecuperacao = async (email, resetLink) => {
    const mailOptions = {
        from: '"EcoVia 🌱" <seuemail@gmail.com>',
        to: email,
        subject: 'Recuperação de senha - EcoVia',
        html: `
            <h2>Olá,</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Se você não solicitou isso, ignore este e-mail.</p>
            <p>Para redefinir sua senha, clique no link abaixo:</p>
            <a href="${resetLink}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
            <p>Este link é válido por apenas 1 hora.</p>
        `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ E-mail de recuperação enviado para ${email}: ${info.response}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar e-mail de recuperação:`, error);
    }
};