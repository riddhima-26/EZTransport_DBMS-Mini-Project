const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// For demo purposes, we'll use a hardcoded user
const DEMO_USER = {
  username: 'admin',
  password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iq.IX1v0YwK6', // password: admin123
  role: 'admin'
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username === DEMO_USER.username) {
    const isValidPassword = await bcrypt.compare(password, DEMO_USER.password);
    
    if (isValidPassword) {
      const token = jwt.sign(
        { username: DEMO_USER.username, role: DEMO_USER.role },
        'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        user: {
          username: DEMO_USER.username,
          role: DEMO_USER.role,
          token
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 