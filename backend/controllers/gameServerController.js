// controllers/gameServerController.js
import * as gameserverService from '../services/gameServerService.js';
import logger from '../utils/logger.js';

export async function characterDatabase(req, res) {
  try {
    const { name } = req.body; 
    const data = await gameserverService.characterDatabase({ name });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const code = err.status ?? 400;
    logger.error(`Error in characterDatabase: ${err.message}`);
    return res.status(code).json({ success: false, message: err.message || 'Character DB error' });
  }
}

export async function worldEnemys(req, res) {
  try {
    const data = await gameserverService.worldEnemys();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const code = err.status ?? 400;
    logger.error(`Error in worldEnemys: ${err.message}`);
    return res.status(code).json({ success: false, message: err.message || 'World Enemys error' });
  }
}


export async function finishArena(req, res) {
  try {
    const { player_id, stats, digimons } = req.body;
    const data = await gameserverService.finishArena({ player_id, stats, digimons });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const code = err.status ?? 400;
    logger.error(`Error in finishArena: ${err.message}`);
    return res.status(code).json({ success: false, message: err.message || 'Finish Arena error' });
  }
}