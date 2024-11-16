import axios from "axios"
import {JsonDataAnalyzer} from "./analiz.js"
import {MarkdownTableGenerator} from "./markdown.js"

class BinanceAPI {
    constructor(baseURL = "https://api.binance.com") {
        this.baseURL = baseURL;
        this.tickerData = [];
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
                item.volume >= 10000000 &&
                item.quoteVolume >= 10000000
            );

            this.tickerData = safeCoins

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
            const coinTickerData = this.api.tickerData.find(item => item.symbol === symbol);
            
            const analyzer = new JsonDataAnalyzer(symbol,klines, coinTickerData); // JsonDataAnalyzer sınıfına veri gönderiliyor
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

            for (const symbol of symbols) {
                let result = await this.analyzeSymbol(symbol);
                report.push(result);
            }

            const generator = new MarkdownTableGenerator(report);

            return generator.saveToFile();
        } catch (error) {
            console.error("Error analyzing all symbols:", error.message);
        }
    }
}

export async function generateAndSaveReport() {
    const api = new BinanceAPI();
    const main = new Main(api);

    await main.analyzeAllSymbols().then(file => {
        return file;
    });
}