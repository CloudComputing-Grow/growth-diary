require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'growth-diary-service',
  });
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`growth-diary-service running on port ${PORT}`);
});