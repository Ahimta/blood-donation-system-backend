var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'blood-donation-system-backend'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/blood-donation-system-backend-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'blood-donation-system-backend'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/blood-donation-system-backend-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'blood-donation-system-backend'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/blood-donation-system-backend-production'
  }
};

module.exports = config[env];
