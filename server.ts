import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ControlSystem } from './src/core/ControlSystem';
import { SelfImprovementSystem } from './src/core/SelfImprovementSystem';
import { HardTestSystem } from './src/core/HardTestSystem';
import { Agents } from './src/core/Agents';
import { ChaosTestSystem } from './src/core/ChaosTestSystem';
import { EvolutionManager } from './src/core/EvolutionManager';
import { HybridSuperIntelligence } from './src/core/HybridSuperIntelligence';
import { AutonomousEngineeringOS } from './src/core/AutonomousEngineeringOS';
import { APIStandard } from './src/core/APIStandard';
import { AuthMiddleware } from './src/core/AuthMiddleware';
import { RateLimiter } from './src/core/RateLimiter';
import { Observability } from './src/core/Observability';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  const controlSystem = new ControlSystem();
  const selfImprovement = new SelfImprovementSystem(controlSystem);
  const hardTest = new HardTestSystem(selfImprovement);
  const agents = new Agents();
  const chaosTest = new ChaosTestSystem(controlSystem);
  const evolutionManager = new EvolutionManager();
  const hybridIntelligence = new HybridSuperIntelligence();
  const autonomousOS = new AutonomousEngineeringOS();
  
  const rateLimiter = new RateLimiter();
  const observability = new Observability();

  // Middleware
  app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (!rateLimiter.check(ip)) {
      return res.status(429).json(APIStandard.error('Too many requests. System protection active.', 429));
    }
    
    // Auth for execution endpoints
    if (req.path.startsWith('/api/v1/meta') && process.env.NODE_ENV === 'production') {
       return AuthMiddleware.validate(req, res, next);
    }
    next();
  });

  const withObservability = (handler: any) => async (req: any, res: any) => {
    const start = Date.now();
    try {
      await handler(req, res);
      observability.recordExecution(Date.now() - start, true);
    } catch (err: any) {
      observability.recordExecution(Date.now() - start, false);
      res.status(500).json(APIStandard.error(err.message, 500));
    }
  };

  app.post('/api/v1/meta/execute', withObservability(async (req: any, res: any) => {
    const { goal, steps } = req.body;
    if (!goal || !steps || !Array.isArray(steps)) {
      return res.status(400).json(APIStandard.error('Goal and steps array are required', 400));
    }
    const result = await selfImprovement.executeWithRetry(goal, steps);
    res.json(APIStandard.success(result));
  }));
  
  app.post('/api/v1/meta/test', withObservability(async (req: any, res: any) => {
    const result = await hardTest.runHardTest();
    res.json(APIStandard.success(result));
  }));

  app.post('/api/v1/meta/chaos', withObservability(async (req: any, res: any) => {
    const result = await chaosTest.runAllTests();
    res.json(APIStandard.success(result));
  }));

  app.post('/api/v1/meta/agent', withObservability(async (req: any, res: any) => {
    const { goal, agentName } = req.body;
    const suggestion = await agents.execute(goal, agentName || 'aider');
    res.json(APIStandard.success({ suggestion }));
  }));

  app.post('/api/v1/meta/evolve', withObservability(async (req: any, res: any) => {
    const { goal, steps } = req.body;
    if (!goal || !steps) return res.status(400).json(APIStandard.error('goal and steps required', 400));
    const result = await evolutionManager.runEvolutionCycle(goal, steps);
    res.json(APIStandard.success(result));
  }));

  app.post('/api/v1/meta/autonomous', withObservability(async (req: any, res: any) => {
    const { goal, agentName } = req.body;
    if (!goal) return res.status(400).json(APIStandard.error('Goal is required', 400));
    const steps = await agents.execute(goal, agentName || 'aider');
    const result = await selfImprovement.executeWithRetry(goal, steps);
    res.json(APIStandard.success({ agent_suggestion: steps, execution_result: result }));
  }));

  app.post('/api/v1/meta/hybrid', withObservability(async (req: any, res: any) => {
    const { goal, steps } = req.body;
    if (!goal) return res.status(400).json(APIStandard.error('goal required', 400));
    const result = await hybridIntelligence.executeTask(goal, steps);
    res.json(APIStandard.success(result));
  }));

  app.post('/api/v1/meta/autonomous-os', withObservability(async (req: any, res: any) => {
    const { goal } = req.body;
    if (!goal) return res.status(400).json(APIStandard.error('goal required', 400));
    const result = await autonomousOS.processRequest(goal);
    res.json(APIStandard.success(result));
  }));

  app.get('/api/v1/health', (req, res) => {
    res.json(APIStandard.success(observability.getMetrics()));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
