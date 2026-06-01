require('dotenv').config();

const express = require('express');
const cors = require('cors');
const growthDiaryRoutes = require('./routes/growthDiaryRoutes');

const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'growth-diary-service',
  });
});

app.use('/api/v1/growth-diary', growthDiaryRoutes);

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