export class JsonDataAnalyzer {
    constructor(symbol,data) {
        this.data = data;
        this.symbol = symbol;
    }

    // Ortalama fiyatı hesapla
    calculateAveragePrice() {
        const total = this.data.reduce((sum, entry) => sum + entry.close, 0);
        return total / this.data.length;
    }

    // RSI hesapla
    calculateRSI(period = 14) {
        let gains = [];
        let losses = [];
        for (let i = 1; i < this.data.length; i++) {
            const change = this.data[i].close - this.data[i - 1].close;
            if (change > 0) gains.push(change);
            else losses.push(Math.abs(change));
        }

        const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // MACD hesapla
    calculateMACD(shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
        const shortEMA = this.calculateEMA(shortPeriod);
        const longEMA = this.calculateEMA(longPeriod);
        const macdLine = shortEMA.map((val, idx) => val - longEMA[idx]);
        const signalLine = this.calculateEMA(signalPeriod, macdLine);
        return {
            macdLine,
            signalLine,
            histogram: macdLine.map((val, idx) => val - signalLine[idx])
        };
    }

    // EMA hesaplama
    calculateEMA(period, dataSet = this.data.map(d => d.close)) {
        const k = 2 / (period + 1);
        return dataSet.reduce((emaList, current, idx) => {
            if (idx === 0) {
                emaList.push(current);
            } else {
                emaList.push((current - emaList[idx - 1]) * k + emaList[idx - 1]);
            }
            return emaList;
        }, []);
    }

    // Fibonacci retracement hesapla
    calculateFibonacciRetracement() {
        const high = Math.max(...this.data.map(d => d.high));
        const low = Math.min(...this.data.map(d => d.low));
        return {
            level0: low,
            level38_2: low + (high - low) * 0.382,
            level50: (high + low) / 2,
            level61_8: low + (high - low) * 0.618,
            level100: high
        };
    }

    // Bollinger Bantları hesapla
    calculateBollingerBands(period = 20, multiplier = 2) {
        const closes = this.data.map(d => d.close);
        const sma = this.calculateSMA(period, closes);
        const stdDev = closes
            .slice(period - 1)
            .map((_, idx) => {
                const subset = closes.slice(idx, idx + period);
                const mean = subset.reduce((a, b) => a + b, 0) / subset.length;
                return Math.sqrt(subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / subset.length);
            });

        return {
            upper: sma.map((val, idx) => val + multiplier * stdDev[idx]),
            lower: sma.map((val, idx) => val - multiplier * stdDev[idx]),
            mid: sma
        };
    }

    // Basit Hareketli Ortalama (SMA) hesapla
    calculateSMA(period, dataSet = this.data.map(d => d.close)) {
        return dataSet.slice(period - 1).map((_, idx) =>
            dataSet.slice(idx, idx + period).reduce((sum, val) => sum + val, 0) / period
        );
    }

    // Parabolic SAR hesapla
    calculateParabolicSAR() {
        // Bu yöntemi basitleştirilmiş bir algoritma olarak ekliyoruz.
        return this.data.map((entry, idx) => entry.high - (entry.high - entry.low) * 0.02);
    }

    // Trend analizi
    analyzeTrend() {
        const closes = this.data.map(d => d.close);
        const slope = closes[closes.length - 1] - closes[0];
        return slope > 0 ? "Yükseliş Trendi" : slope < 0 ? "Düşüş Trendi" : "Yatay Trendi";
    }

    // RSI Yorumlama
    interpretRSI(rsi) {
        if (rsi < 25) return "RSI düşük, aşırı satılmış. Alım fırsatı olabilir.";
        if (rsi >= 25 && rsi <= 50) return "RSI nötr. İzlemeye devam edin.";
        if (rsi > 50 && rsi <= 75) return "RSI yüksek. Mevcut pozisyonu koruyun.";
        if (rsi > 75) return "RSI aşırı yüksek, aşırı alım. Satış düşünülebilir.";
    }

    // MACD Yorumlama
    interpretMACD(macd) {
        if (macd > 0) return "MACD pozitif, yükseliş trendi güçlü. Alım fırsatı olabilir.";
        if (macd <= 0) return "MACD negatif, düşüş trendi hakim. Satış düşünülebilir.";
    }

    // Fibonacci Yorumlama
    interpretFibonacci(fibonacci, currentPrice) {
        if (currentPrice < fibonacci.level38_2) 
            return "Fiyat düşük seviyelerde, alım fırsatı.";
        if (currentPrice >= fibonacci.level38_2 && currentPrice <= fibonacci.level61_8) 
            return "Fiyat nötr bölgede, izlenmeli.";
        if (currentPrice > fibonacci.level61_8) 
            return "Fiyat yüksek seviyelerde, satış düşünülebilir.";
    }

    // Bollinger Bands Yorumlama
    interpretBollingerBands(closePrice, bollingerBands) {
        if (closePrice < bollingerBands.lower) 
            return "Fiyat Bollinger alt bandında, alım fırsatı olabilir.";
        if (closePrice > bollingerBands.upper) 
            return "Fiyat Bollinger üst bandında, satış düşünülebilir.";
        return "Fiyat Bollinger ortasında, nötr.";
    }

    // Özetleme Fonksiyonu
    summarize() {
        const averagePrice = this.calculateAveragePrice();
        const rsi = this.calculateRSI();
        const macd = this.calculateMACD().histogram.slice(-1)[0];
        const fibonacci = this.calculateFibonacciRetracement();
        const bollingerBands = this.calculateBollingerBands();
        const trend = this.analyzeTrend();
        const forecasts = this.calculateForecasts();
        const currentPrice = this.data[this.data.length - 1].close;

        // Yorumlar
        const rsiComment = this.interpretRSI(rsi);
        const macdComment = this.interpretMACD(macd);
        const fibonacciComment = this.interpretFibonacci(fibonacci, currentPrice);
        const bollingerComment = this.interpretBollingerBands(currentPrice, bollingerBands);

        return {
            symbol: this.symbol,
            averagePrice,
            trend,
            rsi: { value: rsi, comment: rsiComment },
            macd: { value: macd, comment: macdComment },
            fibonacci: { levels: fibonacci, comment: fibonacciComment },
            bollinger: { comment: bollingerComment },
            forecasts
        };
    }

    // 1, 3, 7 günlük tahminler
    calculateForecasts() {
        const closes = this.data.map(d => d.close);
        const recentClose = closes[closes.length - 1];
        const avgChange = (closes[closes.length - 1] - closes[0]) / closes.length;

        return {
            day1: recentClose + avgChange * 1,
            day3: recentClose + avgChange * 3,
            day7: recentClose + avgChange * 7
        };
    }
    
}
