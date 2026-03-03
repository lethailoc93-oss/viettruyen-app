import { get, set } from 'idb-keyval';

class VariableManager {
    constructor() {
        this.currentStoryId = null;
        this.variables = {}; // In-memory cache
        this.isLoaded = false;
    }

    /**
     * Load variables for a specific story from IndexedDB.
     * @param {string} storyId 
     */
    async loadStoryVariables(storyId) {
        if (!storyId) return;
        this.currentStoryId = storyId;
        try {
            const data = await get(`rp_vars_${storyId}`);
            this.variables = data || {};
            this.isLoaded = true;
        } catch (e) {
            console.error('Failed to load variables:', e);
            this.variables = {};
        }
    }

    /**
     * Save the current state of variables to IndexedDB.
     */
    async saveVariables() {
        if (!this.currentStoryId) return;
        try {
            await set(`rp_vars_${this.currentStoryId}`, this.variables);
        } catch (e) {
            console.error('Failed to save variables:', e);
        }
    }

    // ── Variable Operations ──

    getVar(key) {
        return this.variables[key] !== undefined ? this.variables[key] : '';
    }

    setVar(key, value) {
        if (!key) return;
        this.variables[key] = isNaN(value) ? value : Number(value);
        this.saveVariables(); // Fire and forget
    }

    initVar(key, value) {
        if (!key) return;
        if (this.variables[key] === undefined) {
            this.variables[key] = isNaN(value) ? value : Number(value);
            this.saveVariables();
        }
    }

    updateVarBase(key, value, operation) {
        if (!key) return;
        let current = Number(this.variables[key]) || 0;
        let val = Number(value) || 0;

        switch (operation) {
            case 'add': current += val; break;
            case 'sub': current -= val; break;
            case 'mul': current *= val; break;
            case 'div': current = val !== 0 ? current / val : current; break;
            case 'floor': current = Math.floor(current); break;
        }
        this.variables[key] = current;
        this.saveVariables();
    }

    addVar(key, value) { this.updateVarBase(key, value, 'add'); }
    subVar(key, value) { this.updateVarBase(key, value, 'sub'); }
    mulVar(key, value) { this.updateVarBase(key, value, 'mul'); }
    divVar(key, value) { this.updateVarBase(key, value, 'div'); }
    floorVar(key) { this.updateVarBase(key, 0, 'floor'); }

    /**
     * Execute commands from text tags (e.g. <Setvar:gold=100>) and REMOVE them from the text.
     * @param {string} text 
     * @returns {string} Text with execution tags removed
     */
    processExecutionTags(text) {
        if (!text || !this.isLoaded) return text;

        let result = text;
        const operations = [
            { regex: /<Setvar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.setVar(k.trim(), v.trim()) },
            { regex: /<initvar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.initVar(k.trim(), v.trim()) },
            { regex: /<AddVar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.addVar(k.trim(), v.trim()) },
            { regex: /<SubVar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.subVar(k.trim(), v.trim()) },
            { regex: /<MulVar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.mulVar(k.trim(), v.trim()) },
            { regex: /<DivVar:\s*([^=<>]+)\s*=\s*([^>]+)>/gi, fn: (k, v) => this.divVar(k.trim(), v.trim()) },
            { regex: /<FloorVar:\s*([^=<>]+)>/gi, fn: (k) => this.floorVar(k.trim()) }
        ];

        for (const op of operations) {
            result = result.replace(op.regex, (match, key, value) => {
                op.fn(key, value);
                return ''; // Remove the tag
            });
        }

        return result;
    }

    /**
     * Replace macros like {{getvar::key}} with actual values.
     * @param {string} text 
     * @returns {string}
     */
    replaceVariableMacros(text) {
        if (!text || !this.isLoaded) return text;

        // Matches {{getvar::key}} or <Getvar:key>
        let result = text
            .replace(/\{\{getvar::([^}]+)\}\}/gi, (_, key) => this.getVar(key.trim()))
            .replace(/<Getvar:\s*([^>]+)>/gi, (_, key) => this.getVar(key.trim()));

        // Simple IfVar Implementation: <IfVar:key=value>...<EndIfVar> or <IfVar:key>...</IfVar>
        // Note: Simple conditional logic. Nested ifs might not work well with basic regex.
        // For SillyTavern compatibility we handle <IfVar:key=value> content </IfVar> 
        // We will support a naive version here.
        result = result.replace(/<IfVar:\s*([^=]+?)(?:\s*=\s*([^>]+))?>([\s\S]*?)<\/IfVar>/gi, (match, key, value, content) => {
            const actualVal = this.getVar(key.trim());

            let conditionMet = false;
            if (value !== undefined) {
                // If it's a number comparison
                conditionMet = (String(actualVal) === String(value.trim()));
            } else {
                // Check if truthy (not 0, not empty, not false)
                conditionMet = !!actualVal && actualVal !== '0' && actualVal !== 'false';
            }

            return conditionMet ? content : '';
        });

        return result;
    }
}

export const variableManager = new VariableManager();
