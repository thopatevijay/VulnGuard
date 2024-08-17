import mongoose from 'mongoose';

// Define schemas
const TransactionSchema = new mongoose.Schema({
    hash: String,
    from: String,
    to: String,
    value: String,
    function: String,
    timestamp: Date,
});

const AlertSchema = new mongoose.Schema({
    type: String,
    message: String,
    timestamp: Date,
});

const PauseEventSchema = new mongoose.Schema({
    txHash: String,
    timestamp: Date,
    success: Boolean,
});

const SlitherReportSchema = new mongoose.Schema({
    report: Object,
    timestamp: Date,
});

// Define models
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Alert = mongoose.model('Alert', AlertSchema);
const PauseEvent = mongoose.model('PauseEvent', PauseEventSchema);
const SlitherReport = mongoose.model('SlitherReport', SlitherReportSchema);

export class ReportingService {
    private isConnected: boolean = false;

    constructor() {
        this.connectToDatabase();
    }

    private async connectToDatabase() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vulnerablebank');
            this.isConnected = true;
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
        }
    }

    private async retryOperation<T>(operation: () => Promise<T>, retries: number = 5): Promise<T> {
        while (retries > 0) {
            if (this.isConnected) {
                try {
                    return await operation();
                } catch (error) {
                    console.error('Error performing database operation:', error);
                    retries--;
                    if (retries === 0) throw error;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
                }
            } else {
                console.log('Waiting for database connection...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                retries--;
                if (retries === 0) throw new Error('Failed to connect to database after multiple attempts');
            }
        }
        throw new Error('Operation failed after multiple retries');
    }

    async logTransaction(txInfo: any) {
        await this.retryOperation(async () => {
            const transaction = new Transaction(txInfo);
            await transaction.save();
        });
    }

    async logAlert(type: string, message: string) {
        await this.retryOperation(async () => {
            const alert = new Alert({ type, message, timestamp: new Date() });
            await alert.save();
        });
    }

    async logPauseEvent(txHash: string, success: boolean) {
        await this.retryOperation(async () => {
            const pauseEvent = new PauseEvent({ txHash, timestamp: new Date(), success });
            await pauseEvent.save();
        });
    }

    async saveSlitherReport(report: any) {
        await this.retryOperation(async () => {
            const slitherReport = new SlitherReport({ report, timestamp: new Date() });
            await slitherReport.save();
        });
    }

    async getAnalytics() {
        return await this.retryOperation(async () => {
            const transactionCount = await Transaction.countDocuments();
            const alertCount = await Alert.countDocuments();
            const pauseEventCount = await PauseEvent.countDocuments();
            const successfulPauses = await PauseEvent.countDocuments({ success: true });

            const latestSlitherReport = await SlitherReport.findOne().sort('-timestamp');

            return {
                transactionCount,
                alertCount,
                pauseEventCount,
                successfulPauses,
                pauseEffectiveness: pauseEventCount > 0 ? (successfulPauses / pauseEventCount) * 100 : 0,
                latestSlitherReport: latestSlitherReport ? latestSlitherReport.report : null,
            };
        });
    }

    async closeConnection(): Promise<void> {
        if (this.isConnected) {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('Closed MongoDB connection');
        }
    }
}