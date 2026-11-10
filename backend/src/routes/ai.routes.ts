import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/analyze-image', upload.single('image'), AIController.analyzeImage);
router.post('/check-duplicates', AIController.checkDuplicates);

export default router;
