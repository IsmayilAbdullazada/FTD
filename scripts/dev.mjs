import { spawn } from 'node:child_process';

const processes = [
  spawn('npm', ['--prefix', 'app', 'run', 'dev'], { stdio: 'inherit', detached: true }),
  spawn('npm', ['run', 'dev:frontend'], { stdio: 'inherit', detached: true }),
];

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.pid || child.killed) continue;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of processes) child.on('exit', (code) => {
  if (!stopping) {
    stop();
    process.exitCode = code ?? 1;
  }
});
