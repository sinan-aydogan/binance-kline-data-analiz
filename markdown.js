import fs from 'fs';
import puppeteer from 'puppeteer';
import markdownit from 'markdown-it';

export class MarkdownTableGenerator {
    constructor(data) {
        this.data = data;
    }

    formatLargeNumber(num) {
        if (Math.abs(num) >= 1.0e+9) {
            return (num / 1.0e+9).toFixed(1) + "B"; // Milyar
        } else if (Math.abs(num) >= 1.0e+6) {
            return (num / 1.0e+6).toFixed(1) + "M"; // Milyon
        } else if (Math.abs(num) >= 1.0e+3) {
            return (num / 1.0e+3).toFixed(1) + "K"; // Bin
        } else {
            return num.toString(); // Küçük sayılar için doğrudan döndür
        }
    }

    generateTable() {

    // Symbol değerine göre artan sıralama
    this.data.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // Yükseliş trendi ve RSI > 70 olanlar, MACD en yüksek 5
    const topPerformers = this.data
    .filter(item =>
        item.trend === "Yükseliş Trendi" &&
        item.rsi.value > 50 && item.rsi.value <= 70 && // Sağlıklı RSI bölgesi
        item.tickerAnalysis.priceChangePercent > 1 && // %1 üzeri fiyat artışı
        item.tickerAnalysis.volume > 1.2 * item.tickerAnalysis.avgVolume// Ortalama hacimden %20 fazla
    )
    .sort((a, b) => b.macd.value - a.macd.value)
    .slice(0, 5);

    // En kötü performans gösterebilecekler (Tam tersi mantık)
    const worstPerformers = this.data
    .filter(item =>
        item.trend === "Düşüş Trendi" &&
        item.rsi.value < 50 && item.rsi.value >= 30 && // RSI, aşırı düşük değil
        item.tickerAnalysis.priceChangePercent < -1 && // %1 üzeri fiyat kaybı
        item.tickerAnalysis.volume < 0.8 * item.tickerAnalysis.avgVolume // Ortalama hacmin altında
    )
    .sort((a, b) => a.macd.value - b.macd.value)
    .slice(0, 5);

    // Tüm veriler için tablo
    let mainTable = `
| COIN      | ORTALAM FİYATI | Trend            | RSI DEĞERİ | RSI YORUMU                          | MACD DEĞERİ | MACD YORUMU                         | Fibonacci YORUMU                        | Bollinger YORUMU      | Fiyat Değişimi (%) | Hacim    | Volatilite | YARIN | 3 GÜN SONRA | 7 GÜN SONRA |
|-----------|----------------|------------------|------------|-------------------------------------|-------------|-------------------------------------|-----------------------------------------|-----------------------|-------------------|----------|------------|-------|-------------|-------------|
`;
    this.data.forEach(item => {
        mainTable += `| ${item.symbol} | ${item.averagePrice.toFixed(4)} | ${item.trend} | ${item.rsi.value.toFixed(2)} | ${item.rsi.comment} | ${item.macd.value.toFixed(2)} | ${item.macd.comment} | ${item.fibonacci.comment} | ${item.bollinger.comment} | ${item.tickerAnalysis.priceChangePercent.toFixed(2)} | ${this.formatLargeNumber(item.tickerAnalysis.volume)} | ${item.tickerAnalysis.volatility.toFixed(2)} | ${item.forecasts.day1.toFixed(4)} | ${item.forecasts.day3.toFixed(4)} | ${item.forecasts.day7.toFixed(4)} |\n`;
    });

    // En iyi performans gösterebilecekler için tablo
    let topTable = `
| COIN      | ORTALAM FİYATI | Trend            | RSI DEĞERİ | MACD DEĞERİ | Fiyat Değişimi (%) | Hacim    | Volatilite | YARIN | 3 GÜN SONRA | 7 GÜN SONRA |
|-----------|----------------|------------------|------------|-------------|-------------------|----------|------------|-------|-------------|-------------|
`;
    topPerformers.forEach(item => {
        topTable += `| ${item.symbol} | ${item.averagePrice.toFixed(4)} | ${item.trend} | ${item.rsi.value.toFixed(2)} | ${item.macd.value.toFixed(2)} | ${item.tickerAnalysis.priceChangePercent.toFixed(2)} | ${this.formatLargeNumber(item.tickerAnalysis.volume)} | ${item.tickerAnalysis.volatility.toFixed(2)} | ${item.forecasts.day1.toFixed(4)} | ${item.forecasts.day3.toFixed(4)} | ${item.forecasts.day7.toFixed(4)} |\n`;
    });

    // En kötü performans gösterebilecekler için tablo
    let worstTable = `
| COIN      | ORTALAM FİYATI | Trend            | RSI DEĞERİ | MACD DEĞERİ | Fiyat Değişimi (%) | Hacim    | Volatilite | YARIN | 3 GÜN SONRA | 7 GÜN SONRA |
|-----------|----------------|------------------|------------|-------------|-------------------|----------|------------|-------|-------------|-------------|
`;

        worstPerformers.forEach(item => {
            worstTable += `| ${item.symbol} | ${item.averagePrice.toFixed(4)} | ${item.trend} | ${item.rsi.value.toFixed(2)} | ${item.macd.value.toFixed(2)} | ${item.tickerAnalysis.priceChangePercent.toFixed(2)} | ${this.formatLargeNumber(item.tickerAnalysis.volume)} | ${item.tickerAnalysis.volatility.toFixed(2)} | ${item.forecasts.day1.toFixed(4)} | ${item.forecasts.day3.toFixed(4)} | ${item.forecasts.day7.toFixed(4)} |\n`;
        });

        return { mainTable, topTable, worstTable };
    }

    async saveToFile(filename) {
        const { mainTable, topTable, worstTable } = this.generateTable();

        // Markdown içeriğini oluştur
        const markdownContent = '# Tüm Coinlerin Analizi\n'+
        mainTable + '\n' +
        '# Yükselişte Olanlar\n' +
        topTable + '\n' +
        '# Düşüşte Olanlar\n' +
        worstTable + '\n';

        filename = (filename || 'rapor') + '-' + new Date().toLocaleString().replace(/:/g, '-');
        let markdownFilePath = filename + '.md';
        let pdfFilePath = filename + '.pdf';

        fs.writeFileSync(markdownFilePath, markdownContent, 'utf8');

        await this.generatePdf(markdownContent, pdfFilePath);

        console.log(`Rapor ${pdfFilePath} ve ${markdownFilePath} dosyalarına kaydedildi.`);
    }

    async generatePdf(markdownContent, pdfFilePath) {
        const md = markdownit()
        try {
            const htmlContent = md.render(markdownContent);
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
    
            // Basit bir HTML sayfasına Markdown içeriği gömüyoruz
            await page.setContent(`
                <html>
                <head>
                    <style>
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th, td {
                            border: 1px solid black;
                            padding: 8px;
                            text-align: center;
                        }
                        th {
                            background-color: #f2f2f2;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
                `);
    
            await page.pdf({ path: pdfFilePath, format: 'A4',landscape: true, printBackground: true });
            await browser.close();
    
            console.log(`PDF dosyası başarıyla oluşturuldu: ${pdfFilePath}`);
        } catch (error) {
            console.error("PDF oluşturma sırasında hata:", error.message);
        }
    }
}

