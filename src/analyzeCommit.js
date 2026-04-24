const useMocks = process.env.USE_MOCKS === 'true';
module.exports = useMocks ? require('./mocks/mockClaude') : require('./real/realClaude');
