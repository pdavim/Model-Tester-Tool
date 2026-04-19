import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { Logger } from '../../infra/Logging';

const router = Router();

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify system PIN and issue JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT Token
 *       401:
 *         description: Invalid PIN
 */
router.post('/auth/verify', async (req, res) => {
  const { pin } = req.body;

  if (pin !== config.SYSTEM_PIN) {
    Logger.warn(`Failed login attempt with PIN: ${pin?.substring(0, 1)}***`);
    return res.status(401).json({ error: 'Invalid terminal PIN' });
  }

  const token = jwt.sign(
    { sub: 'admin', scopes: ['chat:read', 'chat:write', 'models:read'] },
    config.JWT_SECRET,
    { expiresIn: '24h' }
  );

  Logger.info('User authenticated via PIN');
  res.json({ token });
});

export default router;
