const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";

const getCookie = (req, name) => {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const cookie = cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  return authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : getCookie(req, "token");
};

const protect = (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - no token provided",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - invalid token",
    });
  }
};

module.exports = { protect, JWT_SECRET, getTokenFromRequest };
