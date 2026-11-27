// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Agents' git worktrees live in .claude/worktrees: full copies of the repo with their own
// node_modules. Crawling and watching them tripled Metro's file map and kept it at full CPU, so
// Expo Go never got its manifest (2026-10-27). The file map checks a directory by its
// project-relative path (that prunes the crawl) and every file by its absolute path (that filters
// watcher events), so both are matched. The absolute one is anchored to this project's own
// .claude, so a Metro started inside a worktree still sees its own files.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...[config.resolver.blockList].flat(),
  /^\.claude(?:[\\/]|$)/,
  new RegExp(`^${escapeRegExp(path.join(__dirname, '.claude'))}(?:[\\\\/]|$)`),
];

module.exports = config;
