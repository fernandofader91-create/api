// backend/routes/gameServerRoutes.js
import { Router } from 'express';
import { characterDatabase } from '../controllers/gameServerController.js';
import { worldEnemys } from '../controllers/gameServerController.js';
import requireGameServer from '../middlewares/requireGameServer.js';


const router = Router();

router.post('/character-db', requireGameServer, characterDatabase);
router.get('/world-enemys',  worldEnemys  );
export default router;
