import axios from "axios"
import {JsonDataAnalyzer} from "./analiz.js"
import {MarkdownTableGenerator} from "./markdown.js"

class BinanceAPI {
    constructor(baseURL = "https://api.binance.com") {
        this.baseURL = baseURL;
    }

    async fetchSymbols() {
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/ticker/24hr`);
            const usdtPairs = response.data
                .filter((item) => 
                    item.symbol.endsWith("USDT")&&
                    !item.symbol.endsWith("DOWNUSDT") &&
                    !item.symbol.endsWith("BULLUSDT") &&
                    !item.symbol.endsWith("BEARUSDT") &&
                    !item.symbol.endsWith("UPUSDT"));

            const safeCoins = usdtPairs.filter(item => 
                Math.abs(item.priceChangePercent) <= 15 &&
                item.volume >= 10000 &&
                item.quoteVolume >= 1000000 &&
                (item.askPrice - item.bidPrice) / item.weightedAvgPrice * 100 <= 1 &&
                (item.highPrice - item.lowPrice) / item.weightedAvgPrice * 100 <= 10
            );

            return safeCoins.map(pair => pair.symbol);

        } catch (error) {
            console.error("Error fetching symbols:", error.message);
            throw error;
        }
    }

    async fetchKlines(symbol, interval = "1m") {
        try {
            const url = `${this.baseURL}/api/v3/klines?symbol=${symbol}&interval=${interval}`;
            const response = await axios.get(url);
            return response.data.map((kline) => ({
                timestamp: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
            }));
        } catch (error) {
            console.error(`Error fetching klines for ${symbol}:`, error.message);
            throw error;
        }
    }
}

class Main {

    constructor(api) {
        this.api = api;
    }

    async analyzeSymbol(symbol) {

        try {
            console.log(`Fetching data for ${symbol}...`);
            const klines = await this.api.fetchKlines(symbol);
            
            const analyzer = new JsonDataAnalyzer(symbol,klines); // JsonDataAnalyzer sınıfına veri gönderiliyor
            const analysis = analyzer.summarize();

            return analysis;
        } catch (error) {
            console.error(`Error analyzing symbol ${symbol}:`, error.message);
        }
    }

    async analyzeAllSymbols() {
        try {
            const symbols = await this.api.fetchSymbols();
            let report = [];
            console.log("Fetched symbols:", symbols);

            // Sadece ilk 5 symbol üzerinde çalışalım (örnek için)
            const targetSymbols = symbols.slice(0, 5);
            for (const symbol of symbols) {
                let result = await this.analyzeSymbol(symbol);
                report.push(result);
            }

            const generator = new MarkdownTableGenerator(report);

            generator.saveToFile("rapor");

            console.log(generator.generateTable());
        } catch (error) {
            console.error("Error analyzing all symbols:", error.message);
        }
    }
}

// Kullanım
(async () => {
    const api = new BinanceAPI();
    const main = new Main(api);

    await main.analyzeAllSymbols();
})();