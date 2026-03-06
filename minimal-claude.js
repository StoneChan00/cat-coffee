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
    let lastActivity = Date.now();
    let timeoutId = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    };

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      lastActivity = Date.now();
      timeoutId = setTimeout(() => {
        cleanup();
        if (!isResolved) {
          reject(new Error(`Timeout after ${timeout}ms of inactivity`));
        }
      }, timeout);
    };

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
          onError(new Error(`JSON parse error: ${err.message}`));
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

    proc.on('exit', (code) => {
      cleanup();
      if (!isResolved) {
        isResolved = true;
        if (code === 0) {
          resolve(fullText);
        } else {
          reject(new Error(`Process exited with code ${code}`));
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
