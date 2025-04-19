module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "gRPC-client",
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster'
    },
  ],
};
