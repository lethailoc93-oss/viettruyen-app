import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import proxyRouter from './routes/proxy.js';
import imageGenRouter from './routes/extensions/imageGen.js';
import cloudImageRouter from './routes/extensions/cloudImage.js';
import ttsRouter from './routes/extensions/tts.js';
import githubRouter from './routes/extensions/github.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// Lấy danh sách origin cho phép từ ENV (Mặc định cho phép Local dev)
// Trên Render, bạn có thể thiết lập ALLOWED_ORIGIN="*" để cho mượn API, hoặc điền URL Netlify của bạn để bảo mật.
const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép các origin trong mảng, hoặc nếu ALLOWED_ORIGIN là "*" (mở hoàn toàn)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS Error: Origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'xi-api-key']
}));

// Gia tăng giới hạn JSON payload vì thẻ HTML ảnh có thể khá nặng (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Gắn Routers
app.use('/api/proxy', proxyRouter);
app.use('/api/extensions/image', imageGenRouter);
app.use('/api/extensions/cloud-image', cloudImageRouter);
app.use('/api/extensions/tts', ttsRouter);
app.use('/api/extensions/github', githubRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'VietTruyenBanChua Backend Server is running!' });
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 VTBC Backend Server started on port ${PORT}`);
    console.log(`📡 CORS Proxy endpoint: http://localhost:${PORT}/api/proxy/chat`);
    console.log(`🎨 Local Image Ext:     http://localhost:${PORT}/api/extensions/image`);
    console.log(`☁️  Cloud Image Ext:     http://localhost:${PORT}/api/extensions/cloud-image`);
    console.log(`🔊 TTS Extension:       http://localhost:${PORT}/api/extensions/tts`);
    console.log(`===============================================`);
});
