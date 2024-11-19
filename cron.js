import cron from 'node-cron';
import {generateAndSendReport} from "./index.js"
import dotenv from 'dotenv';
dotenv.config();

const cronExpression = process.env.CRON_EXPRESSION || '0 */12 * * *';

cron.schedule(cronExpression, async () => {
    await generateAndSendReport();
});
