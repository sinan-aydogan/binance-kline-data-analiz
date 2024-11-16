import cron from 'node-cron';
import { generateAndSaveReport } from './index.js'; // Rapor oluşturma kodu burada
import { sendEmailWithAttachment } from './mailer.js'; // Mail gönderme kodu burada
import dotenv from 'dotenv';
dotenv.config();

cron.schedule('* * * * *', async () => {
    console.log("Günlük analiz başlatılıyor...");

    try {
        const subscribers = process.env.SUBSCRIBERS.split(',');
        const reportFilename = process.env.REPORT_FILE_NAME + '.pdf';
        
        await generateAndSaveReport().then(() => {
            subscribers.forEach(async subscriber => {
                await sendEmailWithAttachment(
                    subscriber,
                    process.env.EMAIL_SUBJECT,
                    process.env.EMAIL_BODY,
                    reportFilename
                );
            });
        });
    } catch (error) {
        console.error("Günlük analiz sırasında hata oluştu:", error.message);
    }
});
