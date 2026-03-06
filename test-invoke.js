const { invoke } = require('./minimal-claude.js');

async function testHuoshan() {
  console.log('--- 测试火山模型 ---');
  const result = await invoke('opencode.cmd', '用一句话介绍你自己', {
    model: 'huoshan-provider/ep-20260305155106-hn7k6',
    onData: (text) => process.stdout.write(text)
  });
  console.log('\n');
}

async function testBailian() {
  console.log('--- 测试百炼模型 ---');
  const result = await invoke('opencode.cmd', '用一句话介绍你自己', {
    model: 'bailian-coding-plan/glm-5',
    onData: (text) => process.stdout.write(text)
  });
  console.log('\n');
}

async function main() {
  await testHuoshan();
  await testBailian();
}

main();
