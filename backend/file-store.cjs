const fs = require('node:fs/promises');
const path = require('node:path');
const { createInitialState, validateState } = require('./booking.cjs');

function createFileStore(filePath) {
    let queue = Promise.resolve();
    let writeSequence = 0;

    async function readState() {
        const content = await fs.readFile(filePath, 'utf8');
        return validateState(JSON.parse(content));
    }

    async function saveState(state) {
        const temporaryPath = `${filePath}.${process.pid}.${++writeSequence}.tmp`;
        await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
        await fs.rename(temporaryPath, filePath);
    }

    async function initialize() {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        try {
            await readState();
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await saveState(createInitialState());
        }
    }

    function read() {
        return queue.then(readState).then(state => structuredClone(state));
    }

    function update(change) {
        const operation = queue.then(async () => {
            const state = await readState();
            const result = change(state);
            await saveState(state);
            return result === undefined ? undefined : structuredClone(result);
        });
        queue = operation.then(() => undefined, () => undefined);
        return operation;
    }

    return { initialize, read, update };
}

module.exports = { createFileStore };
