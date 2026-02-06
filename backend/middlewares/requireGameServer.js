// middlewares/requireGameServer.js
import 'dotenv/config.js';

const GAME_SERVER_TOKEN = process.env.GAME_SERVER_TOKEN;

export default function requireGameServer(req, res, next) {
  const token = req.header('x-gs-token');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing x-gs-token' });
  }
  if (token !== GAME_SERVER_TOKEN) {
    return res.status(403).json({ success: false, message: 'Invalid game server token' });
  }

  next();
}
