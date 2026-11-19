import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';

// Local, unauthenticated STARTTLS relay; no message leaves the test process.
export async function createTestRelay() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-test-relay-'));
  const keyFile = path.join(directory, 'key.pem');
  const certFile = path.join(directory, 'cert.pem');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyFile,
      '-out',
      certFile,
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'ignore' },
  );
  const cert = await fs.readFile(certFile, 'utf8');
  const context = tls.createSecureContext({
    key: await fs.readFile(keyFile),
    cert,
  });
  const messages: string[] = [];
  const commands: string[] = [];
  const sockets = new Set<net.Socket>();
  function attach(socket: net.Socket, secure: boolean) {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buffer = '';
    let dataMode = false;
    let message = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (dataMode) {
          if (line === '.') {
            messages.push(message);
            message = '';
            dataMode = false;
            socket.write('250 Message accepted\r\n');
          } else message += line + '\r\n';
          continue;
        }
        const command = line.split(' ')[0].toUpperCase();
        commands.push(command);
        if (command === 'EHLO' || command === 'HELO')
          socket.write(
            secure ? '250 localhost\r\n' : '250-localhost\r\n250 STARTTLS\r\n',
          );
        else if (command === 'STARTTLS' && !secure) {
          socket.write('220 Start TLS\r\n');
          socket.removeAllListeners('data');
          const encrypted = new tls.TLSSocket(socket, {
            isServer: true,
            secureContext: context,
          });
          attach(encrypted, true);
          return;
        } else if (['MAIL', 'RCPT', 'RSET', 'NOOP'].includes(command))
          socket.write('250 OK\r\n');
        else if (command === 'DATA') {
          dataMode = true;
          socket.write('354 End with dot\r\n');
        } else if (command === 'QUIT') socket.end('221 Goodbye\r\n');
        else socket.write('502 Unsupported command\r\n');
      }
    });
  }
  const server = net.createServer((socket) => {
    attach(socket, false);
    socket.write('220 localhost test relay\r\n');
  });
  server.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  return {
    cert,
    messages,
    commands,
    port: (server.address() as AddressInfo).port,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await fs.rm(directory, { recursive: true, force: true });
    },
  };
}
