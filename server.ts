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

import SelfTester from './src/testing/SelfTester.js';
import AutoFixer from './src/testing/AutoFixer.js';
import SmartErrorAnalyzer from './src/testing/SmartErrorAnalyzer.js';
import MassiveProjectAnalyzer from './src/massive/MassiveProjectAnalyzer.js';
import MassiveProjectBuilder from './src/massive/MassiveProjectBuilder.js';

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
  app.post('/api/chaos-test', withObservability(async (req: any, res: any) => {
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
  app.get('/api/health', (req, res) => {
    res.json(APIStandard.success(observability.getMetrics()));
  });

  // ========== الاختبار الذاتي ==========
  app.post('/api/test/self', async (req, res) => {
      try {
          const tester = new SelfTester();
          const report = await tester.testAll();
          res.json({ status: "completed", ...report });
      } catch (error: any) {
          res.status(500).json({ status: "error", error: error.message });
      }
  });

  app.post('/api/test/fix', async (req, res) => {
      try {
          const fixer = new AutoFixer();
          const result = await fixer.fixAndRetest(2);
          res.json({ status: "completed", ...result });
      } catch (error: any) {
          res.status(500).json({ status: "error", error: error.message });
      }
  });

  app.post('/api/test/analyze-error', (req, res) => {
      const { error, context } = req.body;
      if (!error) return res.status(400).json({ status: "error", message: "نص الخطأ مطلوب." });
      
      const analyzer = new SmartErrorAnalyzer();
      const analysis = analyzer.analyze(error, context || {});
      res.json({ status: "completed", analysis });
  });

  app.get('/api/test/stats', (req, res) => {
      const fixer = new AutoFixer();
      const analyzer = new SmartErrorAnalyzer();
      res.json({
          status: "success",
          fixStats: fixer.getStats(),
          analysisStats: analyzer.getStats()
      });
  });

  app.post('/api/test/predict', (req, res) => {
      const { code, language } = req.body;
      if (!code) return res.status(400).json({ status: "error", message: "الكود مطلوب." });
      
      const analyzer = new SmartErrorAnalyzer();
      const warnings = analyzer.predictIssues(code, language || 'javascript');
      res.json({ status: "completed", warnings, totalWarnings: warnings.length });
  });

  // ========== المشاريع العملاقة ==========
  app.post('/api/massive/analyze', (req, res) => {
      const { goal } = req.body;
      if (!goal) return res.status(400).json({ status: "error", message: "الهدف مطلوب." });
      
      const analyzer = new MassiveProjectAnalyzer();
      const analysis = analyzer.analyze(goal);
      res.json({ status: "success", analysis });
  });

  app.post('/api/massive/plan', (req, res) => {
      const { goal } = req.body;
      if (!goal) return res.status(400).json({ status: "error", message: "الهدف مطلوب." });
      
      const analyzer = new MassiveProjectAnalyzer();
      const plan = analyzer.generateBuildPlan(goal);
      res.json({ status: "success", plan });
  });

  app.post('/api/massive/build', async (req, res) => {
      const { goal, options } = req.body;
      if (!goal) return res.status(400).json({ status: "error", message: "الهدف مطلوب." });
      
      try {
          const builder = new MassiveProjectBuilder();
          const result = await builder.build(goal, options || {});
          res.json(result);
      } catch (error: any) {
          res.status(500).json({ status: "error", error: error.message });
      }
  });

  app.get('/api/massive/capabilities', (req, res) => {
      const analyzer = new MassiveProjectAnalyzer();
      res.json({
          status: "success",
          capabilities: analyzer.getCapabilities()
      });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'public');
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
