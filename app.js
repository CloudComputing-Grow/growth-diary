require('dotenv').config();
require('./utils/rabbitMQ'); 

const express = require('express');
const growthDiaryRoutes = require('./routes/growthDiaryRoutes');
const internalGrowthDiaryRoutes = require('./routes/internalGrowthDiaryRoutes');

const db = require('./config/db');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'growth-diary-service',
  });
});

app.use('/api/v1/growth-diary', growthDiaryRoutes);
app.use('/api/internal/v1', internalGrowthDiaryRoutes);

const PORT = process.env.PORT || 3005;

app.listen(PORT, async () => {
  console.log(`growth-diary-service running on port ${PORT}`);

  try {
    const [rows] = await db.query('SELECT DATABASE() AS dbName');
    console.log(`DB connected: ${rows[0].dbName}`);
  } catch (err) {
    console.error('DB connection failed:', err.message);
  }
});