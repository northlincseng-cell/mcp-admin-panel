// PM2 Ecosystem Configuration
// MCP Admin Panel — Production Process Manager

module.exports = {
  apps: [
    {
      name: "mcp-admin",
      script: "dist/index.cjs",
      cwd: "/home/mcp/mcp-admin-panel",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // Load .env file for DATABASE_URL
      env_file: ".env",

      // Process management
      instances: 1,           // Single instance (2 vCPU — keep 1 for Postgres)
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/mcp/logs/mcp-admin-error.log",
      out_file: "/home/mcp/logs/mcp-admin-out.log",
      merge_logs: true,
      log_file: "/home/mcp/logs/mcp-admin-combined.log",

      // Graceful restart
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Crash protection
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
  ],
};
