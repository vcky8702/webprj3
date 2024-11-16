#!/usr/bin/env node

import Path from 'path';
import child_process from 'child_process';

const { spawnSync } = child_process;

const COMMAND_OPTIONS = {
  encoding: 'utf8',
};




function runCommand(command, args) {
  const { stdout, stderr, status, error } =
    spawnSync(command, args, COMMAND_OPTIONS);
  if (error) panic(`error for "${command} ${args.join(' ')}"\n`, error);
  if (status !== 0) panic(`status ${status} for "${command} ${args.join(' ')}"`);
  if (stderr) panic(`got stderr ${stderr} for "${command} ${args.join(' ')}"`);
  return stdout.replace(/\r/g, '');
}

function doCommand(cmd, env) {
  const { command, args, comment='', fakeJson=true, setEnv={},
	  envPreFns={}, envPostFns={}, }
    = cmd;
  let commentStr = comment.trim().replace(/^\s+\#/mg, '#');
  commentStr = envReplace(commentStr, env);
  let out = commentStr ? `${commentStr}\n` : '';
  if (!command) return out;
  const isNestArgs = args.length > 0 && Array.isArray(args[0]);
  setEnvFromFns(envPreFns, env);
  const args0 = ((isNestArgs) ? args.flat() : args).map(a => envReplace(a, env));
  let output = runCommand(command, args0); 
  //assumes arg does not contain a '; hence quote using '
  const qArgFn = arg => arg.match(/^[\w\-]+$/) ? arg : `'${arg}'`;
  const qArgs =
    (isNestArgs) ? args.map(args => args.map(qArgFn)) : args.map(qArgFn);
  const argLines =
    (isNestArgs) ? qArgs.map(a => a.join(' ')) : [ qArgs.join(' '), ];
  const argLineIndent = ' '.repeat(2 + command.length + 1);
  let cmdString = `$ ${command} ${argLines[0]}`
    + argLines.slice(1).map(s => ` \\\n${argLineIndent}${s}`).join('');
  cmdString = envReplace(cmdString, env);
  if (fakeJson) {
    cmdString = cmdString.replace('-D -', '-D /dev/stderr') + ` \\\n    | jq .`;
    const [ headers, body ] = output.split(/\n\n/, 2);
    const json = JSON.parse(body);
    setEnvFromJson(setEnv, json, env);
    setEnvFromFns(envPostFns, env);
    output = `${headers}\n\n${JSON.stringify(json, null, 2)}`;
  }
  out += `${cmdString}\n${output}\n`;
  return out;
}

const BEGIN_MSG = `
# This is a FAKE log, produced using the command:
#
#   ${process.argv.slice(1).map(p => p.replace(/^\/home\/\w+/, '~')).join(' ')} 
`.trim();
async function go(args) {
  if (args.length !== 1) {
    panic(`usage: ${Path.basename(process.argv[0])} CMDS_DATA_PATH`);
  }
  try {
    const commands = (await import(cwdPath(args[0]))).default;
    const env = {};
    console.log(BEGIN_MSG, '\n');
    for (const cmd of commands) {
      const out = doCommand(cmd, env);
      console.log(out);
    }
  }
  catch (err) {
    panic(err);
  }
}

go(process.argv.slice(2)).catch(err => console.log(err));

function envReplace(str, env) {
  for (const [k, v] of Object.entries(env)) {
    str = str.replace(new RegExp(`\\$\\[${k}\\]`, 'g'), v);
  }
  return str;
}
    
function getJson(json, jsonPath) {
  let json1 = json;
  for (const p of jsonPath.split('/')) {
    json1 = json1[p];
    if (json1 === undefined) panic(`undefined value for ${jsonPath} in`, json);
  }
  return json1;
}

function setEnvFromJson(setEnv, json, env) {
  for (const [key, jsonPath] of Object.entries(setEnv)) {
    env[key] = getJson(json, jsonPath);
  }
}

function setEnvFromFns(envFns, env) {
  for (const [key, fn] of Object.entries(envFns)) {
    env[key] = fn(env);
  }
}

function cwdPath(path) {
  return (path.startsWith(Path.sep)) ? path : Path.join(process.cwd(), path);
}

function panic(...args) {
  console.error(...args);
  process.exit(1);
}

