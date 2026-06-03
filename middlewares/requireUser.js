const jwt = require('jsonwebtoken');

const requireUser = (req, res, next) => {
  let userId = req.headers['x-user-id'];

  if (!userId) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];

        const secret =
          process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

        const decoded = jwt.verify(token, secret);

        userId = decoded.user_id || decoded.userId;
      } catch (err) {
        console.warn('[requireUser] JWT 디코드 실패:', err.message);
      }
    }
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '인증된 사용자 정보가 없습니다.',
    });
  }

  req.userId = Number(userId);
  next();
};

module.exports = requireUser;