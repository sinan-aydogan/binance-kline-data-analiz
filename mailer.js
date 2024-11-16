import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export async function sendEmailWithAttachment(recipient, subject, text, attachmentPath) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Gmail kullanıyorsanız.
        auth: {
            user: process.env.EMAIL, // .env'den okuyarak
            pass: process.env.EMAIL_PASSWORD, // .env'den okuyarak
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: recipient,
        subject: subject,
        text: text,
        attachments: [
            {
                path: attachmentPath,
            },
        ],
    };

    await transporter.sendMail(mailOptions);
    console.log('Email başarıyla gönderildi.');
}
