import { variableManager } from './variableManager';

export class SandboxManager {
    constructor() {
        this.worker = null;
        this.promiseQueue = {};
        this.workerIdCounter = 0;
        this.initWorker();
    }

    initWorker() {
        if (this.worker) {
            this.worker.terminate();
        }

        // We initialize the worker from the public URL since it's an external file
        this.worker = new Worker(new URL('./sandboxWorker.js', import.meta.url), { type: 'module' });

        this.worker.onmessage = (e) => {
            const { id, success, variables, error } = e.data;
            if (this.promiseQueue[id]) {
                const { resolve, reject, timeoutId } = this.promiseQueue[id];
                clearTimeout(timeoutId);

                if (success) {
                    resolve(variables);
                } else {
                    reject(new Error(error));
                }
                delete this.promiseQueue[id];
            }
        };

        this.worker.onerror = (e) => {
            console.error('[SandboxManager] Worker Error:', e);
            this.reset();
        };
    }

    reset() {
        console.warn('[SandboxManager] Resetting Web Worker due to error or timeout.');
        for (const id in this.promiseQueue) {
            clearTimeout(this.promiseQueue[id].timeoutId);
            this.promiseQueue[id].reject(new Error('Worker terminated automatically.'));
        }
        this.promiseQueue = {};
        this.initWorker();
    }

    /**
     * Run an untrusted JS script strictly.
     * @param {string} script 
     * @param {Object} variables 
     * @param {Array} chatHistory 
     * @param {string} currentMessage 
     * @param {number} timeoutMs 
     * @returns {Promise<Object>}
     */
    runScript(script, variables, chatHistory = [], currentMessage = '', timeoutMs = 800) {
        return new Promise((resolve, reject) => {
            if (!this.worker) this.initWorker();

            const id = ++this.workerIdCounter;

            const timeoutId = setTimeout(() => {
                if (this.promiseQueue[id]) {
                    this.promiseQueue[id].reject(new Error(`Script timeout after ${timeoutMs}ms.`));
                    delete this.promiseQueue[id];
                    this.reset(); // Abort the whole worker
                }
            }, timeoutMs);

            this.promiseQueue[id] = { resolve, reject, timeoutId };

            this.worker.postMessage({ id, script, variables, chatHistory, currentMessage });
        });
    }

    /**
     * Extracted helper specific to updating the Global Variable Manager.
     * Executes the script and then merges variables if successful.
     */
    async evaluateCardPreprocessing(scriptString, chatHistory = [], currentMessage = '') {
        if (!scriptString || !scriptString.trim()) return;

        // Current variable state
        const currentVars = variableManager.variables;

        try {
            console.log('[SandboxManager] Evaluating preprocess...');
            const newVars = await this.runScript(scriptString, currentVars, chatHistory, currentMessage);

            // Merge back the changed vars
            if (newVars && typeof newVars === 'object') {
                for (const [k, v] of Object.entries(newVars)) {
                    variableManager.setVar(k, v);
                }
                console.log('[SandboxManager] Variables updated successfully.');
            }
        } catch (e) {
            console.error('[SandboxManager] Preprocessing failed (Safe Exception):', e.message);
        }
    }
}

export const sandboxManager = new SandboxManager();
