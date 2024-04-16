// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'server',
      script: 'server.js',
      instances: '1', // Utilize maximum CPU cores
      autorestart: true, // Automatically restart the app if it crashes
      max_memory_restart: '1G', // Restart the app if it exceeds 1GB memory usage
      shutdown_with_message: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS', // Log date format
      error_file: 'logs/error.log', // Path to error log file
      out_file: 'logs/out.log', // Path to output log file
      combine_logs: true, // Combine all instances logs into one file
    }
  ]
};
