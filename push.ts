import { execSync } from 'child_process';

try {
  console.log("Initializing git...");
  execSync('git init', { stdio: 'inherit' });
  
  try {
    execSync('git remote remove origin', { stdio: 'ignore' });
  } catch(e) {}
  
  execSync('git remote add origin https://github.com/agentsoor-jpg/Studio_Agent.git', { stdio: 'inherit' });
  
  execSync('git checkout -B main', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  
  execSync('git config user.email "bot@example.com"', { stdio: 'inherit' });
  execSync('git config user.name "AI Bot"', { stdio: 'inherit' });
  
  execSync('git commit -m "Final: Autonomous Engineering OS - Production System" || true', { stdio: 'inherit' });
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is missing! Please provide it in the environment.");
    process.exit(1);
  }
  
  const repoUrl = `https://oauth2:${token}@github.com/agentsoor-jpg/Studio_Agent.git`;
  
  console.log("Pushing to GitHub...");
  execSync(`git push ${repoUrl} main -f`, { stdio: 'ignore' });
  
  const status = execSync('git rev-parse HEAD').toString().trim();
  console.log(`Successfully pushed commit: ${status}`);

} catch (error: any) {
  console.error("Error during git operations:", error.message);
}
