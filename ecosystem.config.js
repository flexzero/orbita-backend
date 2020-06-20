module.exports = {
  apps: [{
    name: "app",
    script: 'app.js',
    instances: 1,
    watch: '.',
  },
  {
    name: 'sqsReservationsWorker',
    script: 'sqsReservationsWorker.js',
    instances: 1,
    watch: '.',
  }, {
    name: 'passcodeScheduler',
    script: 'passcodeScheduler.js',
    instances: '1',
    watch: '.',
  },
  {
    name: 'sqsPasscodesWorker',
    script: 'sqsPasscodesWorker.js',
    instance: '1',
    watch: '.'
  }],

  deploy: {
    production: {
      user: 'SSH_USERNAME',
      host: 'SSH_HOSTMACHINE',
      ref: 'origin/master',
      repo: 'GIT_REPOSITORY',
      path: 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
