// PM2 para staging: proceso aparte, puerto aparte, base aparte.
// Uso: pm2 start ecosystem.staging.config.cjs   (desde el directorio de staging)
// Las variables secretas van en el .env de ese directorio, no aquí.
module.exports = {
  apps: [
    {
      name: "datosprivados-staging",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3200 -H 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
        DATOSPRIVADOS_DB: "/var/lib/datosprivados-staging/datosprivados.db",
        DATOSPRIVADOS_DEMO_DB: "/var/lib/datosprivados-staging/demo.db",
      },
    },
  ],
};
