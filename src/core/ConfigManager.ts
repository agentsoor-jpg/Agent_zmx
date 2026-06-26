export class ConfigManager {
  getEnv() {
    return process.env.NODE_ENV || 'development';
  }

  getWorkspaceDir() {
    const env = this.getEnv();
    return `./workspace_${env}`;
  }

  getLogsDir() {
    const env = this.getEnv();
    return `./logs_${env}`;
  }
}
