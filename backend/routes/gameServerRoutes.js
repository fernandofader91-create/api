// backend/routes/gameServerRoutes.js
import { Router } from 'express';
import {
	characterDatabase,
	worldEnemys,
	finishArena,
} from '../controllers/gameServerController.js';

import requireGameServer from '../middlewares/requireGameServer.js';


const router = Router();

router.post('/character-db', requireGameServer, characterDatabase);
router.get('/world-enemys',  worldEnemys  );
router.post('/finish-arena', requireGameServer, finishArena);


export default router;
