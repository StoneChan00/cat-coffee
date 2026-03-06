const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');

function saveSession(sessionId) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ sessionId }), 'utf8');
  } catch (err) {
    
  }
}

function loadSession() {
  try {
    const data = fs.readFileSync(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.sessionId;
  } catch (err) {
    return null;
  }
}

function clearSession() {
  try {
    fs.unlinkSync(SESSION_FILE);
  } catch (err) {
    
  }
}

async function invoke(cli, prompt, options = {}) {
  const { model, onData, onError, resume, sessionId, timeout = 300000, retries = 0 } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await invokeOnce(cli, prompt, { model, onData, onError, resume, sessionId, timeout });
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      if (onError) {
        onError(new Error(`Retry ${attempt + 1}/${retries}: ${err.message}`));
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

async function invokeOnce(cli, prompt, options = {}) {
  const { model, onData, onError, resume, sessionId, timeout = 300000 } = options;
  
  return new Promise((resolve, reject) => {
    const args = ['run', '--format', 'json'];
    
    if (resume) {
      const sid = sessionId || loadSession();
      if (sid) {
        args.push('--session', sid);
      }
    }
    
    if (model) {
      args.push('--model', model);
    }
    
    args.push(prompt);

    const proc = spawn(cli, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity
    });

    let fullText = '';
    let currentSessionId = null;
    let timeoutId = null;
    let isResolved = false;
    const signalHandlers = [];

    const setupSignalHandlers = () => {
      const signals = ['SIGTERM', 'SIGINT'];
      signals.forEach(signal => {
        const handler = () => {
          cleanup();
          process.exit(1);
        };
        process.on(signal, handler);
        signalHandlers.push({ signal, handler });
      });
    };

    const cleanup = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      signalHandlers.forEach(({ signal, handler }) => {
        process.off(signal, handler);
      });
      
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }
    };

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        cleanup();
        if (!isResolved) {
          reject(new Error(`Timeout after ${timeout}ms of inactivity`));
        }
      }, timeout);
    };

    setupSignalHandlers();
    resetTimeout();

    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line);
        
        if (data.sessionID && !currentSessionId) {
          currentSessionId = data.sessionID;
        }
        
        if (data.type === 'text' && data.part?.text) {
          const text = data.part.text;
          fullText += text;
          if (onData) {
            onData(text);
          }
        }
        
        if (data.type === 'step_finish' && data.sessionID) {
          saveSession(data.sessionID);
        }
        
        resetTimeout();
      } catch (err) {
        if (onError) {
          onError(new Error(`JSON parse error: ${err.message}\nLine: ${line}`));
        }
      }
    });

    proc.stdout.on('data', () => {
      resetTimeout();
    });

    proc.stderr.on('data', (data) => {
      resetTimeout();
      if (onError) {
        onError(data.toString());
      }
    });

    proc.on('exit', (code, signal) => {
      cleanup();
      if (!isResolved) {
        isResolved = true;
        if (code === 0) {
          resolve(fullText);
        } else {
          reject(new Error(
            `Process exited with code ${code}, signal: ${signal}\n` +
            `Command: ${cli} ${args.join(' ')}\n` +
            `Session: ${currentSessionId || 'N/A'}`
          ));
        }
      }
    });

    proc.on('error', (err) => {
      cleanup();
      if (!isResolved) {
        isResolved = true;
        reject(err);
      }
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const resumeIndex = args.indexOf('--resume');
  const resume = resumeIndex !== -1;
  
  let prompt, model;
  
  if (resume) {
    args.splice(resumeIndex, 1);
  }
  
  prompt = args[0] || '你好，请用一句话介绍自己';
  model = args[1];

  invoke('opencode.cmd', prompt, {
    model,
    resume,
    onData: (text) => process.stdout.write(text),
    onError: (err) => process.stderr.write(err.toString())
  }).then(() => {
    process.exit(0);
  }).catch((err) => {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  });
}

module.exports = { invoke, clearSession };
