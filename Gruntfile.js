const webpackConfig = require('./webpack.config');

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    sass: {
      dist: {
        options: {
          sourcemap: false
        },
        files: {
          './web/layout.css': './lib/sass/layout.scss'
        }
      }
    },
    babel: {
      src: {
        options: {
          presets: ['es2015']
        },
        files: [
          {
            expand: true,
            cwd: 'lib/',
            src: ['./**/*.js'],
            dest: 'dist/'
          }
        ]
      }
    },
    webpack: {
      prod: webpackConfig
    },
    exec: {
      command: 'node index.js'
    },
    watch: {
      scripts: {
        files: ['lib/sass/layout.scss', 'index.js', 'lib/*.js'],
        tasks: ['sass', 'babel', 'webpack']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-sass');

  grunt.registerTask('watch', ['watch']);
  grunt.registerTask('json', ['exec']);
  grunt.registerTask('html', ['webpack']);
  grunt.registerTask('default', ['sass', 'babel', 'webpack']);
};
