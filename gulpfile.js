const gulp = require('gulp');
const shell = require('gulp-shell');

function react(cb) {
  shell.task(['node reactScripts/start.js'])(cb);
}

function electron(cb) {
  shell.task(['electron-forge start'])(cb);
}

exports.react = react;

exports.electron = electron;


exports.dev = gulp.parallel(react, electron);
