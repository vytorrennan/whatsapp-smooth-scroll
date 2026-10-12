const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir:'./test', workers:1, timeout:20000, reporter:'list', outputDir:'test-results' });
