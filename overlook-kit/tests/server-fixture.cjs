const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../../backend/server.cjs');

async function startTestServer() {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'overlook-test-'));
    const dataFile = path.join(directory, 'hotel.json');
    let server;
    try {
        server = await createServer({
            dataFile,
            frontendRoot: path.join(__dirname, '..')
        });
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', resolve);
        });
    } catch (error) {
        if (server && server.listening) await new Promise(resolve => server.close(resolve));
        await fs.rm(directory, { recursive: true, force: true });
        throw error;
    }

    const address = server.address();
    return {
        base: `http://127.0.0.1:${address.port}`,
        dataFile,
        async close() {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            await fs.rm(directory, { recursive: true, force: true });
        }
    };
}

module.exports = { startTestServer };
