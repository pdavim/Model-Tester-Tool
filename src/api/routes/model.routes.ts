import { Router } from 'express';
import { chatService } from '../../services/ChatService';

const router = Router();

router.get('/models', async (req, res, next) => {
  try {
    const models = await chatService.getAggregatedModels();
    res.json({ data: models });
  } catch (error) {
    next(error);
  }
});

// Backward compatibility for /api/hf/models
router.get('/hf/models', async (req, res, next) => {
  try {
    const models = await chatService.getAggregatedModels();
    // Filter for HF only if needed, or just return all as they are tagged
    res.json(models.filter(m => m.provider === 'huggingface'));
  } catch (error) {
    next(error);
  }
});

export default router;
